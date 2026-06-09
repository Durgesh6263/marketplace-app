import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSellerStats, useSellerRealtime, SellerProject, SellerSale } from "@/hooks/useSellerStats";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  LayoutDashboard,
  FolderOpen,
  ShoppingCart,
  Bell,
  LogOut,
  ChevronLeft,
  Menu,
  Plus,
  Pencil,
  Trash2,
  Upload,
  Play,
  FileText,
  FileArchive,
  ArrowRight,
  TrendingUp,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useToast } from "@/hooks/use-toast";
import { db, storage } from "@/integrations/firebase/client";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

// YouTube Video URL parser and validator
const getYouTubeId = (url?: string) => {
  if (!url) return null;
  const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};

const categories = [
  "Web Development",
  "Mobile App",
  "AI/ML",
  "Cyber Security",
  "Cloud Computing",
  "Java",
  "Python",
  "Final Year Project",
];

const projectLevels = ["Beginner", "Intermediate", "Advanced"];
const projectTypes = ["Mini Project", "Major Project", "Final Year Project"];

const statusConfig: Record<string, { label: string; icon: any; className: string }> = {
  draft: { label: "Draft", icon: Clock, className: "bg-muted text-muted-foreground" },
  submitted: { label: "Submitted", icon: ArrowRight, className: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  "under review": { label: "Under Review", icon: AlertTriangle, className: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
  approved: { label: "Approved", icon: CheckCircle, className: "bg-primary/10 text-primary border border-primary/20" },
  rejected: { label: "Rejected", icon: XCircle, className: "bg-destructive/10 text-destructive border border-destructive/20" },
  suspended: { label: "Suspended", icon: AlertTriangle, className: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" },
};

const SellerDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "upload" | "sales" | "notifications">("overview");
  const [editingProject, setEditingProject] = useState<SellerProject | null>(null);
  
  const { user, signOut } = useAuth();
  const { data: stats, isLoading, refetch } = useSellerStats(user?.uid || "");
  useSellerRealtime(user?.uid || "");

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Sync view with subpath if needed or keep state-based
    const path = window.location.pathname;
    if (path.includes("/seller/projects")) setActiveTab("projects");
    else if (path.includes("/seller/upload")) setActiveTab("upload");
    else if (path.includes("/seller/sales")) setActiveTab("sales");
    else if (path.includes("/seller/notifications")) setActiveTab("notifications");
    else setActiveTab("overview");
  }, []);

  const changeTab = (tab: "overview" | "projects" | "upload" | "sales" | "notifications") => {
    setActiveTab(tab);
    setEditingProject(null);
    if (tab === "overview") navigate("/seller");
    else navigate(`/seller/${tab}`);
  };

  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  const fetchNotifications = async () => {
    if (!user?.uid) return;
    try {
      const q = query(
        collection(db, "seller_notifications"),
        where("seller_id", "==", user.uid),
        orderBy("created_at", "desc")
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setNotifications(items);
      setUnreadNotifsCount(items.filter((n: any) => !n.read).length);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.uid, activeTab]);

  const markAllNotifsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      const promises = unread.map(n => updateDoc(doc(db, "seller_notifications", n.id), { read: true }));
      await Promise.all(promises);
      fetchNotifications();
      toast({ title: "Updated", description: "All notifications marked as read." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const toggleNotifRead = async (id: string, currentReadState: boolean) => {
    try {
      await updateDoc(doc(db, "seller_notifications", id), { read: !currentReadState });
      fetchNotifications();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const deleteNotif = async (id: string) => {
    try {
      await deleteDoc(doc(db, "seller_notifications", id));
      fetchNotifications();
      toast({ title: "Deleted", description: "Notification removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  // Projects list state
  const [sellerProjects, setSellerProjects] = useState<SellerProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const fetchSellerProjects = async () => {
    if (!user?.uid) return;
    setLoadingProjects(true);
    try {
      const q = query(
        collection(db, "projects"),
        where("seller_id", "==", user.uid),
        orderBy("created_at", "desc")
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as SellerProject));
      setSellerProjects(items);
    } catch (err) {
      console.error("Error fetching projects:", err);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    fetchSellerProjects();
  }, [user?.uid, activeTab]);

  // Project upload/edit form state
  const defaultForm = {
    title: "",
    short_description: "",
    description: "",
    price: "",
    category: "Web Development",
    project_level: "Beginner",
    project_type: "Mini Project",
    features: "",
    tech_stack: "",
    demo_video_url: "",
    thumbnail: "",
    projectImages: [] as string[],
    source_code_zip: "",
    project_report_pdf: "",
    installation_guide_pdf: "",
    download_url: "",
    version: "v1.0",
    seller_declaration: false,
    status: "Draft",
    is_published: false
  };

  const [form, setForm] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [submittingProject, setSubmittingProject] = useState(false);

  const handleEditClick = (project: SellerProject) => {
    setEditingProject(project);
    setForm({
      title: project.title || "",
      short_description: project.short_description || "",
      description: project.description || "",
      price: project.price?.toString() || "",
      category: project.category || "Web Development",
      project_level: (project as any).project_level || "Beginner",
      project_type: (project as any).project_type || "Mini Project",
      features: (project.features || []).join(", "),
      tech_stack: (project.tech_stack || []).join(", "),
      demo_video_url: project.demo_video_url || "",
      thumbnail: project.thumbnail || "",
      projectImages: project.projectImages || [],
      source_code_zip: project.source_code_zip || "",
      project_report_pdf: (project as any).project_report_pdf || "",
      installation_guide_pdf: (project as any).installation_guide_pdf || "",
      download_url: project.download_url || "",
      version: (project as any).version || "v1.0",
      seller_declaration: (project as any).seller_declaration || false,
      status: project.status || "Draft",
      is_published: project.is_published || false
    });
    setFormErrors({});
    setUploadProgress({});
    setActiveTab("upload");
    navigate(`/seller/edit/${project.id}`);
  };

  const handleDeleteClick = async (projectId: string, status: string, title: string) => {
    // Deletion rule check
    const cleanStatus = (status || "Draft").toLowerCase();
    const canDelete = cleanStatus === "draft" || cleanStatus === "submitted" || cleanStatus === "under review";
    
    if (!canDelete) {
      toast({
        title: "Deletion Restrained",
        description: `Approved, Suspended, or Rejected projects cannot be deleted from the seller panel. Current status: ${status}`,
        variant: "destructive"
      });
      return;
    }

    if (!confirm(`Are you sure you want to delete "${title}"? This action is permanent.`)) return;

    try {
      await deleteDoc(doc(db, "projects", projectId));
      toast({ title: "Deleted", description: "Project removed successfully." });
      fetchSellerProjects();
      refetch();
    } catch (err: any) {
      toast({ title: "Delete Failed", description: err.message, variant: "destructive" });
    }
  };

  // Upload file helper
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldKey: string, folder: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Type validation
    if (fieldKey === "source_code_zip" && !file.name.endsWith(".zip")) {
      toast({ title: "Invalid File", description: "Please upload a ZIP file for source code.", variant: "destructive" });
      return;
    }
    if ((fieldKey === "project_report_pdf" || fieldKey === "installation_guide_pdf") && !file.name.endsWith(".pdf")) {
      toast({ title: "Invalid File", description: "Please upload a PDF document.", variant: "destructive" });
      return;
    }

    const ext = file.name.split(".").pop();
    const filePath = `projects/${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    setUploadProgress(prev => ({ ...prev, [fieldKey]: 1 }));

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(prev => ({ ...prev, [fieldKey]: progress || 1 }));
      },
      (error) => {
        toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
        setUploadProgress(prev => ({ ...prev, [fieldKey]: 0 }));
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        setForm(prev => ({ ...prev, [fieldKey]: url }));
        toast({ title: "Uploaded!", description: `${file.name} uploaded successfully.` });
      }
    );
  };

  // Upload screenshot helper
  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (form.projectImages.length + files.length > 4) {
      toast({ title: "Limit Exceeded", description: "Maximum 4 screenshots allowed.", variant: "destructive" });
      return;
    }

    setUploadProgress(prev => ({ ...prev, screenshots: 1 }));

    const uploadPromises = files.map((file) => {
      const ext = file.name.split(".").pop();
      const filePath = `projects/screenshots/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploadProgress(prev => ({ ...prev, screenshots: progress || 1 }));
          },
          (error) => reject(error),
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });
    });

    Promise.all(uploadPromises)
      .then((urls) => {
        setForm(prev => ({ ...prev, projectImages: [...prev.projectImages, ...urls].slice(0, 4) }));
        toast({ title: "Uploaded", description: "Screenshots attached successfully." });
      })
      .catch((err) => {
        toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
      })
      .finally(() => {
        setUploadProgress(prev => ({ ...prev, screenshots: 0 }));
      });
  };

  const removeScreenshot = (idxToRemove: number) => {
    setForm(prev => ({
      ...prev,
      projectImages: prev.projectImages.filter((_, idx) => idx !== idxToRemove)
    }));
  };

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Load file and resize to base64 or upload to storage
    // To match AdminProjects compress JPEG method:
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setForm(prev => ({ ...prev, thumbnail: dataUrl }));
        toast({ title: "Image Attached", description: "Thumbnail ready." });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});

    // 1. Validation
    const errors: Record<string, string> = {};
    if (!form.title.trim()) errors.title = "Title is required";
    if (!form.short_description.trim()) errors.short_description = "Short description is required";
    if (!form.description.trim()) errors.description = "Full description is required";
    
    const parsedPrice = parseFloat(form.price);
    if (isNaN(parsedPrice) || parsedPrice < 0) errors.price = "Enter a valid positive price";
    
    if (!form.tech_stack.trim()) errors.tech_stack = "Tech stack is required";
    if (!form.features.trim()) errors.features = "Features list is required";

    if (form.demo_video_url.trim()) {
      const ytId = getYouTubeId(form.demo_video_url);
      if (!ytId) errors.demo_video_url = "Please enter a valid YouTube video URL";
    }

    if (form.projectImages.length > 4) errors.screenshots = "Maximum 4 screenshots allowed";
    
    if (!form.seller_declaration) errors.declaration = "You must accept the declaration to submit";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({ title: "Form Validation Failed", description: "Please review the highlighted errors.", variant: "destructive" });
      return;
    }

    // 2. Submission
    setSubmittingProject(true);
    try {
      const payload = {
        title: form.title.trim(),
        short_description: form.short_description.trim(),
        description: form.description.trim(),
        price: parsedPrice,
        category: form.category,
        project_level: form.project_level,
        project_type: form.project_type,
        features: form.features.split(",").map(f => f.trim()).filter(Boolean),
        tech_stack: form.tech_stack.split(",").map(t => t.trim()).filter(Boolean),
        demo_video_url: form.demo_video_url.trim(),
        thumbnail: form.thumbnail,
        projectImages: form.projectImages,
        source_code_zip: form.source_code_zip,
        project_report_pdf: form.project_report_pdf,
        installation_guide_pdf: form.installation_guide_pdf,
        download_url: form.download_url.trim() || form.source_code_zip, // fallback to zip
        version: form.version.trim() || "v1.0",
        seller_declaration: form.seller_declaration,
        seller_id: user?.uid,
        seller_name: user?.displayName || user?.email?.split("@")[0] || "Seller",
        status: "Submitted", // Project submission flow triggers "Submitted" status
        is_published: false, // Must await Admin Review & Approval to publish
        updated_at: serverTimestamp()
      };

      if (editingProject) {
        await updateDoc(doc(db, "projects", editingProject.id), payload);
        
        // Notification
        await addDoc(collection(db, "seller_notifications"), {
          seller_id: user?.uid,
          title: "Project Updated & Resubmitted 📝",
          message: `Your project "${payload.title}" has been updated and resubmitted for admin review.`,
          type: "submitted",
          read: false,
          project_id: editingProject.id,
          project_title: payload.title,
          created_at: serverTimestamp()
        });

        toast({ title: "Resubmitted", description: "Project updated and sent for review." });
      } else {
        const docRef = await addDoc(collection(db, "projects"), {
          ...payload,
          rating: 0,
          total_ratings: 0,
          total_sales: 0,
          created_at: serverTimestamp()
        });

        // Notification
        await addDoc(collection(db, "seller_notifications"), {
          seller_id: user?.uid,
          title: "Project Submitted for Review! 🚀",
          message: `Your project "${payload.title}" has been successfully uploaded and is pending admin approval.`,
          type: "submitted",
          read: false,
          project_id: docRef.id,
          project_title: payload.title,
          created_at: serverTimestamp()
        });

        toast({ title: "Submitted", description: "Your project is now in 'Submitted' status and awaits admin review." });
      }

      setForm(defaultForm);
      setEditingProject(null);
      changeTab("projects");
      fetchSellerProjects();
      refetch();
    } catch (err: any) {
      toast({ title: "Submission Failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmittingProject(false);
    }
  };

  // Nav Links for sidebar
  const sidebarLinks = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "projects", label: "My Projects", icon: FolderOpen },
    { id: "upload", label: "Upload Project", icon: Plus },
    { id: "sales", label: "Sales & Earnings", icon: ShoppingCart },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadNotifsCount },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "projects":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">My Projects</h1>
                <p className="text-sm text-muted-foreground font-body">Manage and track your uploads</p>
              </div>
              <Button variant="hero" size="sm" onClick={() => changeTab("upload")}>
                <Plus className="mr-2 h-4 w-4" /> Add Project
              </Button>
            </div>

            {loadingProjects ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 rounded-xl border border-border bg-card animate-pulse" />
                ))}
              </div>
            ) : sellerProjects.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-12 text-center">
                <p className="text-muted-foreground mb-4 font-body">You haven't uploaded any projects yet.</p>
                <Button variant="hero" size="sm" onClick={() => changeTab("upload")}>
                  Upload Your First Project
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-secondary/20">
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Project</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Category</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Price</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Sales</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Status</th>
                        <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerProjects.map((proj, idx) => {
                        const statusKey = (proj.status || "Draft").toLowerCase();
                        const conf = statusConfig[statusKey] || statusConfig.draft;
                        const canDelete = statusKey === "draft" || statusKey === "submitted" || statusKey === "under review";
                        
                        return (
                          <motion.tr
                            key={proj.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="border-b border-border hover:bg-secondary/20 transition-colors"
                          >
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                {proj.thumbnail && (
                                  <img src={proj.thumbnail} alt={proj.title} className="h-10 w-14 object-cover rounded border border-border flex-shrink-0" />
                                )}
                                <div>
                                  <p className="text-sm font-semibold text-foreground line-clamp-1">{proj.title}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-1 font-body">{proj.short_description}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground font-medium font-body">
                                {proj.category}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm font-semibold text-foreground">
                              ₹{proj.price.toLocaleString()}
                            </td>
                            <td className="px-5 py-4 text-sm text-muted-foreground font-body">
                              {proj.total_sales || 0}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium font-body ${conf.className}`}>
                                <conf.icon className="h-3.5 w-3.5" />
                                {conf.label}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditClick(proj)}
                                  className="text-primary hover:text-primary hover:bg-primary/10"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={!canDelete}
                                  onClick={() => handleDeleteClick(proj.id, proj.status, proj.title)}
                                  className={`text-destructive hover:text-destructive ${canDelete ? 'hover:bg-destructive/10' : 'opacity-40 cursor-not-allowed'}`}
                                  title={canDelete ? "Delete Project" : "Cannot delete project after review/approval decisions."}
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
          </div>
        );

      case "upload":
        return (
          <div className="space-y-6 max-w-4xl">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                {editingProject ? "Edit Project" : "Upload New Project"}
              </h1>
              <p className="text-sm text-muted-foreground font-body">
                {editingProject 
                  ? `Modifying "${editingProject.title}" — status will revert to Submitted for review.` 
                  : "Submit your project for listing. It will enter the submission flow for Admin Review."}
              </p>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-6 rounded-xl border border-border bg-card p-6 md:p-8">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b border-border pb-2 text-primary">Basic Information</h3>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Project Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Gym Management System"
                      value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                      className={formErrors.title ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {formErrors.title && <p className="text-xs text-destructive">{formErrors.title}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="price">Price (₹) *</Label>
                    <Input
                      id="price"
                      type="number"
                      placeholder="e.g. 1000"
                      value={form.price}
                      onChange={(e) => setForm(prev => ({ ...prev, price: e.target.value }))}
                      className={formErrors.price ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {formErrors.price && <p className="text-xs text-destructive">{formErrors.price}</p>}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={form.category} onValueChange={(val) => setForm(prev => ({ ...prev, category: val }))}>
                      <SelectTrigger id="category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project_level">Project Level *</Label>
                    <Select value={form.project_level} onValueChange={(val) => setForm(prev => ({ ...prev, project_level: val }))}>
                      <SelectTrigger id="project_level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {projectLevels.map((lvl) => (
                          <SelectItem key={lvl} value={lvl}>{lvl}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="project_type">Project Type *</Label>
                    <Select value={form.project_type} onValueChange={(val) => setForm(prev => ({ ...prev, project_type: val }))}>
                      <SelectTrigger id="project_type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {projectTypes.map((typ) => (
                          <SelectItem key={typ} value={typ}>{typ}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="version">Version *</Label>
                    <Input
                      id="version"
                      placeholder="e.g. v1.0"
                      value={form.version}
                      onChange={(e) => setForm(prev => ({ ...prev, version: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="download_url">External Download Link (Google Drive) *</Label>
                    <Input
                      id="download_url"
                      placeholder="https://drive.google.com/..."
                      value={form.download_url}
                      onChange={(e) => setForm(prev => ({ ...prev, download_url: e.target.value }))}
                    />
                    <p className="text-[10px] text-muted-foreground font-body">Backup Google Drive link for buyer download delivery.</p>
                  </div>
                </div>
              </div>

              {/* Descriptions */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold border-b border-border pb-2 text-primary">Descriptions & Tags</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="short_description">Short Description *</Label>
                  <Input
                    id="short_description"
                    placeholder="Brief 1-line summary of the project"
                    value={form.short_description}
                    onChange={(e) => setForm(prev => ({ ...prev, short_description: e.target.value }))}
                    className={formErrors.short_description ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {formErrors.short_description && <p className="text-xs text-destructive">{formErrors.short_description}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Full Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed explanation of features, setup instructions, database details, etc."
                    rows={6}
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    className={formErrors.description ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {formErrors.description && <p className="text-xs text-destructive">{formErrors.description}</p>}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="features">Key Features (comma-separated) *</Label>
                    <Input
                      id="features"
                      placeholder="e.g. User Authentication, Secure Dashboard, PayPal Gateway"
                      value={form.features}
                      onChange={(e) => setForm(prev => ({ ...prev, features: e.target.value }))}
                      className={formErrors.features ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {formErrors.features && <p className="text-xs text-destructive">{formErrors.features}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tech_stack">Tech Stack (comma-separated) *</Label>
                    <Input
                      id="tech_stack"
                      placeholder="e.g. React, Node.js, Express, MongoDB, Tailwind"
                      value={form.tech_stack}
                      onChange={(e) => setForm(prev => ({ ...prev, tech_stack: e.target.value }))}
                      className={formErrors.tech_stack ? "border-destructive focus-visible:ring-destructive" : ""}
                    />
                    {formErrors.tech_stack && <p className="text-xs text-destructive">{formErrors.tech_stack}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="demo_video_url">Demo Video URL (YouTube Link)</Label>
                  <Input
                    id="demo_video_url"
                    placeholder="e.g. https://www.youtube.com/watch?v=..."
                    value={form.demo_video_url}
                    onChange={(e) => setForm(prev => ({ ...prev, demo_video_url: e.target.value }))}
                    className={formErrors.demo_video_url ? "border-destructive focus-visible:ring-destructive" : ""}
                  />
                  {formErrors.demo_video_url && <p className="text-xs text-destructive">{formErrors.demo_video_url}</p>}
                </div>
              </div>

              {/* Upload Media */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold border-b border-border pb-2 text-primary">Media Uploads</h3>
                
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Thumbnail */}
                  <div className="space-y-2">
                    <Label>Project Image (Thumbnail)</Label>
                    <div className="flex flex-col gap-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleThumbnailUpload}
                        className="cursor-pointer bg-secondary/20 border-border"
                      />
                      <Input
                        placeholder="Or paste direct image URL"
                        value={form.thumbnail}
                        onChange={(e) => setForm(prev => ({ ...prev, thumbnail: e.target.value }))}
                      />
                    </div>
                    {formErrors.thumbnail && <p className="text-xs text-destructive">{formErrors.thumbnail}</p>}
                    {form.thumbnail && (
                      <div className="mt-2 relative w-36 aspect-video rounded border border-border overflow-hidden">
                        <img src={form.thumbnail} alt="Thumbnail Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Screenshots */}
                  <div className="space-y-2">
                    <Label>Screenshots (Max 4)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleScreenshotUpload}
                      disabled={form.projectImages.length >= 4 || uploadProgress.screenshots > 0}
                      className="cursor-pointer bg-secondary/20 border-border"
                    />
                    {uploadProgress.screenshots > 0 && (
                      <div className="w-full bg-secondary h-2 rounded overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-300" style={{ width: `${uploadProgress.screenshots}%` }} />
                      </div>
                    )}
                    {formErrors.screenshots && <p className="text-xs text-destructive">{formErrors.screenshots}</p>}
                    
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {form.projectImages.map((src, i) => (
                        <div key={i} className="relative group aspect-video rounded border border-border overflow-hidden bg-secondary">
                          <img src={src} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeScreenshot(i)}
                            className="absolute top-1 right-1 p-0.5 rounded bg-black/60 hover:bg-destructive text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Required Documents */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold border-b border-border pb-2 text-primary">Source & Documents</h3>
                
                <div className="grid gap-6 md:grid-cols-3">
                  {/* Source Code ZIP */}
                  <div className="space-y-2 rounded-lg border border-border/60 bg-secondary/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileArchive className="h-5 w-5 text-blue-400" />
                      <Label className="font-semibold text-sm">Source Code ZIP</Label>
                    </div>
                    <Input
                      type="file"
                      accept=".zip"
                      onChange={(e) => handleFileUpload(e, "source_code_zip", "source_code")}
                      className="cursor-pointer bg-secondary/20 text-xs"
                      disabled={uploadProgress.source_code_zip > 0}
                    />
                    {uploadProgress.source_code_zip > 0 && (
                      <div className="space-y-1">
                        <div className="w-full bg-secondary h-1.5 rounded overflow-hidden mt-2">
                          <div className="bg-blue-400 h-full transition-all duration-300" style={{ width: `${uploadProgress.source_code_zip}%` }} />
                        </div>
                        <p className="text-[10px] text-right text-muted-foreground">{uploadProgress.source_code_zip}%</p>
                      </div>
                    )}
                    {form.source_code_zip && <p className="text-xs text-primary truncate mt-1">✓ File ready</p>}
                    {formErrors.source_code_zip && <p className="text-xs text-destructive">{formErrors.source_code_zip}</p>}
                  </div>

                  {/* Project Report PDF */}
                  <div className="space-y-2 rounded-lg border border-border/60 bg-secondary/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-red-400" />
                      <Label className="font-semibold text-sm">Project Report PDF</Label>
                    </div>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e, "project_report_pdf", "reports")}
                      className="cursor-pointer bg-secondary/20 text-xs"
                      disabled={uploadProgress.project_report_pdf > 0}
                    />
                    {uploadProgress.project_report_pdf > 0 && (
                      <div className="space-y-1">
                        <div className="w-full bg-secondary h-1.5 rounded overflow-hidden mt-2">
                          <div className="bg-red-400 h-full transition-all duration-300" style={{ width: `${uploadProgress.project_report_pdf}%` }} />
                        </div>
                        <p className="text-[10px] text-right text-muted-foreground">{uploadProgress.project_report_pdf}%</p>
                      </div>
                    )}
                    {form.project_report_pdf && <p className="text-xs text-primary truncate mt-1">✓ Document ready</p>}
                    {formErrors.project_report_pdf && <p className="text-xs text-destructive">{formErrors.project_report_pdf}</p>}
                  </div>

                  {/* Installation Guide PDF */}
                  <div className="space-y-2 rounded-lg border border-border/60 bg-secondary/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-5 w-5 text-green-400" />
                      <Label className="font-semibold text-sm">Installation Guide PDF</Label>
                    </div>
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleFileUpload(e, "installation_guide_pdf", "guides")}
                      className="cursor-pointer bg-secondary/20 text-xs"
                      disabled={uploadProgress.installation_guide_pdf > 0}
                    />
                    {uploadProgress.installation_guide_pdf > 0 && (
                      <div className="space-y-1">
                        <div className="w-full bg-secondary h-1.5 rounded overflow-hidden mt-2">
                          <div className="bg-green-400 h-full transition-all duration-300" style={{ width: `${uploadProgress.installation_guide_pdf}%` }} />
                        </div>
                        <p className="text-[10px] text-right text-muted-foreground">{uploadProgress.installation_guide_pdf}%</p>
                      </div>
                    )}
                    {form.installation_guide_pdf && <p className="text-xs text-primary truncate mt-1">✓ Document ready</p>}
                    {formErrors.installation_guide_pdf && <p className="text-xs text-destructive">{formErrors.installation_guide_pdf}</p>}
                  </div>
                </div>
              </div>

              {/* Declarations */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold border-b border-border pb-2 text-primary font-display">Seller Declaration</h3>
                
                <div className="flex items-start space-x-3 rounded-lg border border-border bg-secondary/10 p-4">
                  <Checkbox
                    id="declaration"
                    checked={form.seller_declaration}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, seller_declaration: !!checked }))}
                    className="mt-1"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="declaration"
                      className="text-sm font-semibold text-foreground cursor-pointer"
                    >
                      I confirm that:
                    </label>
                    <ul className="text-xs text-muted-foreground space-y-1 font-body list-disc pl-4 mt-1">
                      <li>This project is my own work</li>
                      <li>The project is functional and compiled correctly</li>
                      <li>I have full distribution rights to upload and sell it</li>
                    </ul>
                  </div>
                </div>
                {formErrors.declaration && <p className="text-xs text-destructive">{formErrors.declaration}</p>}
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-3 pt-6 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setForm(defaultForm);
                    setEditingProject(null);
                    changeTab("projects");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="hero"
                  disabled={submittingProject}
                  className="px-6 font-display font-semibold transition-all hover:glow-green"
                >
                  {submittingProject 
                    ? "Submitting..." 
                    : editingProject 
                      ? "Submit Updates for Review" 
                      : "Submit Project for Review"}
                </Button>
              </div>
            </form>
          </div>
        );

      case "sales":
        return (
          <div className="space-y-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Sales & Earnings</h1>
              <p className="text-sm text-muted-foreground font-body">
                Track your financial reports under the <strong className="text-primary">40% seller commission model</strong>
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full -mr-8 -mt-8" />
                <p className="text-sm text-muted-foreground font-body">Cumulative Seller Earnings (40%)</p>
                <p className="font-display text-3xl font-bold text-primary mt-2">₹{stats?.totalEarnings.toLocaleString() || "0"}</p>
                <p className="text-xs text-muted-foreground mt-2 font-body">Your net share from all orders</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full -mr-8 -mt-8" />
                <p className="text-sm text-muted-foreground font-body">Total Platform Comm. (60%)</p>
                <p className="font-display text-3xl font-bold text-foreground mt-2">₹{((stats?.totalEarnings || 0) * 1.5).toLocaleString() || "0"}</p>
                <p className="text-xs text-muted-foreground mt-2 font-body">Retained by marketplace</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full -mr-8 -mt-8" />
                <p className="text-sm text-muted-foreground font-body">Gross Transaction Volume</p>
                <p className="font-display text-3xl font-bold text-foreground mt-2">
                  ₹{((stats?.totalEarnings || 0) * 2.5).toLocaleString() || "0"}
                </p>
                <p className="text-xs text-muted-foreground mt-2 font-body">Total sales checkout volume</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-5 border-b border-border bg-secondary/10">
                <h3 className="font-semibold text-foreground">Transaction Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-secondary/20">
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Order ID</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Project</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Buyer</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Project Price</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Your Earning (40%)</th>
                      <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-body">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.recentSales.map((sale, idx) => (
                      <tr key={sale.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-4 text-xs font-mono text-muted-foreground">
                          {sale.id.slice(0, 8)}...
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-foreground">
                          {sale.project_title}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground font-body">
                          {sale.buyer_name} ({sale.buyer_email})
                        </td>
                        <td className="px-5 py-4 text-sm text-foreground">
                          ₹{sale.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-primary">
                          ₹{sale.seller_earning.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-xs text-muted-foreground font-body">
                          {new Date(sale.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                    {(!stats?.recentSales || stats.recentSales.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground font-body">No sales recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">Seller Notifications</h1>
                <p className="text-sm text-muted-foreground font-body">Stay updated on your listing status and sales alerts</p>
              </div>
              {unreadNotifsCount > 0 && (
                <Button variant="outline-glow" size="sm" onClick={markAllNotifsRead}>
                  Mark All Read
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {notifications.map((notif, idx) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`rounded-xl border p-5 flex items-start gap-4 transition-colors ${
                    notif.read 
                      ? "border-border bg-card/60" 
                      : "border-primary/30 bg-primary/5 glow-green-sm"
                  }`}
                >
                  <div className={`mt-0.5 rounded-full p-1.5 ${
                    notif.type === "sold" 
                      ? "bg-primary/20 text-primary" 
                      : notif.type === "approved" 
                      ? "bg-primary/20 text-primary" 
                      : notif.type === "rejected" 
                      ? "bg-destructive/20 text-destructive" 
                      : "bg-blue-500/20 text-blue-400"
                  }`}>
                    <Bell className="h-4 w-4" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">{notif.title}</h4>
                      <span className="text-[10px] text-muted-foreground font-body">
                        {notif.created_at?.toDate 
                          ? new Date(notif.created_at.toDate()).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            }) 
                          : "Just now"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{notif.message}</p>
                    
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => toggleNotifRead(notif.id, notif.read)}
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        {notif.read ? "Mark Unread" : "Mark Read"}
                      </button>
                      <button
                        onClick={() => deleteNotif(notif.id)}
                        className="text-[10px] font-semibold text-destructive hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}

              {notifications.length === 0 && (
                <div className="rounded-xl border border-border bg-card p-12 text-center text-muted-foreground font-body">
                  No notifications yet.
                </div>
              )}
            </div>
          </div>
        );

      default: // overview dashboard tab
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                  Welcome back, <span className="text-gradient-green">{user?.displayName || user?.email?.split("@")[0]}</span>!
                </h1>
                <p className="text-sm text-muted-foreground font-body">Here's your seller dashboard overview</p>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {[
                { label: "Total Uploaded", value: stats?.totalProjects ?? 0, icon: FolderOpen, desc: "Projects total" },
                { label: "Approved Projects", value: stats?.approvedProjects ?? 0, icon: CheckCircle, desc: "Live on market", color: "text-primary bg-primary/10 border-primary/20" },
                { label: "Pending Review", value: stats?.pendingProjects ?? 0, icon: Clock, desc: "Awaiting approval", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                { label: "Rejected Projects", value: stats?.rejectedProjects ?? 0, icon: XCircle, desc: "Not listed", color: "text-destructive bg-destructive/10 border-destructive/20" },
                { label: "Units Sold", value: stats?.totalUnitsSold ?? 0, icon: TrendingUp, desc: "Total transactions", color: "text-primary bg-primary/10 border-primary/20" },
                { label: "My Earnings (40%)", value: `₹${stats?.totalEarnings.toLocaleString() || "0"}`, icon: Award, desc: "Calculated earnings", color: "text-primary bg-primary/10 border-primary/20" }
              ].map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-5 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground font-body font-medium">{card.label}</span>
                    <card.icon className={`h-4 w-4 ${card.color ? card.color.split(" ")[0] : 'text-muted-foreground'}`} />
                  </div>
                  <p className="font-display text-2xl font-bold text-foreground mt-1">{card.value}</p>
                  <p className="text-[10px] text-muted-foreground font-body mt-1">{card.desc}</p>
                </motion.div>
              ))}
            </div>

            {/* Chart Section */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-display text-lg font-bold text-foreground mb-4">Earnings History</h3>
              <div className="h-72 w-full">
                {stats?.monthlySales && stats.monthlySales.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.monthlySales}>
                      <defs>
                        <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(145, 85%, 40%)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(145, 85%, 40%)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 15% / 0.5)" />
                      <XAxis dataKey="month" stroke="hsl(220 10% 50%)" fontSize={11} />
                      <YAxis stroke="hsl(220 10% 50%)" fontSize={11} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(220 18% 8%)', borderColor: 'hsl(220 15% 15%)', color: 'hsl(0 0% 95%)' }}
                        formatter={(val) => [`₹${val}`, 'Earnings']}
                      />
                      <Area type="monotone" dataKey="earnings" stroke="hsl(145, 85%, 40%)" strokeWidth={2} fillOpacity={1} fill="url(#colorEarnings)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground font-body text-sm">
                    No sales history chart data available. Start listing projects to build history!
                  </div>
                )}
              </div>
            </div>

            {/* Lower Grid: Sales & Recent Uploads */}
            <div className="grid gap-8 lg:grid-cols-2">
              {/* Sales Panel */}
              <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="font-display text-base font-bold text-foreground">Recent Sales</h3>
                    <button onClick={() => changeTab("sales")} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                      View all sales <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto">
                    {stats?.recentSales.slice(0, 4).map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{sale.project_title}</p>
                          <p className="text-[10px] text-muted-foreground font-body">Buyer: {sale.buyer_email}</p>
                        </div>
                        <p className="text-sm font-bold text-primary">₹{sale.seller_earning.toLocaleString()}</p>
                      </div>
                    ))}
                    {(!stats?.recentSales || stats.recentSales.length === 0) && (
                      <p className="text-sm text-muted-foreground py-4 text-center font-body">No units sold yet.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Notifications Quick view */}
              <div className="rounded-xl border border-border bg-card p-6 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="font-display text-base font-bold text-foreground">Recent Notifications</h3>
                    <button onClick={() => changeTab("notifications")} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                      View all <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto">
                    {notifications.slice(0, 4).map((notif) => (
                      <div key={notif.id} className="flex gap-3 py-2 border-b border-border/40 last:border-0">
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5 flex-shrink-0" style={{ opacity: notif.read ? 0.2 : 1 }} />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">{notif.title}</p>
                          <p className="text-[10px] text-muted-foreground truncate font-body">{notif.message}</p>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <p className="text-sm text-muted-foreground py-4 text-center font-body">No notifications received.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <motion.aside
        animate={{ width: sidebarOpen ? 256 : 72 }}
        className="fixed left-0 top-0 z-40 flex h-full flex-col border-r border-border bg-sidebar-background"
      >
        <div className="flex h-16 items-center justify-between px-4">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-green flex-shrink-0 animate-pulse" />
              <span className="font-display text-base font-bold text-foreground whitespace-nowrap">Seller Hub</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            {sidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5">
          {sidebarLinks.map((link) => {
            const active = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => changeTab(link.id as any)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all font-display ${
                  active
                    ? "bg-primary/10 text-primary font-bold shadow-md shadow-primary/5 border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <link.icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && (
                  <div className="flex items-center justify-between w-full">
                    <span className="whitespace-nowrap">{link.label}</span>
                    {link.badge !== undefined && link.badge > 0 && (
                      <span className="rounded-full bg-primary text-primary-foreground font-mono text-[10px] h-5 w-5 flex items-center justify-center font-bold">
                        {link.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-border px-3 py-4">
          <div className="mb-2 px-3">
            {sidebarOpen && (
              <p className="text-xs text-muted-foreground truncate font-body">{user?.email}</p>
            )}
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate("/seller/login");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors font-display"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main content body */}
      <main
        className="flex-1 transition-all duration-300 min-h-screen pb-12"
        style={{ marginLeft: sidebarOpen ? 256 : 72 }}
      >
        <div className="p-8">{renderContent()}</div>
      </main>
    </div>
  );
};

export default SellerDashboard;
