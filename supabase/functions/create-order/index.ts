import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/.*\.lovable\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const isAllowed = ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "https://lovable.app",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error("RAZORPAY credentials not configured");
      return new Response(
        JSON.stringify({ error: "Payment system not configured. Please contact support." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { project_id, buyer_email, buyer_name, buyer_phone } = await req.json();

    if (!project_id || !buyer_email) {
      return new Response(
        JSON.stringify({ error: "project_id and buyer_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 🔐 SECURITY: Fetch price from database — never trust frontend price
    const { data: project, error: projectError } = await supabaseAdmin
      .from("projects")
      .select("id, title, price")
      .eq("id", project_id)
      .eq("is_published", true)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found or not available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amount = project.price;

    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid project price" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Razorpay order using secure backend price
    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`)}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Razorpay expects paise
        currency: "INR",
        receipt: `receipt_${project_id.slice(0, 8)}_${Date.now()}`,
        notes: {
          project_id: project_id,
          project_title: project.title,
          buyer_email: buyer_email,
        },
      }),
    });

    if (!razorpayRes.ok) {
      const errBody = await razorpayRes.text();
      console.error("Razorpay create order failed:", errBody);
      return new Response(
        JSON.stringify({ error: "Payment gateway temporarily unavailable. Please try again." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const razorpayOrder = await razorpayRes.json();

    // Store order in database
    const { data: order, error: dbError } = await supabaseAdmin
      .from("orders")
      .insert({
        project_id,
        buyer_email,
        buyer_name: buyer_name || "",
        buyer_phone: buyer_phone || "",
        amount,
        razorpay_order_id: razorpayOrder.id,
        status: "created",
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({
        order_id: order.id,
        razorpay_order_id: razorpayOrder.id,
        razorpay_key_id: RAZORPAY_KEY_ID, // Publishable key — safe for frontend
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        project_title: project.title,
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("create-order error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to process order. Please try again or contact support." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
