import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import { db, storage } from "@/integrations/firebase/client";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { categories } from "@/data/mockProjects";
import { Switch } from "@/components/ui/switch";

interface DBProject {
  id: string;
  title: string;
  short_description: string;
  description: string;
  price: number;
  category: string;
  thumbnail: string;
  screenshots: string[];
  demo_video_url: string;
  download_url: string;
  features: string[];
  tech_stack: string[];
  rating: number;
  total_sales: number;
  is_published: boolean;
  created_at: any;
  updated_at: any;
}

const emptyForm = {
  title: "",
  short_description: "",
  description: "",
  price: "",
  category: "Web Development",
  features: "",
  tech_stack: "",
  demo_video_url: "",
  thumbnail: "",
  screenshots: [] as string[],
  download_url: "",
  is_published: true,
  total_sales: "0",
  rating: "0",
};

const AdminProjects = () => {
  const [projects, setProjects] = useState<DBProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<DBProject | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false);
  const { toast } = useToast();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "projects"), orderBy("created_at", "desc"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DBProject));
      setProjects(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const openAddDialog = () => {
    setEditingProject(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (project: DBProject) => {
    setEditingProject(project);
    setForm({
      title: project.title,
      short_description: project.short_description,
      description: project.description,
      price: project.price.toString(),
      category: project.category,
      features: (project.features || []).join(", "),
      tech_stack: (project.tech_stack || []).join(", "),
      demo_video_url: project.demo_video_url || "",
      thumbnail: project.thumbnail || "",
      screenshots: project.screenshots || [],
      download_url: project.download_url || "",
      is_published: project.is_published,
      total_sales: (project.total_sales || 0).toString(),
      rating: (project.rating || 0).toString(),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        short_description: form.short_description.trim(),
        description: form.description.trim(),
        price: parseFloat(form.price) || 0,
        category: form.category,
        features: form.features.split(",").map((f) => f.trim()).filter(Boolean),
        tech_stack: form.tech_stack.split(",").map((t) => t.trim()).filter(Boolean),
        demo_video_url: form.demo_video_url.trim(),
        thumbnail: form.thumbnail.trim(),
        screenshots: form.screenshots,
        download_url: form.download_url.trim(),
        is_published: form.is_published,
        total_sales: parseInt(form.total_sales) || 0,
        rating: parseFloat(form.rating) || 0,
        updated_at: serverTimestamp(),
      };

      if (editingProject) {
        await updateDoc(doc(db, "projects", editingProject.id), payload);
        toast({ title: "Updated", description: "Project updated successfully." });
      } else {
        await addDoc(collection(db, "projects"), {
          ...payload,
          created_at: serverTimestamp(),
        });
        toast({ title: "Created", description: "Project added successfully." });
      }
      fetchProjects();
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
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
        
        // Compress to JPEG with 0.7 quality to save space
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setForm({ ...form, thumbnail: dataUrl });
        setUploadingImage(false);
        toast({ title: "Image Attached", description: "Thumbnail is ready." });
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      toast({ title: "Error", description: "Failed to read image", variant: "destructive" });
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (form.screenshots.length + files.length > 4) {
      toast({ title: "Limit Exceeded", description: "Maximum 4 screenshots allowed.", variant: "destructive" });
      return;
    }

    setUploadingScreenshots(true);

    const uploadPromises = files.map(async (file) => {
      const ext = file.name.split(".").pop();
      const filePath = `projects/screenshots/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<string>((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          null,
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
        setForm((prev) => ({ ...prev, screenshots: [...prev.screenshots, ...urls].slice(0, 4) }));
        toast({ title: "Uploaded", description: "Screenshots added successfully." });
      })
      .catch((err) => {
        toast({ title: "Upload Failed", description: err.message, variant: "destructive" });
      })
      .finally(() => {
        setUploadingScreenshots(false);
      });
  };

  const removeScreenshot = (indexToRemove: number) => {
    setForm(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const deleteProject = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "projects", id));
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast({ title: "Deleted", description: "Project removed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const togglePublish = async (project: DBProject) => {
    try {
      const newState = !project.is_published;
      await updateDoc(doc(db, "projects", project.id), { is_published: newState, updated_at: serverTimestamp() });
      setProjects((prev) => prev.map((p) => (p.id === project.id ? { ...p, is_published: newState } : p)));
      toast({
        title: newState ? "Published" : "Unpublished",
        description: `"${project.title}" is now ${newState ? "visible" : "hidden"}.`,
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-muted-foreground">
            {projects.length} total · {projects.filter((p) => p.is_published).length} published
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline-glow" size="sm" onClick={fetchProjects} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="hero" size="sm" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> Add Project
          </Button>
        </div>
      </div>

      {/* Projects Table */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground mb-4">No projects yet.</p>
          <Button variant="hero" size="sm" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" /> Add Your First Project
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Price</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Sales</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Rating</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project, index) => (
                  <motion.tr
                    key={project.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-border last:border-0 hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{project.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{project.short_description}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                        {project.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-foreground">
                      ₹{project.price.toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {project.total_sales || 0}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      ⭐ {project.rating || 0}
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => togglePublish(project)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          project.is_published
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {project.is_published ? (
                          <><Eye className="h-3 w-3" /> Published</>
                        ) : (
                          <><EyeOff className="h-3 w-3" /> Draft</>
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary"
                          onClick={() => openEditDialog(project)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => deleteProject(project.id, project.title)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingProject ? "Edit Project" : "Add New Project"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                placeholder="e.g. E-Commerce Platform"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Short Description</Label>
              <Input
                placeholder="One-line summary"
                value={form.short_description}
                onChange={(e) => setForm({ ...form, short_description: e.target.value })}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 2499"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(val) => setForm({ ...form, category: val })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Full Description</Label>
              <Textarea
                placeholder="Detailed description of the project..."
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Features (comma-separated)</Label>
              <Input
                placeholder="e.g. Authentication, Dashboard, Payment Gateway"
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Tech Stack (comma-separated)</Label>
              <Input
                placeholder="e.g. React, Node.js, MongoDB"
                value={form.tech_stack}
                onChange={(e) => setForm({ ...form, tech_stack: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Demo Video URL (optional)</Label>
              <Input
                placeholder="https://youtube.com/..."
                value={form.demo_video_url}
                onChange={(e) => setForm({ ...form, demo_video_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Project Image (Thumbnail)</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                <Input
                  placeholder="Or paste image URL"
                  value={form.thumbnail}
                  onChange={(e) => setForm({ ...form, thumbnail: e.target.value })}
                />
              </div>
              {uploadingImage && <p className="text-xs text-muted-foreground">Uploading image...</p>}
              {form.thumbnail && (
                <img src={form.thumbnail} alt="Preview" className="w-32 h-24 object-cover rounded-md mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label>Project Screenshots (Max 4)</Label>
              <div className="flex gap-2">
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleScreenshotUpload}
                  disabled={uploadingScreenshots || form.screenshots.length >= 4}
                />
              </div>
              <p className="text-xs text-muted-foreground">Upload up to 4 high-quality screenshots.</p>
              {uploadingScreenshots && <p className="text-xs text-muted-foreground">Uploading screenshots...</p>}
              
              {form.screenshots.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {form.screenshots.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img src={url} alt={`Screenshot ${idx + 1}`} className="w-full h-24 object-cover rounded-md border border-border" />
                      <button
                        onClick={() => removeScreenshot(idx)}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-red-500/80 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Download URL (Google Drive link)</Label>
              <Input
                placeholder="https://drive.google.com/..."
                value={form.download_url}
                onChange={(e) => setForm({ ...form, download_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Set the Google Drive download link. Buyers receive this after successful payment.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Total Sales</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={form.total_sales}
                  onChange={(e) => setForm({ ...form, total_sales: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Rating Override (0-5)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  placeholder="0"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={form.is_published}
                onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
              />
              <Label>Published (visible to buyers)</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="hero" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingProject ? "Update Project" : "Add Project"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProjects;
