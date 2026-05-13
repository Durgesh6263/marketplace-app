import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  // Webhooks are POST only
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!RAZORPAY_KEY_SECRET) {
      console.error("RAZORPAY_KEY_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify webhook signature
    const webhookSignature = req.headers.get("x-razorpay-signature");
    const rawBody = await req.text();

    if (!webhookSignature) {
      console.error("Missing x-razorpay-signature header");
      return new Response(
        JSON.stringify({ error: "Missing signature" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const expectedSignature = await hmacSha256(RAZORPAY_KEY_SECRET, rawBody);

    if (expectedSignature !== webhookSignature) {
      console.error("Invalid webhook signature");
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Signature valid — process the event
    const payload = JSON.parse(rawBody);
    const event = payload.event;

    console.log(`Razorpay webhook event: ${event}`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (event === "payment.captured") {
      const payment = payload.payload?.payment?.entity;
      if (!payment) {
        console.error("No payment entity in payload");
        return new Response(JSON.stringify({ status: "ignored" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const razorpayOrderId = payment.order_id;
      const razorpayPaymentId = payment.id;

      // Find the order by razorpay_order_id
      const { data: order, error: findError } = await supabaseAdmin
        .from("orders")
        .select("id, status, project_id")
        .eq("razorpay_order_id", razorpayOrderId)
        .single();

      if (findError || !order) {
        console.error("Order not found for razorpay_order_id:", razorpayOrderId);
        return new Response(JSON.stringify({ status: "order_not_found" }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // Only update if not already paid (idempotent)
      if (order.status !== "paid") {
        const { error: updateError } = await supabaseAdmin
          .from("orders")
          .update({
            razorpay_payment_id: razorpayPaymentId,
            status: "paid",
          })
          .eq("id", order.id);

        if (updateError) {
          console.error("Failed to update order:", updateError);
          return new Response(
            JSON.stringify({ error: "Failed to update order" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }

        console.log(`Order ${order.id} marked as paid via webhook`);

        // Fire off download email
        const { data: fullOrder } = await supabaseAdmin
          .from("orders")
          .select("*, projects(title, download_url)")
          .eq("id", order.id)
          .single();

        if (fullOrder) {
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

          fetch(`${supabaseUrl}/functions/v1/send-download-email`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              buyer_email: fullOrder.buyer_email,
              buyer_name: fullOrder.buyer_name,
              project_title: fullOrder.projects?.title || "Project",
              download_url: fullOrder.projects?.download_url || "",
              order_id: fullOrder.id,
            }),
          }).catch((err) => console.error("Failed to trigger download email:", err));
        }
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (event === "payment.failed") {
      const payment = payload.payload?.payment?.entity;
      if (payment?.order_id) {
        await supabaseAdmin
          .from("orders")
          .update({ status: "failed" })
          .eq("razorpay_order_id", payment.order_id)
          .neq("status", "paid"); // Don't overwrite a paid status

        console.log(`Order for razorpay_order_id ${payment.order_id} marked as failed`);
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // For unhandled events, just acknowledge
    console.log(`Unhandled webhook event: ${event}`);
    return new Response(JSON.stringify({ status: "ignored" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("razorpay-webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
