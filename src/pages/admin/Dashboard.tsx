import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useDashboardStats,
  useDashboardRealtime,
  UnitSoldBreakdown,
} from "@/hooks/useDashboardStats";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Coins,
} from "lucide-react";
import { motion } from "framer-motion";
import AdminSellerRequests from "./SellerRequests";
import AdminProjects from "./AdminProjects";
import AdminContactSubmissions from "@/components/admin/ContactSubmissions";
import SiteSettingsControls from "@/components/admin/SiteSettingsControls";
import MonthlySalesChart from "@/components/admin/MonthlySalesChart";
import RecentOrdersTable from "@/components/admin/RecentOrdersTable";
import TopSellingProjects from "@/components/admin/TopSellingProjects";
import AdminUsers from "@/components/admin/AdminUsers";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminPayouts from "@/components/admin/AdminPayouts";


const sidebarLinks = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/admin" },
  { icon: FolderOpen, label: "Projects", to: "/admin/projects" },
  { icon: Inbox, label: "Seller Requests", to: "/admin/seller-requests" },
  { icon: ShoppingCart, label: "Orders", to: "/admin/orders" },
  { icon: Coins, label: "Seller Payouts", to: "/admin/payouts" },
  { icon: Users, label: "Users", to: "/admin/users" },
  { icon: Settings, label: "Settings", to: "/admin/settings" },
];

const AdminDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [unitsModalOpen, setUnitsModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: stats, isLoading } = useDashboardStats();

  useDashboardRealtime();
  const statCards = [
    {
      label: "Total Revenue",
      value: stats ? `₹${stats.totalRevenue.toLocaleString()}` : "—",
      change: "Gross earnings",
    },
    {
      label: "Platform Revenue",
      value: stats ? `₹${stats.platformRevenue.toLocaleString()}` : "—",
      change: "60% profit share",
    },
    {
      label: "Total Seller Commissions",
      value: stats ? `₹${stats.totalSellerCommissions.toLocaleString()}` : "—",
      change: "40% seller share",
    },
    {
      label: "Paid Commissions",
      value: stats ? `₹${stats.paidCommissions.toLocaleString()}` : "—",
      change: "Sum of paid payouts",
    },
    {
      label: "Pending Commissions",
      value: stats ? `₹${stats.pendingCommissions.toLocaleString()}` : "—",
      change: "Awaiting transfer",
    },
    {
      label: "Total Sellers",
      value: stats?.totalSellers ?? "—",
      change: "Registered merchants",
    },
    {
      label: "Active Sellers",
      value: stats?.activeSellers ?? "—",
      change: "With live sales/lists",
    },
    {
      label: "Total Users",
      value: stats?.totalUsers ?? "—",
      change: "All accounts",
    },
    {
      label: "Total Projects",
      value: stats?.totalProjects ?? "—",
      change: "Listed products",
    },
    {
      label: "Total Orders",
      value: stats?.totalOrders ?? "—",
      change: "Paid & pending",
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
      case "/admin/settings":
        return <SiteSettingsControls />;
      case "/admin/users":
        return <AdminUsers />;
      case "/admin/orders":
        return <AdminOrders />;
      case "/admin/payouts":
        return <AdminPayouts />;
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

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mb-8">
              {statCards.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`rounded-xl border border-border bg-card p-5 ${stat.onClick ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''}`}
                  onClick={stat.onClick}
                >
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="font-display text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                  <p className={`text-xs mt-1 ${stat.onClick ? 'text-primary underline decoration-primary/30 underline-offset-2' : 'text-primary'}`}>{stat.change}</p>
                </motion.div>
              ))}
            </div>

            <div className="mb-8">
              <MonthlySalesChart data={stats?.monthlySales || []} />
            </div>

            <div className="grid gap-8 lg:grid-cols-2 mb-8">
              <TopSellingProjects data={stats?.unitsSoldBreakdown || []} />
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

            <Dialog open={unitsModalOpen} onOpenChange={setUnitsModalOpen}>
              <DialogContent className="sm:max-w-md border-border bg-card">
                <DialogHeader>
                  <DialogTitle className="font-display text-xl text-foreground">Units Sold — Breakdown</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-2 text-left font-medium">PROJECT</th>
                        <th className="py-2 text-right font-medium">UNITS</th>
                        <th className="py-2 text-right font-medium">REVENUE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.unitsSoldBreakdown.map((item, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-3 text-foreground font-medium">{item.project_title}</td>
                          <td className="py-3 text-right text-muted-foreground">{item.units}</td>
                          <td className="py-3 text-right text-foreground font-semibold">₹{item.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                      {(!stats?.unitsSoldBreakdown || stats.unitsSoldBreakdown.length === 0) && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-muted-foreground">No units sold yet</td>
                        </tr>
                      )}
                    </tbody>
                    {stats?.unitsSoldBreakdown && stats.unitsSoldBreakdown.length > 0 && (
                      <tfoot>
                        <tr className="border-t border-border">
                          <td className="py-3 text-foreground font-bold">Total</td>
                          <td className="py-3 text-right text-foreground font-bold">{stats.totalPaidOrders}</td>
                          <td className="py-3 text-right text-primary font-bold">₹{stats.totalSalesAmount.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </DialogContent>
            </Dialog>
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
