import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Save, Loader2, Image as ImageIcon, Globe } from "lucide-react";
import { db } from "@/integrations/firebase/client";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/hooks/useBranding";
import { useQueryClient } from "@tanstack/react-query";

const AdminBrandingControls = () => {
  const { data: branding, isLoading } = useBranding();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [siteName, setSiteName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [initialized, setInitialized] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (branding && !initialized) {
    setSiteName(branding.site_name);
    setSupportEmail(branding.support_email);
    setContactPhone(branding.contact_phone);
    setInitialized(true);
  }

  const uploadFile = (file: File, type: "logo" | "favicon") => {
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingFavicon;
    setUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = type === "logo" ? 400 : 128;
          const MAX_HEIGHT = type === "logo" ? 150 : 128;
          let width = img.width || MAX_WIDTH;
          let height = img.height || MAX_HEIGHT;

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
          
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          const dataUrl = canvas.toDataURL(type === "favicon" ? "image/png" : "image/jpeg", 0.8);

          await setDoc(doc(db, "site_branding", "default"), {
            [type === "logo" ? "logo_url" : "favicon_url"]: dataUrl,
            updated_at: serverTimestamp(),
          }, { merge: true });

          queryClient.invalidateQueries({ queryKey: ["site-branding"] });
          toast({
            title: `${type === "logo" ? "Logo" : "Favicon"} Updated`,
            description: "Changes will reflect across the website.",
          });
        } catch (err: any) {
          toast({
            title: "Upload Failed",
            description: err.message || "Failed to process image.",
            variant: "destructive",
          });
        } finally {
          setUploading(false);
        }
      };
      img.onerror = () => {
        toast({ title: "Error", description: "Invalid image file format.", variant: "destructive" });
        setUploading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      toast({ title: "Error", description: "Failed to read image", variant: "destructive" });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const saveSettings = async () => {
    setSaving(true);

    try {
      await setDoc(doc(db, "site_branding", "default"), {
        site_name: siteName.trim(),
        support_email: supportEmail.trim(),
        contact_phone: contactPhone.trim(),
        updated_at: serverTimestamp(),
      }, { merge: true });

      queryClient.invalidateQueries({ queryKey: ["site-branding"] });
      toast({
        title: "Branding Updated",
        description: "Changes saved and reflected across the website.",
      });
    } catch (err: any) {
      toast({
        title: "Save Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground">Branding Controls</h1>
        <p className="text-sm text-muted-foreground">
          Manage your website logo, favicon, and contact information
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Website Logo</h3>
          </div>
          {branding?.logo_url && (
            <div className="rounded-lg border border-border bg-secondary/30 p-4 flex items-center justify-center">
              <img
                src={branding.logo_url}
                alt="Current logo"
                className="max-h-16 max-w-full object-contain"
              />
            </div>
          )}
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file, "logo");
            }}
          />
          <Button
            variant="outline-glow"
            size="sm"
            onClick={() => logoInputRef.current?.click()}
            disabled={uploadingLogo}
          >
            {uploadingLogo ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploadingLogo ? "Uploading..." : "Upload Logo"}
          </Button>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Favicon (Browser Tab Icon)</h3>
          </div>
          {branding?.favicon_url && (
            <div className="rounded-lg border border-border bg-secondary/30 p-4 flex items-center justify-center">
              <img
                src={branding.favicon_url}
                alt="Current favicon"
                className="h-8 w-8 object-contain"
              />
            </div>
          )}
          <input
            ref={faviconInputRef}
            type="file"
            accept="image/png,image/x-icon,image/ico,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadFile(file, "favicon");
            }}
          />
          <Button
            variant="outline-glow"
            size="sm"
            onClick={() => faviconInputRef.current?.click()}
            disabled={uploadingFavicon}
          >
            {uploadingFavicon ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {uploadingFavicon ? "Uploading..." : "Upload Favicon"}
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-6 space-y-5">
        <h3 className="font-display font-semibold text-foreground">Site Information</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="site-name">Site Name</Label>
            <Input
              id="site-name"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="support-email">Support Email</Label>
            <Input
              id="support-email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-phone">Contact Phone</Label>
          <Input
            id="contact-phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </div>

        <Button variant="hero" onClick={saveSettings} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};

export default AdminBrandingControls;
