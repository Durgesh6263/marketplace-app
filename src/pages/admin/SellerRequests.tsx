import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Trash2,
  RefreshCw,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  ChevronDown,
} from "lucide-react";
import { db } from "@/integrations/firebase/client";
import { collection, getDocs, updateDoc, deleteDoc, doc, orderBy, query, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

interface SellerRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  project_title: string;
  project_description: string;
  expected_price: string;
  tech_stack: string;
  status: string;
  created_at: any;
  updated_at: any;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  pending: { label: "Pending", icon: Clock, className: "bg-yellow-500/10 text-yellow-400" },
  approved: { label: "Approved", icon: CheckCircle, className: "bg-primary/10 text-primary" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-destructive/10 text-destructive" },
  contacted: { label: "Contacted", icon: MessageSquare, className: "bg-blue-500/10 text-blue-400" },
};

const AdminSellerRequests = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading: loading, refetch } = useQuery<SellerRequest[]>({
    queryKey: ["seller-requests"],
    queryFn: async () => {
      const q = query(collection(db, "seller_requests"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SellerRequest));
    },
  });

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await updateDoc(doc(db, "seller_requests", id), {
        status,
        updated_at: serverTimestamp()
      });
      queryClient.invalidateQueries({ queryKey: ["seller-requests"] });
      toast({ title: "Status Updated", description: `Request marked as ${status}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteRequest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    try {
      await deleteDoc(doc(db, "seller_requests", id));
      queryClient.invalidateQueries({ queryKey: ["seller-requests"] });
      toast({ title: "Deleted", description: "Seller request removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const formatDate = (dateVal: any) => {
    if (!dateVal) return "N/A";
    const date = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Seller Requests</h1>
          <p className="text-sm text-muted-foreground">
            {requests.length} total request{requests.length !== 1 && "s"}
          </p>
        </div>
        <Button variant="outline-glow" size="sm" onClick={() => refetch()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        {(["pending", "contacted", "approved", "rejected"] as const).map((status) => {
          const config = statusConfig[status];
          const count = requests.filter((r) => (r.status || "pending") === status).length;
          return (
            <div key={status} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <config.icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{config.label}</span>
              </div>
              <p className="font-display text-2xl font-bold text-foreground">{count}</p>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No seller requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req, index) => {
            const config = statusConfig[req.status || "pending"] || statusConfig.pending;
            const isExpanded = expandedId === req.id;
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-border bg-card overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="flex w-full items-center justify-between p-5 text-left hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-foreground truncate">
                        {req.project_title}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {req.name} · {req.email}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                      ₹{req.expected_price}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
                      <config.icon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>
                  <ChevronDown
                    className={`ml-3 h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border p-5 space-y-4">
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <a href={`mailto:${req.email}`} className="hover:text-primary transition-colors">
                              {req.email}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <a href={`tel:${req.phone}`} className="hover:text-primary transition-colors">
                              {req.phone}
                            </a>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            {formatDate(req.created_at)}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                            Tech Stack
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {req.tech_stack?.split(",").map((tech) => (
                              <span
                                key={tech.trim()}
                                className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                              >
                                {tech.trim()}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                            Description
                          </p>
                          <p className="text-sm text-foreground leading-relaxed">
                            {req.project_description}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                          {(["pending", "contacted", "approved", "rejected"] as const).map((status) => {
                            const sc = statusConfig[status];
                            const isActive = (req.status || "pending") === status;
                            return (
                              <Button
                                key={status}
                                variant={isActive ? "default" : "outline"}
                                size="sm"
                                disabled={isActive || updatingId === req.id}
                                onClick={() => updateStatus(req.id, status)}
                                className={isActive ? sc.className : ""}
                              >
                                <sc.icon className="mr-1 h-3 w-3" />
                                {sc.label}
                              </Button>
                            );
                          })}
                          <div className="flex-1" />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteRequest(req.id)}
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminSellerRequests;
