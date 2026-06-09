import { useState, useEffect } from "react";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface Order {
  id: string;
  project_id: string;
  project_title: string;
  buyer_email: string;
  buyer_name: string;
  buyer_phone: string;
  amount: number;
  status: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  created_at: any;
}

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "orders"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order));
      setOrders(items);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatDate = (dateVal: any) => {
    if (!dateVal) return "N/A";
    const date = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const filteredOrders = orders.filter(o => {
    const matchSearch = 
      o.project_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.buyer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.buyer_name.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Transaction Orders</h1>
          <p className="text-sm text-muted-foreground font-body">Monitor buyers payments and checkouts logs</p>
        </div>
        <Button variant="outline-glow" size="sm" onClick={fetchOrders} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by project title, buyer email, or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card border-border font-body"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-card border-border font-body">
            <SelectValue placeholder="Payment Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Transactions</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground font-body">
          No transactions found.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/20">
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Order ID</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Project</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Buyer Details</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Amount</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Payment Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="border-b border-border hover:bg-secondary/20 transition-colors font-body text-sm"
                  >
                    <td className="px-5 py-4 text-xs font-mono text-muted-foreground">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="px-5 py-4 font-semibold text-foreground">
                      {order.project_title}
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-foreground">{order.buyer_name}</p>
                        <p className="text-xs text-muted-foreground">{order.buyer_email}</p>
                        {order.buyer_phone && <p className="text-[10px] text-muted-foreground">{order.buyer_phone}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-foreground">
                      ₹{order.amount.toLocaleString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${
                        order.status === "paid"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      }`}>
                        {order.status === "paid" ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {formatDate(order.created_at)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
