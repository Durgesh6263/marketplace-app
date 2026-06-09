import { useState, useEffect } from "react";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
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
  Coins,
  Search,
  Eye,
  CreditCard,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  ArrowUpDown,
  Building,
  TrendingUp,
  Award,
  Calendar,
} from "lucide-react";
import { motion } from "framer-motion";

interface SellerPayoutProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: "Active" | "Suspended";
  created_at?: any;
  totalProjects: number;
  totalUnitsSold: number;
  totalRevenue: number;
  sellerCommission: number;
  platformProfit: number;
  paidCommission: number;
  pendingPayout: number;
}

interface ProjectEarningRow {
  id: string;
  title: string;
  price: number;
  unitsSold: number;
  revenue: number;
  sellerShare: number;
  platformShare: number;
}

interface PayoutTransaction {
  id: string;
  amount: number;
  status: "paid" | "pending";
  payout_date: any;
  created_at: any;
}

const AdminPayouts = () => {
  const [sellers, setSellers] = useState<SellerPayoutProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [selectedSeller, setSelectedSeller] = useState<SellerPayoutProfile | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [projectEarnings, setProjectEarnings] = useState<ProjectEarningRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutTransaction[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Record payout form
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutStatus, setPayoutStatus] = useState<"paid" | "pending">("paid");
  const [submittingPayout, setSubmittingPayout] = useState(false);

  const { toast } = useToast();

  const fetchPayoutData = async () => {
    setLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, "user_roles"));
      const projectsSnap = await getDocs(collection(db, "projects"));
      const ordersSnap = await getDocs(collection(db, "orders"));
      const payoutsSnap = await getDocs(collection(db, "seller_payouts"));

      // 1. Identify all sellers
      const sellerProfiles: Record<string, Omit<SellerPayoutProfile, "totalProjects" | "totalUnitsSold" | "totalRevenue" | "sellerCommission" | "platformProfit" | "paidCommission" | "pendingPayout">> = {};
      usersSnap.forEach((doc) => {
        const data = doc.data();
        if (data.role === "seller") {
          sellerProfiles[doc.id] = {
            id: doc.id,
            name: data.name || data.email?.split("@")[0] || "Anonymous",
            email: data.email || "",
            phone: data.phone || "",
            status: data.status || "Active",
            created_at: data.created_at || null,
          };
        }
      });

      // 2. Count projects per seller
      const sellerProjectsCount: Record<string, number> = {};
      projectsSnap.forEach((doc) => {
        const data = doc.data();
        const sellerId = data.seller_id;
        if (sellerId && sellerProfiles[sellerId]) {
          sellerProjectsCount[sellerId] = (sellerProjectsCount[sellerId] || 0) + 1;
        }
      });

      // 3. Count paid orders, revenue, commissions per seller
      const sellerUnitsSold: Record<string, number> = {};
      const sellerRevenue: Record<string, number> = {};
      const sellerCommissionSum: Record<string, number> = {};
      const platformProfitSum: Record<string, number> = {};

      ordersSnap.forEach((doc) => {
        const data = doc.data();
        if (data.status === "paid" || data.status === "completed") {
          const sellerId = data.seller_id;
          if (sellerId && sellerProfiles[sellerId]) {
            const amount = data.amount || 0;
            const sellerShare = data.seller_earning !== undefined ? data.seller_earning : (amount * 0.4);
            const platformShare = data.platform_earning !== undefined ? data.platform_earning : (amount * 0.6);

            sellerUnitsSold[sellerId] = (sellerUnitsSold[sellerId] || 0) + 1;
            sellerRevenue[sellerId] = (sellerRevenue[sellerId] || 0) + amount;
            sellerCommissionSum[sellerId] = (sellerCommissionSum[sellerId] || 0) + sellerShare;
            platformProfitSum[sellerId] = (platformProfitSum[sellerId] || 0) + platformShare;
          }
        }
      });

      // 4. Sum paid payouts per seller
      const sellerPaidPayouts: Record<string, number> = {};
      payoutsSnap.forEach((doc) => {
        const data = doc.data();
        const sellerId = data.seller_id;
        if (sellerId && sellerProfiles[sellerId] && data.status === "paid") {
          sellerPaidPayouts[sellerId] = (sellerPaidPayouts[sellerId] || 0) + (data.amount || 0);
        }
      });

      // Assemble final profiles
      const assembledSellers: SellerPayoutProfile[] = Object.keys(sellerProfiles).map((id) => {
        const totalProjects = sellerProjectsCount[id] || 0;
        const totalUnitsSold = sellerUnitsSold[id] || 0;
        const totalRevenue = sellerRevenue[id] || 0;
        const sellerCommission = sellerCommissionSum[id] || 0;
        const platformProfit = platformProfitSum[id] || 0;
        const paidCommission = sellerPaidPayouts[id] || 0;
        const pendingPayout = Math.max(0, sellerCommission - paidCommission);

        return {
          ...sellerProfiles[id],
          totalProjects,
          totalUnitsSold,
          totalRevenue,
          sellerCommission,
          platformProfit,
          paidCommission,
          pendingPayout,
        };
      });

      setSellers(assembledSellers);
    } catch (err: any) {
      toast({
        title: "Error loading payouts",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutData();
  }, []);

  const loadSellerDetails = async (seller: SellerPayoutProfile) => {
    setLoadingDetails(true);
    setProjectEarnings([]);
    setPayouts([]);
    setPayoutAmount("");
    try {
      // 1. Fetch projects by seller
      const qProjects = query(collection(db, "projects"), where("seller_id", "==", seller.id));
      const projSnap = await getDocs(qProjects);

      // 2. Fetch paid orders of seller's projects
      const qOrders = query(
        collection(db, "orders"),
        where("seller_id", "==", seller.id),
        where("status", "==", "paid")
      );
      const ordersSnap = await getDocs(qOrders);

      // Count order breakdowns per project
      const projectSalesCount: Record<string, number> = {};
      const projectRevenue: Record<string, number> = {};
      const projectSellerShare: Record<string, number> = {};
      const projectPlatformShare: Record<string, number> = {};

      ordersSnap.forEach((doc) => {
        const data = doc.data();
        const projId = data.project_id;
        if (projId) {
          const amount = data.amount || 0;
          const sShare = data.seller_earning !== undefined ? data.seller_earning : (amount * 0.4);
          const pShare = data.platform_earning !== undefined ? data.platform_earning : (amount * 0.6);

          projectSalesCount[projId] = (projectSalesCount[projId] || 0) + 1;
          projectRevenue[projId] = (projectRevenue[projId] || 0) + amount;
          projectSellerShare[projId] = (projectSellerShare[projId] || 0) + sShare;
          projectPlatformShare[projId] = (projectPlatformShare[projId] || 0) + pShare;
        }
      });

      const earningsRows: ProjectEarningRow[] = projSnap.docs.map((doc) => {
        const data = doc.data();
        const projId = doc.id;
        const price = data.price || 0;
        const unitsSold = projectSalesCount[projId] || 0;
        const revenue = projectRevenue[projId] || 0;
        const sellerShare = projectSellerShare[projId] || 0;
        const platformShare = projectPlatformShare[projId] || 0;

        return {
          id: projId,
          title: data.title || "Untitled Project",
          price,
          unitsSold,
          revenue,
          sellerShare,
          platformShare,
        };
      });

      // 3. Fetch payout history
      const qPayouts = query(
        collection(db, "seller_payouts"),
        where("seller_id", "==", seller.id)
      );
      const payoutsSnap = await getDocs(qPayouts);
      const payoutTransactions: PayoutTransaction[] = payoutsSnap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            amount: data.amount || 0,
            status: data.status || "pending",
            payout_date: data.payout_date || null,
            created_at: data.created_at || null,
          };
        })
        .sort((a, b) => {
          const aTime = a.created_at?.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at || 0).getTime();
          const bTime = b.created_at?.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at || 0).getTime();
          return bTime - aTime;
        });

      setProjectEarnings(earningsRows);
      setPayouts(payoutTransactions);
    } catch (err: any) {
      toast({
        title: "Details load failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRowClick = (seller: SellerPayoutProfile) => {
    setSelectedSeller(seller);
    setDetailsOpen(true);
    loadSellerDetails(seller);
  };

  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeller) return;
    const amountNum = parseFloat(payoutAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payout amount.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingPayout(true);
    try {
      const now = Timestamp.now();
      const payoutData = {
        seller_id: selectedSeller.id,
        amount: amountNum,
        status: payoutStatus,
        payout_date: payoutStatus === "paid" ? now : null,
        created_at: now,
      };

      await addDoc(collection(db, "seller_payouts"), payoutData);
      toast({
        title: "Payout Recorded ✅",
        description: `Successfully added ${payoutStatus} payout of ₹${amountNum.toLocaleString()}.`,
      });

      // Refresh data
      await fetchPayoutData();
      // Recalculate selected seller values locally
      const updatedPaid = selectedSeller.paidCommission + (payoutStatus === "paid" ? amountNum : 0);
      const updatedPending = Math.max(0, selectedSeller.sellerCommission - updatedPaid);

      const updatedSelected = {
        ...selectedSeller,
        paidCommission: updatedPaid,
        pendingPayout: updatedPending,
      };

      setSelectedSeller(updatedSelected);
      loadSellerDetails(updatedSelected);
      setPayoutAmount("");
    } catch (err: any) {
      toast({
        title: "Record Payout Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSubmittingPayout(false);
    }
  };

  const handleTogglePayoutStatus = async (payoutId: string, currentStatus: "paid" | "pending") => {
    if (!selectedSeller) return;
    const newStatus = currentStatus === "paid" ? "pending" : "paid";
    try {
      const payoutRef = doc(db, "seller_payouts", payoutId);
      await updateDoc(payoutRef, {
        status: newStatus,
        payout_date: newStatus === "paid" ? Timestamp.now() : null,
      });

      toast({
        title: "Payout Updated 🔄",
        description: `Payout status marked as ${newStatus}.`,
      });

      await fetchPayoutData();
      // Refresh current seller details
      // Get updated profiles and find the current one
      const usersSnap = await getDocs(collection(db, "user_roles"));
      const ordersSnap = await getDocs(collection(db, "orders"));
      const payoutsSnap = await getDocs(collection(db, "seller_payouts"));

      // Fast local calculation updates
      let totalSalesAmount = 0;
      ordersSnap.forEach((doc) => {
        const data = doc.data();
        if ((data.status === "paid" || data.status === "completed") && data.seller_id === selectedSeller.id) {
          totalSalesAmount += (data.amount || 0);
        }
      });
      const sCommission = totalSalesAmount * 0.4;

      let paidCom = 0;
      payoutsSnap.forEach((doc) => {
        const data = doc.data();
        if (data.seller_id === selectedSeller.id && data.status === "paid") {
          paidCom += (data.amount || 0);
        }
      });

      const updatedSelected = {
        ...selectedSeller,
        paidCommission: paidCom,
        pendingPayout: Math.max(0, sCommission - paidCom),
      };

      setSelectedSeller(updatedSelected);
      loadSellerDetails(updatedSelected);
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleDeletePayout = async (payoutId: string, amount: number) => {
    if (!confirm(`Are you sure you want to delete this payout entry of ₹${amount.toLocaleString()}?`)) return;
    try {
      await deleteDoc(doc(db, "seller_payouts", payoutId));
      toast({
        title: "Payout Entry Deleted",
        description: "The payout record has been removed.",
      });

      await fetchPayoutData();
      if (selectedSeller) {
        // Fast recalculate
        const payoutsSnap = await getDocs(collection(db, "seller_payouts"));
        let paidCom = 0;
        payoutsSnap.forEach((doc) => {
          const data = doc.data();
          if (data.seller_id === selectedSeller.id && data.status === "paid") {
            paidCom += (data.amount || 0);
          }
        });
        const updatedSelected = {
          ...selectedSeller,
          paidCommission: paidCom,
          pendingPayout: Math.max(0, selectedSeller.sellerCommission - paidCom),
        };
        setSelectedSeller(updatedSelected);
        loadSellerDetails(updatedSelected);
      }
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateVal: any) => {
    if (!dateVal) return "N/A";
    const date = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Filter & Search
  const filteredSellers = sellers.filter((seller) => {
    const matchSearch =
      seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      seller.email.toLowerCase().includes(searchTerm.toLowerCase());

    const hasPending = seller.pendingPayout > 0;
    if (statusFilter === "pending") return matchSearch && hasPending;
    if (statusFilter === "paid") return matchSearch && !hasPending && seller.paidCommission > 0;
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Seller Payouts Directory</h1>
        <p className="text-sm text-muted-foreground font-body">
          Track merchant revenue allocations, platforms shares, and dispatch seller commissions.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by seller name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border font-body"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44 bg-card border-border font-body">
            <SelectValue placeholder="Payout Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payout Statuses</SelectItem>
            <SelectItem value="pending">Pending Payouts</SelectItem>
            <SelectItem value="paid">Fully Settled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Directory Table */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : filteredSellers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center font-body text-muted-foreground">
          No payouts matching the criteria found.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">
                    Seller
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body text-center">
                    Projects
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body text-center">
                    Units Sold
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body text-right">
                    Gross Revenue
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body text-right text-primary">
                    Seller Share (40%)
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body text-right">
                    Platform Share (60%)
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body text-right text-green-400">
                    Paid Share
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body text-right text-yellow-500">
                    Pending Share
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body text-center">
                    Status
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSellers.map((seller, idx) => {
                  const hasPending = seller.pendingPayout > 0;
                  const hasEarning = seller.totalRevenue > 0;

                  return (
                    <motion.tr
                      key={seller.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-border hover:bg-secondary/20 transition-colors font-body text-sm cursor-pointer"
                      onClick={() => handleRowClick(seller)}
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-foreground">{seller.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{seller.email}</p>
                      </td>
                      <td className="px-5 py-4 text-center text-foreground font-medium">
                        {seller.totalProjects}
                      </td>
                      <td className="px-5 py-4 text-center text-foreground font-medium">
                        {seller.totalUnitsSold}
                      </td>
                      <td className="px-5 py-4 text-right text-foreground font-semibold">
                        ₹{seller.totalRevenue.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right text-primary font-bold">
                        ₹{seller.sellerCommission.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right text-muted-foreground">
                        ₹{seller.platformProfit.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right text-green-400 font-semibold">
                        ₹{seller.paidCommission.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-right text-yellow-500 font-bold">
                        ₹{seller.pendingPayout.toLocaleString()}
                      </td>
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {!hasEarning ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-muted-foreground border border-border">
                            No Earnings
                          </span>
                        ) : hasPending ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                            Pending Payout
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                            Fully Settled
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRowClick(seller)}
                          className="text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Eye className="h-4 w-4 mr-1" /> View Details
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Seller Details Slide-In Overlay Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto border-border bg-card text-foreground font-body">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              Seller Revenue Analysis & Payout Controls
            </DialogTitle>
          </DialogHeader>

          {selectedSeller && (
            <div className="space-y-6 pt-4">
              {/* Seller Identity summary */}
              <div className="grid gap-4 md:grid-cols-4 rounded-xl border border-border bg-secondary/10 p-4 font-body text-xs">
                <div>
                  <p className="text-muted-foreground mb-0.5">Seller Name</p>
                  <p className="text-sm font-semibold text-foreground">{selectedSeller.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Email Address</p>
                  <p className="text-sm text-foreground truncate">{selectedSeller.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Join Date</p>
                  <p className="text-sm text-foreground">{formatDate(selectedSeller.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Status</p>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 mt-0.5 text-[10px] font-semibold ${
                      selectedSeller.status === "Active"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-destructive/10 text-destructive border border-destructive/20"
                    }`}
                  >
                    {selectedSeller.status}
                  </span>
                </div>
              </div>

              {/* Aggregated Statistics Cards */}
              <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
                {[
                  { label: "Total Uploaded", value: selectedSeller.totalProjects, icon: Building },
                  {
                    label: "Units Sold",
                    value: selectedSeller.totalUnitsSold,
                    icon: TrendingUp,
                  },
                  {
                    label: "Gross Revenue",
                    value: `₹${selectedSeller.totalRevenue.toLocaleString()}`,
                    icon: Award,
                  },
                  {
                    label: "Seller Earning",
                    value: `₹${selectedSeller.sellerCommission.toLocaleString()}`,
                    icon: Coins,
                    color: "text-primary bg-primary/10",
                  },
                  {
                    label: "Platform Share",
                    value: `₹${selectedSeller.platformProfit.toLocaleString()}`,
                    icon: Coins,
                    color: "text-muted-foreground",
                  },
                  {
                    label: "Paid Commission",
                    value: `₹${selectedSeller.paidCommission.toLocaleString()}`,
                    icon: CreditCard,
                    color: "text-green-400 bg-green-500/10",
                  },
                  {
                    label: "Pending Payout",
                    value: `₹${selectedSeller.pendingPayout.toLocaleString()}`,
                    icon: Clock,
                    color: "text-yellow-500 bg-yellow-500/10",
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border bg-card p-3 relative text-center flex flex-col justify-between"
                  >
                    <stat.icon
                      className={`h-4 w-4 mx-auto mb-1.5 ${
                        stat.color ? stat.color.split(" ")[0] : "text-muted-foreground"
                      }`}
                    />
                    <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
                    <p className="font-display font-bold text-sm mt-1 text-foreground">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Clock className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-12">
                  {/* Left block: Project-wise breakdown & payout history */}
                  <div className="lg:col-span-8 space-y-6">
                    {/* Project-wise Earnings table */}
                    <div className="rounded-xl border border-border overflow-hidden bg-card">
                      <div className="px-4 py-3 bg-secondary/15 border-b border-border flex justify-between items-center">
                        <h4 className="font-bold text-sm text-foreground">
                          Project-Wise Earnings
                        </h4>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-border bg-secondary/10 font-body text-muted-foreground uppercase">
                              <th className="px-4 py-2.5 font-medium">Project</th>
                              <th className="px-4 py-2.5 font-medium text-right">Price</th>
                              <th className="px-4 py-2.5 font-medium text-center">Units Sold</th>
                              <th className="px-4 py-2.5 font-medium text-right">Revenue</th>
                              <th className="px-4 py-2.5 font-medium text-right text-primary">
                                Seller Share (40%)
                              </th>
                              <th className="px-4 py-2.5 font-medium text-right">
                                Platform Share (60%)
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {projectEarnings.map((row) => (
                              <tr
                                key={row.id}
                                className="border-b border-border/50 hover:bg-secondary/25 transition-colors font-body"
                              >
                                <td className="px-4 py-3 font-semibold text-foreground">
                                  {row.title}
                                </td>
                                <td className="px-4 py-3 text-right text-muted-foreground font-medium">
                                  ₹{row.price.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-foreground">
                                  {row.unitsSold}
                                </td>
                                <td className="px-4 py-3 text-right text-foreground font-semibold">
                                  ₹{row.revenue.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right text-primary font-bold">
                                  ₹{row.sellerShare.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right text-muted-foreground">
                                  ₹{row.platformShare.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                            {projectEarnings.length === 0 && (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                  No uploaded projects found.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Payout Transactions List */}
                    <div className="rounded-xl border border-border overflow-hidden bg-card">
                      <div className="px-4 py-3 bg-secondary/15 border-b border-border flex justify-between items-center">
                        <h4 className="font-bold text-sm text-foreground">
                          Payout Transactions History
                        </h4>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-border bg-secondary/10 font-body text-muted-foreground uppercase">
                              <th className="px-4 py-2.5 font-medium">Payout ID</th>
                              <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                              <th className="px-4 py-2.5 font-medium text-center">Status</th>
                              <th className="px-4 py-2.5 font-medium">Payout Date</th>
                              <th className="px-4 py-2.5 font-medium text-center">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {payouts.map((transaction) => {
                              const isPaid = transaction.status === "paid";
                              return (
                                <tr
                                  key={transaction.id}
                                  className="border-b border-border/50 hover:bg-secondary/25 transition-colors font-body"
                                >
                                  <td className="px-4 py-3 text-muted-foreground font-mono">
                                    {transaction.id.substring(0, 10)}...
                                  </td>
                                  <td className="px-4 py-3 text-right text-foreground font-semibold text-sm">
                                    ₹{transaction.amount.toLocaleString()}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                                        isPaid
                                          ? "bg-primary/10 text-primary border border-primary/20"
                                          : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20"
                                      }`}
                                      onClick={() =>
                                        handleTogglePayoutStatus(
                                          transaction.id,
                                          transaction.status
                                        )
                                      }
                                      title="Click to toggle status"
                                    >
                                      {isPaid ? "Paid" : "Pending"}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-muted-foreground font-medium">
                                    {isPaid
                                      ? formatDate(transaction.payout_date)
                                      : "—"}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleDeletePayout(transaction.id, transaction.amount)
                                      }
                                      className="text-destructive hover:bg-destructive/10"
                                      title="Delete Payout"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                            {payouts.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                  No payouts recorded yet.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Right block: Record Payout Form */}
                  <div className="lg:col-span-4">
                    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                      <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-primary" />
                        Record Seller Payout
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Settle commissions manually by issuing a bank transfer and recording it
                        here.
                      </p>

                      <form onSubmit={handleRecordPayout} className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">
                            Payout Amount (INR)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                              ₹
                            </span>
                            <Input
                              type="number"
                              required
                              placeholder="e.g. 5000"
                              value={payoutAmount}
                              onChange={(e) => setPayoutAmount(e.target.value)}
                              className="pl-7 bg-secondary/10 border-border font-body"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-muted-foreground uppercase">
                            Payment Status
                          </label>
                          <Select
                            value={payoutStatus}
                            onValueChange={(val) => setPayoutStatus(val as any)}
                          >
                            <SelectTrigger className="bg-secondary/10 border-border font-body">
                              <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="paid">Paid (Fully Transferred)</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="submit"
                          disabled={submittingPayout}
                          className="w-full bg-primary hover:bg-primary-hover font-semibold mt-2"
                        >
                          {submittingPayout ? (
                            <Clock className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Plus className="h-4 w-4 mr-1" />
                          )}
                          Add Payout Record
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-border">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Close Analysis
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayouts;
