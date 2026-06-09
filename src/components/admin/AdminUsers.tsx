import { useState, useEffect } from "react";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Users, 
  Search, 
  Eye, 
  UserMinus, 
  UserCheck, 
  Trash2, 
  Store, 
  Loader2, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Award,
  TrendingUp,
  FolderOpen
} from "lucide-react";
import { motion } from "framer-motion";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "user" | "seller" | "admin";
  status: "Active" | "Suspended";
  created_at?: any;
  totalProjects?: number;
  totalPurchases?: number;
}

interface SellerStats {
  totalUploaded: number;
  approvedCount: number;
  pendingCount: number;
  rejectedCount: number;
  totalSales: number;
  totalEarnings: number;
  projects: any[];
}

const AdminUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [sellerStats, setSellerStats] = useState<SellerStats | null>(null);
  const [loadingSellerStats, setLoadingSellerStats] = useState(false);

  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "user_roles"));
      const projectsSnap = await getDocs(collection(db, "projects"));
      const ordersSnap = await getDocs(collection(db, "orders"));

      // Pre-calculate project counts per seller
      const sellerProjectsMap: Record<string, number> = {};
      projectsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.seller_id) {
          sellerProjectsMap[data.seller_id] = (sellerProjectsMap[data.seller_id] || 0) + 1;
        }
      });

      // Pre-calculate paid purchase counts per user email
      const buyerPurchasesMap: Record<string, number> = {};
      ordersSnap.forEach((doc) => {
        const data = doc.data();
        if ((data.status === "paid" || data.status === "completed") && data.buyer_email) {
          const email = data.buyer_email.toLowerCase();
          buyerPurchasesMap[email] = (buyerPurchasesMap[email] || 0) + 1;
        }
      });

      const items = snapshot.docs.map((d) => {
        const data = d.data();
        const role = data.role || "user";
        const email = data.email || "";
        const id = d.id;

        return {
          id,
          name: data.name || data.email?.split("@")[0] || "Anonymous",
          email,
          phone: data.phone || "",
          role,
          status: data.status || "Active",
          created_at: data.created_at || null,
          totalProjects: role === "seller" ? (sellerProjectsMap[id] || 0) : 0,
          totalPurchases: buyerPurchasesMap[email.toLowerCase()] || 0,
        } as UserProfile;
      });
      setUsers(items);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStatusChange = async (userId: string, currentStatus: "Active" | "Suspended") => {
    const newStatus = currentStatus === "Active" ? "Suspended" : "Active";
    try {
      await updateDoc(doc(db, "user_roles", userId), { status: newStatus });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)));
      toast({ 
        title: newStatus === "Suspended" ? "User Suspended 🚫" : "User Activated ✅", 
        description: `Account has been marked as ${newStatus.toLowerCase()}.` 
      });
    } catch (err: any) {
      toast({ title: "Status Change Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}'s profile document?`)) return;
    try {
      await deleteDoc(doc(db, "user_roles", userId));
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast({ title: "Deleted User Profile", description: "The database record was deleted." });
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  };

  // Click View Profile
  const handleViewProfile = async (user: UserProfile) => {
    setSelectedUser(user);
    setProfileDialogOpen(true);
    
    if (user.role === "seller") {
      setLoadingSellerStats(true);
      setSellerStats(null);
      try {
        // Fetch projects by this seller
        const qProjects = query(collection(db, "projects"), where("seller_id", "==", user.id));
        const projSnap = await getDocs(qProjects);
        
        const projects: any[] = [];
        let approvedCount = 0;
        let pendingCount = 0;
        let rejectedCount = 0;
        let totalSales = 0;
        let totalEarnings = 0;

        projSnap.forEach((d) => {
          const data = d.data();
          const projStatus = (data.status || "Draft").toLowerCase();
          const sales = data.total_sales || 0;
          const price = data.price || 0;
          
          if (projStatus === "approved") approvedCount++;
          else if (projStatus === "submitted" || projStatus === "under review") pendingCount++;
          else if (projStatus === "rejected") rejectedCount++;
          
          totalSales += sales;
          totalEarnings += (sales * price * 0.4); // Cumulative earnings 40%

          projects.push({
            id: d.id,
            title: data.title || "Untitled",
            status: data.status || "Draft",
            total_sales: sales,
            price: price,
            created_at: data.created_at || null
          });
        });

        // Try getting exact earnings from verified orders
        const qOrders = query(
          collection(db, "orders"), 
          where("seller_id", "==", user.id),
          where("status", "==", "paid")
        );
        const ordersSnap = await getDocs(qOrders);
        if (!ordersSnap.empty) {
          let orderEarnings = 0;
          ordersSnap.forEach((d) => {
            const data = d.data();
            orderEarnings += (data.seller_earning !== undefined ? data.seller_earning : ((data.amount || 0) * 0.4));
          });
          totalEarnings = orderEarnings;
        }

        setSellerStats({
          totalUploaded: projSnap.size,
          approvedCount,
          pendingCount,
          rejectedCount,
          totalSales,
          totalEarnings,
          projects
        });
      } catch (err) {
        console.error("Error loading seller details:", err);
      } finally {
        setLoadingSellerStats(false);
      }
    }
  };

  const formatDate = (dateVal: any) => {
    if (!dateVal) return "N/A";
    const date = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  // Filtering
  const filteredUsers = users.filter((u) => {
    const matchSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Users Directory</h1>
          <p className="text-sm text-muted-foreground font-body">Manage buyer roles, merchant sellers, and security status</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border font-body"
          />
        </div>

        <div className="flex gap-2">
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-36 bg-card border-border font-body">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">Buyer</SelectItem>
              <SelectItem value="seller">Seller</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 bg-card border-border font-body">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Directory Table */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center font-body text-muted-foreground">
          No users matching criteria found.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Name</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Email</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Role</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body text-center">Projects</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body text-center">Purchases</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Join Date</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((userProfile, idx) => {
                  const roleColors = {
                    admin: "bg-red-500/10 text-red-400 border border-red-500/20",
                    seller: "bg-primary/10 text-primary border border-primary/20",
                    user: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                  };
                  const statusColors = {
                    Active: "bg-primary/10 text-primary border border-primary/20",
                    Suspended: "bg-destructive/10 text-destructive border border-destructive/20"
                  };

                  return (
                    <motion.tr
                      key={userProfile.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-border hover:bg-secondary/20 transition-colors"
                    >
                      <td className="px-5 py-4 text-sm font-semibold text-foreground">
                        {userProfile.name}
                      </td>
                      <td className="px-5 py-4 text-sm text-muted-foreground font-body">
                        {userProfile.email}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium font-body ${roleColors[userProfile.role] || roleColors.user}`}>
                          {userProfile.role === "user" ? "Buyer" : userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center text-sm font-semibold text-foreground font-body">
                        {userProfile.role === "seller" ? userProfile.totalProjects : "—"}
                      </td>
                      <td className="px-5 py-4 text-center text-sm font-semibold text-foreground font-body">
                        {userProfile.totalPurchases || 0}
                      </td>
                      <td className="px-5 py-4 text-xs text-muted-foreground font-body font-body">
                        {formatDate(userProfile.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold font-body ${statusColors[userProfile.status] || statusColors.Active}`}>
                          {userProfile.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewProfile(userProfile)}
                            className="text-primary hover:text-primary hover:bg-primary/10"
                            title="View Profile Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatusChange(userProfile.id, userProfile.status)}
                            className={userProfile.status === "Active" ? "text-destructive hover:bg-destructive/10" : "text-primary hover:bg-primary/10"}
                            title={userProfile.status === "Active" ? "Suspend Account" : "Activate Account"}
                          >
                            {userProfile.status === "Active" ? <UserMinus className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(userProfile.id, userProfile.name)}
                            className="text-destructive hover:bg-destructive/10"
                            title="Delete User Record"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Profile Overlay Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-border bg-card text-foreground">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              {selectedUser?.role === "seller" ? <Store className="h-5 w-5 text-primary animate-pulse" /> : <Users className="h-5 w-5 text-muted-foreground" />}
              {selectedUser?.role === "seller" ? "Seller Information & Stats" : "User Profile Details"}
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-6 pt-4">
              {/* User Identity Details */}
              <div className="grid gap-4 md:grid-cols-2 rounded-xl border border-border bg-secondary/10 p-5 font-body">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Full Name</p>
                  <p className="text-sm font-semibold text-foreground">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Email Address</p>
                  <p className="text-sm text-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Mobile Phone</p>
                  <p className="text-sm text-foreground">{selectedUser.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Join Date</p>
                  <p className="text-sm text-foreground">{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Account Role</p>
                  <p className="text-sm font-semibold text-foreground capitalize">
                    {selectedUser.role === "user" ? "Buyer" : selectedUser.role}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Security Status</p>
                  <p className="text-sm font-semibold text-foreground">{selectedUser.status}</p>
                </div>
              </div>

              {/* Seller-Specific Aggregated Metrics */}
              {selectedUser.role === "seller" && (
                <div className="space-y-6">
                  <h3 className="text-base font-bold border-b border-border pb-2 text-primary font-display">Merchant Performance Summary</h3>
                  
                  {loadingSellerStats ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  ) : sellerStats ? (
                    <div className="space-y-6">
                      <div className="grid gap-4 grid-cols-2 md:grid-cols-6 font-body">
                        {[
                          { label: "Total Uploaded", value: sellerStats.totalUploaded, icon: FolderOpen },
                          { label: "Approved Projects", value: sellerStats.approvedCount, icon: CheckCircle, color: "text-primary bg-primary/10" },
                          { label: "Pending Review", value: sellerStats.pendingCount, icon: Clock, color: "text-blue-400 bg-blue-500/10" },
                          { label: "Rejected Projects", value: sellerStats.rejectedCount, icon: XCircle, color: "text-destructive bg-destructive/10" },
                          { label: "Total Sales Count", value: sellerStats.totalSales, icon: TrendingUp },
                          { label: "Total Earnings", value: `₹${sellerStats.totalEarnings.toLocaleString()}`, icon: Award, color: "text-primary bg-primary/10 border-primary/20" }
                        ].map((stat) => (
                          <div key={stat.label} className="rounded-lg border border-border bg-card p-3.5 relative text-center">
                            <stat.icon className={`h-4 w-4 mx-auto mb-2 ${stat.color ? stat.color.split(" ")[0] : "text-muted-foreground"}`} />
                            <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
                            <p className="font-display font-bold text-lg mt-1 text-foreground">{stat.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Projects Table of Seller */}
                      <div className="rounded-lg border border-border overflow-hidden bg-card">
                        <div className="p-4 bg-secondary/15 border-b border-border">
                          <h4 className="font-semibold text-sm text-foreground">Seller Uploaded Projects</h4>
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-border bg-secondary/10 font-body text-muted-foreground uppercase">
                                <th className="px-4 py-2 font-medium">Project Name</th>
                                <th className="px-4 py-2 font-medium">Status</th>
                                <th className="px-4 py-2 font-medium">Sales</th>
                                <th className="px-4 py-2 font-medium">Upload Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sellerStats.projects.map((proj) => {
                                const st = (proj.status || "Draft").toLowerCase();
                                const cnf = statusConfig[st] || statusConfig.draft;
                                
                                return (
                                  <tr key={proj.id} className="border-b border-border/60 hover:bg-secondary/25 transition-colors font-body">
                                    <td className="px-4 py-3 font-semibold text-foreground">{proj.title}</td>
                                    <td className="px-4 py-3">
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                        st === "approved" ? "bg-primary/10 text-primary border border-primary/20" :
                                        st === "submitted" || st === "under review" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                        st === "rejected" ? "bg-destructive/10 text-destructive border border-destructive/20" :
                                        "bg-muted text-muted-foreground"
                                      }`}>
                                        {proj.status}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-foreground">{proj.total_sales} sales</td>
                                    <td className="px-4 py-3 text-muted-foreground">{formatDate(proj.created_at)}</td>
                                  </tr>
                                );
                              })}
                              {sellerStats.projects.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="py-6 text-center text-muted-foreground">No projects uploaded yet.</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-6 text-center font-body">Could not retrieve stats for this seller account.</p>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>Close Profile</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  draft: { label: "Draft", icon: Clock, className: "bg-muted text-muted-foreground" },
  submitted: { label: "Submitted", icon: Clock, className: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  "under review": { label: "Under Review", icon: AlertTriangle, className: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
  approved: { label: "Approved", icon: CheckCircle, className: "bg-primary/10 text-primary border border-primary/20" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-destructive/10 text-destructive border border-destructive/20" },
};

export default AdminUsers;
