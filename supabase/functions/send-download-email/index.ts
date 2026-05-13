import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    // ⚠️ RESEND API KEY — Get one at https://resend.com/api-keys
    // Set as Supabase secret: RESEND_API_KEY
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    const { buyer_email, buyer_name, project_title, download_url, order_id } =
      await req.json();

    if (!buyer_email || !project_title) {
      return new Response(
        JSON.stringify({ error: "buyer_email and project_title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no Resend key configured, log and return success (email not sent)
    if (!RESEND_API_KEY) {
      console.warn(
        "⚠️ RESEND_API_KEY not configured — skipping email send. " +
        `Would have sent download link to ${buyer_email} for "${project_title}".`
      );
      return new Response(
        JSON.stringify({
          success: true,
          email_sent: false,
          message: "Email service not configured — RESEND_API_KEY missing",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const displayName = buyer_name || "there";
    const downloadLink = download_url || "#";

    // ⚠️ IMPORTANT: Replace "noreply@yourdomain.com" with your verified Resend domain
    // Verify your domain at: https://resend.com/domains
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "The Last Minute Project <noreply@yourdomain.com>", // ⚠️ Replace with verified Resend domain
        to: [buyer_email],
        subject: `Your download is ready — ${project_title}`,
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0e14; color: #f0f0f0; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #16a34a, #22c55e); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #fff; font-size: 24px;">✅ Payment Successful!</h1>
            </div>
            <div style="padding: 32px;">
              <p style="font-size: 16px; line-height: 1.6;">Hi ${displayName},</p>
              <p style="font-size: 16px; line-height: 1.6;">
                Thank you for purchasing <strong>${project_title}</strong>! Your project is ready for download.
              </p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${downloadLink}" 
                   style="background: linear-gradient(135deg, #16a34a, #22c55e); color: #fff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                  📥 Download Project
                </a>
              </div>
              <p style="font-size: 13px; color: #888; text-align: center;">
                ⏰ This download link expires in 5 minutes for security.
              </p>
              <hr style="border: none; border-top: 1px solid #1e293b; margin: 24px 0;" />
              <p style="font-size: 13px; color: #666;">
                Order ID: ${order_id}<br/>
                If you have any issues, reply to this email for support.
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      console.error("Resend email failed:", errBody);
      return new Response(
        JSON.stringify({ success: false, error: "Email delivery failed. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailData = await emailRes.json();
    console.log("Download email sent successfully:", emailData);

    return new Response(
      JSON.stringify({ success: true, email_sent: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-download-email error:", error);
    return new Response(
      JSON.stringify({ error: "Unable to send email. Please contact support." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
