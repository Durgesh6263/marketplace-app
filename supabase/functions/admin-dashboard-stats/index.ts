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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Authentication required", status: 401 };
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return { error: "Invalid authentication", status: 401 };
  }

  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: data.user.id,
    _role: "admin",
  });

  if (!isAdmin) {
    return { error: "Admin access required", status: 403 };
  }

  return { user: data.user };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 🔐 SECURITY: Verify authenticated admin user
    const auth = await verifyAdmin(req);
    if ("error" in auth) {
      return new Response(
        JSON.stringify({ error: auth.error }),
        { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Total projects
    const { count: totalProjects } = await supabaseAdmin
      .from("projects")
      .select("*", { count: "exact", head: true });

    // Total paid sales amount
    const { data: salesData } = await supabaseAdmin
      .from("orders")
      .select("amount")
      .eq("status", "paid");

    const totalSalesAmount = (salesData || []).reduce(
      (sum, o) => sum + Number(o.amount),
      0
    );
    const totalPaidOrders = salesData?.length || 0;

    // Total downloads — sum from projects table (incremented by trigger on payment)
    const { data: downloadsData } = await supabaseAdmin
      .from("projects")
      .select("total_downloads");

    const totalDownloads = (downloadsData || []).reduce(
      (sum, p) => sum + (p.total_downloads || 0),
      0
    );

    // Active users — count distinct from auth.users via admin API
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1,
      page: 1,
    });
    const activeUsers = usersData?.total || 0;

    // Monthly sales data (last 12 months)
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const { data: monthlyOrders } = await supabaseAdmin
      .from("orders")
      .select("amount, created_at")
      .eq("status", "paid")
      .gte("created_at", twelveMonthsAgo.toISOString())
      .order("created_at", { ascending: true });

    // Aggregate by month
    const monthlyMap: Record<string, { sales: number; count: number }> = {};
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = { sales: 0, count: 0 };
    }

    for (const order of monthlyOrders || []) {
      const d = new Date(order.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyMap[key]) {
        monthlyMap[key].sales += Number(order.amount);
        monthlyMap[key].count += 1;
      }
    }

    const monthlySales = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      sales: data.sales,
      count: data.count,
    }));

    // Recent orders (exclude sensitive Razorpay fields from response)
    const { data: recentOrders } = await supabaseAdmin
      .from("orders")
      .select("id, project_id, buyer_email, buyer_name, buyer_phone, amount, status, created_at, projects(title)")
      .order("created_at", { ascending: false })
      .limit(10);

    return new Response(
      JSON.stringify({
        totalProjects: totalProjects || 0,
        totalSalesAmount,
        totalPaidOrders,
        totalDownloads,
        activeUsers,
        monthlySales,
        recentOrders: recentOrders || [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("admin-dashboard-stats error:", error);
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
