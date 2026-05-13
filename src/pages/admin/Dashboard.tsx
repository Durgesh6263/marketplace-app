import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useDashboardStats,
  useDashboardRealtime,
} from "@/hooks/useDashboardStats";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  ShoppingCart,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Inbox,
  Loader2,
  MessageSquare,
  Palette,
} from "lucide-react";
import { motion } from "framer-motion";
import AdminSellerRequests from "./SellerRequests";
import AdminProjects from "./AdminProjects";
import AdminContactSubmissions from "@/components/admin/ContactSubmissions";
import AdminBrandingControls from "@/components/admin/BrandingControls";
import MonthlySalesChart from "@/components/admin/MonthlySalesChart";
import RecentOrdersTable from "@/components/admin/RecentOrdersTable";

const sidebarLinks = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/admin" },
  { icon: FolderOpen, label: "Projects", to: "/admin/projects" },
  { icon: Inbox, label: "Seller Requests", to: "/admin/seller-requests" },
  { icon: MessageSquare, label: "Contact Submissions", to: "/admin/contact-submissions" },
  { icon: ShoppingCart, label: "Orders", to: "/admin/orders" },
  { icon: Palette, label: "Branding", to: "/admin/branding" },
  { icon: Users, label: "Users", to: "/admin/users" },
  { icon: Settings, label: "Settings", to: "/admin/settings" },
];

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  useDashboardRealtime();

  const statCards = [
    {
      label: "Total Projects",
      value: stats?.totalProjects ?? "—",
      change: "From database",
    },
    {
      label: "Total Sales",
      value: stats ? `₹${stats.totalSalesAmount.toLocaleString()}` : "—",
      change: stats ? `${stats.totalPaidOrders} paid order${stats.totalPaidOrders !== 1 ? "s" : ""}` : "",
    },
    {
      label: "Active Users",
      value: stats?.activeUsers ?? "—",
      change: "Registered accounts",
    },
    {
      label: "Downloads",
      value: stats?.totalDownloads ?? "—",
      change: "Successful payments",
    },
  ];

  const renderContent = () => {
    switch (location.pathname) {
      case "/admin/seller-requests":
        return <AdminSellerRequests />;
      case "/admin/projects":
        return <AdminProjects />;
      case "/admin/contact-submissions":
        return <AdminContactSubmissions />;
      case "/admin/branding":
        return <AdminBrandingControls />;
      default:
        return (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
                <p className="text-sm text-muted-foreground">Real-time stats from your database</p>
              </div>
              {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              {statCards.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border border-border bg-card p-5"
                >
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="font-display text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className="text-xs text-primary mt-1">{stat.change}</p>
                </motion.div>
              ))}
            </div>

            <div className="mb-8">
              <MonthlySalesChart data={stats?.monthlySales || []} />
            </div>

            <div className="mb-8">
              <RecentOrdersTable orders={stats?.recentOrders || []} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link to="/admin/projects" className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors">
                <FolderOpen className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-display font-semibold text-foreground">Manage Projects</h3>
                <p className="text-sm text-muted-foreground mt-1">Add, edit, or delete projects</p>
              </Link>
              <Link to="/admin/seller-requests" className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors">
                <Inbox className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-display font-semibold text-foreground">Seller Requests</h3>
                <p className="text-sm text-muted-foreground mt-1">Review commission submissions</p>
              </Link>
              <Link to="/admin/contact-submissions" className="rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors">
                <MessageSquare className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-display font-semibold text-foreground">Contact Submissions</h3>
                <p className="text-sm text-muted-foreground mt-1">View team collaboration requests</p>
              </Link>
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: sidebarOpen ? 256 : 72 }}
        className="fixed left-0 top-0 z-40 flex h-full flex-col border-r border-border bg-card"
      >
        <div className="flex h-16 items-center justify-between px-4">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-green flex-shrink-0" />
              <span className="font-display text-lg font-bold text-foreground whitespace-nowrap">Admin</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarLinks.map((link) => {
            const active = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <link.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="whitespace-nowrap">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border px-3 py-4">
          <div className="mb-2 px-3">
            {sidebarOpen && (
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            )}
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate("/admin/login");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main
        className="flex-1 transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? 256 : 72 }}
      >
        <div className="p-8">{renderContent()}</div>
      </main>
    </div>
  );
};

export default AdminDashboard;
