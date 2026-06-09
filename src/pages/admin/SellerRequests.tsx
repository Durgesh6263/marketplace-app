import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Eye,
  Check,
  X,
  Play,
  FileText,
  FileArchive,
  ExternalLink,
  Download,
  AlertTriangle,
  User,
  FolderOpen
} from "lucide-react";
import { db } from "@/integrations/firebase/client";
import {
  collection,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
  addDoc,
  orderBy,
  query,
  where,
  serverTimestamp
} from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

// Interface for Seller Onboarding Request (original collection)
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

// Interface for Uploaded Project
interface DBProject {
  id: string;
  title: string;
  short_description: string;
  description: string;
  price: number;
  category: string;
  project_level?: string;
  project_type?: string;
  features?: string[];
  tech_stack?: string[];
  demo_video_url?: string;
  thumbnail?: string;
  projectImages?: string[];
  source_code_zip?: string;
  project_report_pdf?: string;
  installation_guide_pdf?: string;
  download_url?: string;
  version?: string;
  seller_id?: string;
  seller_name?: string;
  status?: string;
  is_published: boolean;
  rejection_reason?: string;
  created_at: any;
  updated_at: any;
}

interface SellerDetails {
  name?: string;
  email?: string;
  phone?: string;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  draft: { label: "Draft", icon: Clock, className: "bg-muted text-muted-foreground border border-border" },
  submitted: { label: "Submitted", icon: Clock, className: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  "under review": { label: "Under Review", icon: AlertTriangle, className: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
  approved: { label: "Approved", icon: CheckCircle, className: "bg-primary/10 text-primary border border-primary/20" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-destructive/10 text-destructive border border-destructive/20" },
  suspended: { label: "Suspended", icon: AlertTriangle, className: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" },
  contacted: { label: "Contacted", icon: MessageSquare, className: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  pending: { label: "Pending", icon: Clock, className: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" },
};

// YouTube Video URL parser helper
const getYouTubeId = (url?: string) => {
  if (!url) return null;
  const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

const AdminSellerRequests = () => {
  const [activeTab, setActiveTab] = useState<"project_reviews" | "onboarding_requests">("project_reviews");
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);
  
  // Project verification modal states
  const [selectedProject, setSelectedProject] = useState<DBProject | null>(null);
  const [sellerDetails, setSellerDetails] = useState<SellerDetails | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  
  // Rejection dialog states
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [projectToReject, setProjectToReject] = useState<DBProject | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch Onboarding Requests
  const { data: onboardingRequests = [], isLoading: loadingOnboarding, refetch: refetchOnboarding } = useQuery<SellerRequest[]>({
    queryKey: ["seller-onboarding-requests"],
    queryFn: async () => {
      const q = query(collection(db, "seller_requests"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SellerRequest));
    },
  });

  // Fetch Projects awaiting review (Submitted, Under Review, or Rejected/Suspended)
  const { data: projects = [], isLoading: loadingProjects, refetch: refetchProjects } = useQuery<DBProject[]>({
    queryKey: ["admin-pending-projects"],
    queryFn: async () => {
      const q = query(collection(db, "projects"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      const allProjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DBProject));
      // Filter out Approved and Draft projects, show Submitted, Under Review, Rejected, Suspended
      return allProjects.filter(p => p.status === "Submitted" || p.status === "Under Review" || p.status === "Rejected" || p.status === "Suspended");
    },
  });

  // Action: Onboarding request contacted status update
  const updateOnboardingStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, "seller_requests", id), {
        status,
        updated_at: serverTimestamp()
      });
      queryClient.invalidateQueries({ queryKey: ["seller-onboarding-requests"] });
      toast({ title: "Status Updated", description: `Request marked as ${status}` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Action: Delete Onboarding request
  const deleteOnboardingRequest = async (id: string) => {
    if (!confirm("Are you sure you want to delete this onboarding request?")) return;
    try {
      await deleteDoc(doc(db, "seller_requests", id));
      queryClient.invalidateQueries({ queryKey: ["seller-onboarding-requests"] });
      toast({ title: "Deleted", description: "Request removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Action: Open Project Verification modal
  const handleViewProject = async (project: DBProject) => {
    setSelectedProject(project);
    setIsVerificationOpen(true);
    setSellerDetails(null);
    setLoadingSeller(true);

    // Fetch seller details from user_roles
    if (project.seller_id) {
      try {
        const docSnap = await getDoc(doc(db, "user_roles", project.seller_id));
        if (docSnap.exists()) {
          setSellerDetails(docSnap.data() as SellerDetails);
        }
      } catch (err) {
        console.error("Error fetching seller profile details:", err);
      } finally {
        setLoadingSeller(false);
      }
    } else {
      setLoadingSeller(false);
    }

    // Auto-transition Submitted -> Under Review
    if (project.status === "Submitted") {
      try {
        await updateDoc(doc(db, "projects", project.id), {
          status: "Under Review",
          updated_at: serverTimestamp()
        });
        queryClient.invalidateQueries({ queryKey: ["admin-pending-projects"] });
        // Update local modal state
        setSelectedProject(prev => prev ? { ...prev, status: "Under Review" } : null);
        toast({ title: "Project Under Review", description: "Status updated to Under Review" });
      } catch (err) {
        console.error("Error setting project status to Under Review:", err);
      }
    }
  };

  // Action: Approve Project
  const handleApproveProject = async (project: DBProject) => {
    try {
      await updateDoc(doc(db, "projects", project.id), {
        status: "Approved",
        is_published: true,
        rejection_reason: null, // clear out any old rejection reasons
        updated_at: serverTimestamp()
      });

      // Send Notification to Seller
      if (project.seller_id) {
        await addDoc(collection(db, "seller_notifications"), {
          seller_id: project.seller_id,
          title: "Project Approved! 🎉",
          message: `Congratulations! Your project "${project.title}" has been approved by the Admin and is now live in the marketplace.`,
          type: "approved",
          read: false,
          project_id: project.id,
          project_title: project.title,
          created_at: serverTimestamp()
        });
      }

      toast({ title: "Project Approved", description: `"${project.title}" is now visible to buyers.` });
      setIsVerificationOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-pending-projects"] });
    } catch (err: any) {
      toast({ title: "Approval Failed", description: err.message, variant: "destructive" });
    }
  };

  // Action: Open rejection Dialog
  const handleRejectClick = (project: DBProject) => {
    setProjectToReject(project);
    setRejectionReason("");
    setIsRejectOpen(true);
  };

  // Action: Confirm Rejection
  const handleConfirmRejection = async () => {
    if (!projectToReject) return;
    if (!rejectionReason.trim()) {
      toast({ title: "Rejection Reason Required", description: "Please enter a valid reason for rejecting.", variant: "destructive" });
      return;
    }

    try {
      await updateDoc(doc(db, "projects", projectToReject.id), {
        status: "Rejected",
        is_published: false,
        rejection_reason: rejectionReason.trim(),
        updated_at: serverTimestamp()
      });

      // Send Notification to Seller
      if (projectToReject.seller_id) {
        await addDoc(collection(db, "seller_notifications"), {
          seller_id: projectToReject.seller_id,
          title: "Project Rejected ❌",
          message: `Your project "${projectToReject.title}" was rejected by the Admin. Reason: ${rejectionReason.trim()}`,
          type: "rejected",
          read: false,
          project_id: projectToReject.id,
          project_title: projectToReject.title,
          created_at: serverTimestamp()
        });
      }

      toast({ title: "Project Rejected", description: `Project status set to Rejected.` });
      setIsRejectOpen(false);
      setIsVerificationOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-pending-projects"] });
    } catch (err: any) {
      toast({ title: "Rejection Failed", description: err.message, variant: "destructive" });
    }
  };

  // Formatter utilities
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Seller Requests</h1>
          <p className="text-sm text-muted-foreground font-body">
            Review uploaded projects and seller onboarding contact requests.
          </p>
        </div>
        <Button
          variant="outline-glow"
          size="sm"
          onClick={() => {
            refetchOnboarding();
            refetchProjects();
          }}
          disabled={loadingOnboarding || loadingProjects}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${(loadingOnboarding || loadingProjects) ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs Layout */}
      <div className="flex gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("project_reviews")}
          className={`pb-2 px-4 text-sm font-semibold transition-colors border-b-2 -mb-2.5 ${
            activeTab === "project_reviews"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Project Review Requests ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab("onboarding_requests")}
          className={`pb-2 px-4 text-sm font-semibold transition-colors border-b-2 -mb-2.5 ${
            activeTab === "onboarding_requests"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Seller Onboarding Requests ({onboardingRequests.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "project_reviews" ? (
        // ----------------- TAB 1: PROJECT REVIEWS -----------------
        loadingProjects ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground font-body">No projects waiting for approval.</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Project Name</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Seller Name</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Category</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Price</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Submission Date</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project, idx) => {
                    const statusKey = (project.status || "submitted").toLowerCase();
                    const config = statusConfig[statusKey] || statusConfig.submitted;

                    return (
                      <motion.tr
                        key={project.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b border-border hover:bg-secondary/20 transition-colors"
                      >
                        <td className="px-5 py-4 font-semibold text-foreground">
                          {project.title}
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground font-body">
                          {project.seller_name || "Unknown Seller"}
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground font-body">
                          {project.category}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-foreground">
                          ₹{project.price.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-sm text-muted-foreground font-body">
                          {formatDate(project.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
                            <config.icon className="h-3 w-3" />
                            {config.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline-glow"
                              size="xs"
                              onClick={() => handleViewProject(project)}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View Project
                            </Button>
                            <Button
                              variant="hero"
                              size="xs"
                              onClick={() => handleApproveProject(project)}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="xs"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleRejectClick(project)}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reject
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
        )
      ) : (
        // ----------------- TAB 2: SELLER ONBOARDING REQUESTS -----------------
        loadingOnboarding ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : onboardingRequests.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground font-body">No seller onboarding requests yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {onboardingRequests.map((req, index) => {
              const config = statusConfig[req.status || "pending"] || statusConfig.pending;
              const isExpanded = expandedReqId === req.id;
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedReqId(isExpanded ? null : req.id)}
                    className="flex w-full items-center justify-between p-5 text-left hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-semibold text-foreground truncate">
                          {req.project_title}
                        </p>
                        <p className="text-sm text-muted-foreground truncate font-body">
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
                              <a href={`mailto:${req.email}`} className="hover:text-primary transition-colors font-body">
                                {req.email}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                              <Phone className="h-4 w-4" />
                              <a href={`tel:${req.phone}`} className="hover:text-primary transition-colors">
                                {req.phone}
                              </a>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                              <Clock className="h-4 w-4" />
                              {formatDate(req.created_at)}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 font-body">
                              Tech Stack
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {req.tech_stack?.split(",").map((tech) => (
                                <span
                                  key={tech.trim()}
                                  className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground font-body"
                                >
                                  {tech.trim()}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 font-body">
                              Description
                            </p>
                            <p className="text-sm text-foreground leading-relaxed font-body">
                              {req.project_description}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                            {(["pending", "contacted", "approved", "rejected"] as const).map((status) => {
                              const sc = statusConfig[status] || statusConfig.pending;
                              const isActive = (req.status || "pending") === status;
                              return (
                                <Button
                                  key={status}
                                  variant={isActive ? "default" : "outline"}
                                  size="sm"
                                  disabled={isActive}
                                  onClick={() => updateOnboardingStatus(req.id, status)}
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
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => deleteOnboardingRequest(req.id)}
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
        )
      )}

      {/* Project Verification Dialog Modal */}
      <Dialog open={isVerificationOpen} onOpenChange={setIsVerificationOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-foreground flex items-center justify-between pr-4">
              <span>Project Review & Verification</span>
              {selectedProject && (
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold font-body ${
                  statusConfig[selectedProject.status?.toLowerCase() || "submitted"]?.className
                }`}>
                  {selectedProject.status || "Submitted"}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="font-body">
              Carefully verify all uploads, source files, and video demo before approving this project.
            </DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-6 pt-4">
              {/* Rejection Alert if already rejected */}
              {selectedProject.status === "Rejected" && selectedProject.rejection_reason && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl flex gap-3 text-sm">
                  <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Previously Rejected</p>
                    <p className="font-body mt-1">Reason: "{selectedProject.rejection_reason}"</p>
                  </div>
                </div>
              )}

              {/* SELLER DETAILS */}
              <div className="space-y-3 rounded-xl border border-border p-4 bg-secondary/10">
                <h3 className="font-display font-semibold text-foreground flex items-center gap-1.5 text-sm uppercase tracking-wider text-primary">
                  <User className="h-4 w-4" /> Seller Details
                </h3>
                {loadingSeller ? (
                  <p className="text-xs text-muted-foreground animate-pulse font-body">Loading profile...</p>
                ) : sellerDetails ? (
                  <div className="grid gap-4 sm:grid-cols-3 text-sm font-body">
                    <div>
                      <p className="text-xs text-muted-foreground">Name</p>
                      <p className="font-medium text-foreground">{sellerDetails.name || selectedProject.seller_name || "Seller"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a href={`mailto:${sellerDetails.email}`} className="font-medium text-foreground hover:text-primary transition-colors underline decoration-dotted">
                        {sellerDetails.email || "N/A"}
                      </a>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Phone Number</p>
                      <a href={`tel:${sellerDetails.phone}`} className="font-medium text-foreground hover:text-primary transition-colors underline decoration-dotted">
                        {sellerDetails.phone || "N/A"}
                      </a>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground font-body">Seller profile document not found. (Seller ID: {selectedProject.seller_id || "N/A"})</p>
                )}
              </div>

              {/* PROJECT DETAILS */}
              <div className="space-y-4">
                <h3 className="font-display font-semibold text-foreground flex items-center gap-1.5 text-sm uppercase tracking-wider text-primary">
                  <FolderOpen className="h-4 w-4" /> Project Details
                </h3>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border border-border bg-card p-3 font-body">
                    <p className="text-xs text-muted-foreground">Title</p>
                    <p className="font-semibold text-foreground">{selectedProject.title}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3 font-body">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-semibold text-foreground">{selectedProject.category}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3 font-body">
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-semibold text-primary">₹{selectedProject.price.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 font-body">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Level</p>
                    <p className="font-semibold text-foreground">{selectedProject.project_level || "Beginner"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-semibold text-foreground">{selectedProject.project_type || "Mini Project"}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Version</p>
                    <p className="font-semibold text-foreground">{selectedProject.version || "v1.0"}</p>
                  </div>
                </div>

                <div className="space-y-2 font-body">
                  <Label className="text-xs text-muted-foreground">Short Description</Label>
                  <p className="text-sm font-medium text-foreground rounded-lg border border-border p-3 bg-secondary/5">{selectedProject.short_description}</p>
                </div>

                <div className="space-y-2 font-body">
                  <Label className="text-xs text-muted-foreground">Full Description</Label>
                  <p className="text-sm text-foreground whitespace-pre-wrap rounded-lg border border-border p-3 bg-secondary/5 leading-relaxed">{selectedProject.description}</p>
                </div>

                {/* Features & Tech Stack */}
                <div className="grid gap-4 sm:grid-cols-2 font-body">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Features List</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProject.features && selectedProject.features.length > 0 ? (
                        selectedProject.features.map(feat => (
                          <span key={feat} className="rounded-md bg-secondary border border-border/50 px-2 py-0.5 text-xs text-secondary-foreground font-medium">
                            {feat}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None listed</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Tech Stack</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedProject.tech_stack && selectedProject.tech_stack.length > 0 ? (
                        selectedProject.tech_stack.map(tech => (
                          <span key={tech} className="rounded-md bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs text-primary font-medium">
                            {tech}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">None listed</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* FILES */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-display font-semibold text-foreground text-sm uppercase tracking-wider text-primary">
                  Attached Project Files
                </h3>

                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 font-body">
                  {/* Source Code ZIP */}
                  <div className="rounded-xl border border-border p-4 bg-card flex flex-col justify-between">
                    <div className="flex items-start gap-3">
                      <FileArchive className="h-8 w-8 text-yellow-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Source Code ZIP</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Zip folder of coding files</p>
                      </div>
                    </div>
                    {selectedProject.source_code_zip ? (
                      <a
                        href={selectedProject.source_code_zip}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" /> Download ZIP
                      </a>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground italic text-center py-1">Not uploaded</p>
                    )}
                  </div>

                  {/* Project Report PDF */}
                  <div className="rounded-xl border border-border p-4 bg-card flex flex-col justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Project Report PDF</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Academic/Tech Project Report</p>
                      </div>
                    </div>
                    {selectedProject.project_report_pdf ? (
                      <a
                        href={selectedProject.project_report_pdf}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open Report
                      </a>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground italic text-center py-1">Not uploaded</p>
                    )}
                  </div>

                  {/* Installation Guide PDF */}
                  <div className="rounded-xl border border-border p-4 bg-card flex flex-col justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Installation Guide</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Setup Instruction Manual PDF</p>
                      </div>
                    </div>
                    {selectedProject.installation_guide_pdf ? (
                      <a
                        href={selectedProject.installation_guide_pdf}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Open Guide
                      </a>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground italic text-center py-1">Not uploaded</p>
                    )}
                  </div>

                  {/* Google Drive Link */}
                  <div className="rounded-xl border border-border p-4 bg-card flex flex-col justify-between sm:col-span-2 md:col-span-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ExternalLink className="h-6 w-6 text-green-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">Backup Google Drive Link</p>
                          <p className="text-xs text-muted-foreground font-body">{selectedProject.download_url || "No Google Drive download link attached"}</p>
                        </div>
                      </div>
                      {selectedProject.download_url && (
                        <a
                          href={selectedProject.download_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors font-body"
                        >
                          Visit Link <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Screenshots Gallery */}
                {selectedProject.projectImages && selectedProject.projectImages.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-xs text-muted-foreground font-body">Project Screenshots ({selectedProject.projectImages.length})</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {selectedProject.projectImages.map((src, idx) => (
                        <a key={idx} href={src} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-lg border border-border">
                          <img
                            src={src}
                            alt={`Project Screenshot ${idx + 1}`}
                            className="h-24 w-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <ExternalLink className="h-5 w-5 text-white" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* DEMO VIDEO */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-display font-semibold text-foreground text-sm uppercase tracking-wider text-primary">
                  Demo Video
                </h3>
                {selectedProject.demo_video_url ? (
                  <div className="space-y-3 font-body">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-secondary/10 p-3 rounded-lg border border-border">
                      <p className="text-xs text-muted-foreground break-all">{selectedProject.demo_video_url}</p>
                      <a
                        href={selectedProject.demo_video_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95 transition-opacity"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" /> Open Demo Video
                      </a>
                    </div>

                    {/* YouTube Embed Player */}
                    {getYouTubeId(selectedProject.demo_video_url) && (
                      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border">
                        <iframe
                          className="h-full w-full"
                          src={`https://www.youtube.com/embed/${getYouTubeId(selectedProject.demo_video_url)}`}
                          title="Project Demo video player"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic font-body">No demo video URL provided.</p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 justify-end pt-6 border-t border-border font-body">
                <Button
                  variant="outline"
                  onClick={() => setIsVerificationOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => handleRejectClick(selectedProject)}
                >
                  <X className="h-4 w-4 mr-2" /> Reject Project
                </Button>
                <Button
                  variant="hero"
                  onClick={() => handleApproveProject(selectedProject)}
                >
                  <Check className="h-4 w-4 mr-2" /> Approve & Publish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Reason Dialog Modal */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="max-w-md border-border bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-foreground">Reject Project Submission</DialogTitle>
            <DialogDescription className="font-body">
              Please state the reason for rejecting. This feedback will be sent directly to the seller so they can rectify the project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4 font-body">
            <div className="space-y-2">
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                placeholder="e.g. Please upload installation guide PDF and double check source code ZIP integrity."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmRejection}
                disabled={!rejectionReason.trim()}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSellerRequests;
