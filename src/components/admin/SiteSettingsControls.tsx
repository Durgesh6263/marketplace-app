import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Save, Loader2, Image as ImageIcon, Globe, Palette, Layout, Link as LinkIcon, Search } from "lucide-react";
import { db, storage } from "@/integrations/firebase/client";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useToast } from "@/hooks/use-toast";
import { useSiteSettings, DEFAULT_SETTINGS, SiteSettings } from "@/hooks/useSiteSettings";
import { useQueryClient } from "@tanstack/react-query";

const SiteSettingsControls = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  
  // Local state for the form
  const [formData, setFormData] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [initialized, setInitialized] = useState(false);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (settings && !initialized) {
      setFormData(settings);
      setInitialized(true);
    }
  }, [settings, initialized]);

  const handleNestedChange = (section: keyof SiteSettings, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const uploadFile = async (file: File, type: "logo" | "favicon") => {
    const setUploading = type === "logo" ? setUploadingLogo : setUploadingFavicon;
    setUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const filePath = `site_settings/${type}-${Date.now()}.${ext}`;
      const storageRef = ref(storage, filePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        () => {},
        (error) => {
          toast({ title: "Storage Error", description: error.message, variant: "destructive" });
          setUploading(false);
        },
        async () => {
          try {
            const publicUrl = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Update local state
            handleNestedChange("logo", type === "logo" ? "logo_url" : "favicon_url", publicUrl);
            
            // Auto save specifically the logo to DB
            const updatedLogo = {
              ...formData.logo,
              [type === "logo" ? "logo_url" : "favicon_url"]: publicUrl
            };
            
            await setDoc(doc(db, "site_settings", "default"), {
              logo: updatedLogo,
              updated_at: serverTimestamp(),
            }, { merge: true });

            queryClient.invalidateQueries({ queryKey: ["site-settings"] });
            toast({
              title: `${type === "logo" ? "Logo" : "Favicon"} Updated`,
              description: "Changes have been applied successfully.",
            });
          } catch (err: any) {
            toast({ title: "Firestore Error", description: err.message, variant: "destructive" });
          } finally {
            setUploading(false);
          }
        }
      );
    } catch (err: any) {
      toast({ title: "Upload Initialization Failed", description: err.message, variant: "destructive" });
      setUploading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "site_settings", "default"), {
        ...formData,
        updated_at: serverTimestamp(),
      });

      queryClient.invalidateQueries({ queryKey: ["site-settings"] });
      toast({
        title: "Settings Saved",
        description: "Website configuration has been updated successfully.",
      });
    } catch (err: any) {
      toast({ title: "Save Failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !initialized) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Website Management</h1>
          <p className="text-sm text-muted-foreground">Manage everything about your site from one place.</p>
        </div>
        <Button variant="hero" onClick={saveSettings} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {saving ? "Saving..." : "Save All Settings"}
        </Button>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="mb-4 bg-card border border-border flex flex-wrap h-auto p-1">
          <TabsTrigger value="general" className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Globe className="h-4 w-4"/> General</TabsTrigger>
          <TabsTrigger value="logos" className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><ImageIcon className="h-4 w-4"/> Logos</TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Palette className="h-4 w-4"/> Branding</TabsTrigger>
          <TabsTrigger value="homepage" className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Layout className="h-4 w-4"/> Homepage</TabsTrigger>
          <TabsTrigger value="social" className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><LinkIcon className="h-4 w-4"/> Social</TabsTrigger>
          <TabsTrigger value="seo" className="flex items-center gap-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"><Search className="h-4 w-4"/> SEO</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Website Name</Label>
              <Input value={formData.general.website_name} onChange={(e) => handleNestedChange("general", "website_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Tagline</Label>
              <Input value={formData.general.tagline} onChange={(e) => handleNestedChange("general", "tagline", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={formData.general.description} onChange={(e) => handleNestedChange("general", "description", e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Contact Email</Label>
              <Input type="email" value={formData.general.contact_email} onChange={(e) => handleNestedChange("general", "contact_email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact Phone</Label>
              <Input value={formData.general.contact_phone} onChange={(e) => handleNestedChange("general", "contact_phone", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Company Address</Label>
            <Input value={formData.general.address} onChange={(e) => handleNestedChange("general", "address", e.target.value)} />
          </div>
        </TabsContent>

        {/* Logos Tab */}
        <TabsContent value="logos" className="grid gap-6 lg:grid-cols-2">
          {/* Logo Upload */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Website Logo</h3>
            {formData.logo.logo_url && (
              <div className="rounded-lg border border-border bg-secondary/30 p-4 flex items-center justify-center">
                <img src={formData.logo.logo_url} alt="Logo" className="max-h-16 max-w-full object-contain" />
              </div>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f) uploadFile(f, "logo"); }} />
            <Button variant="outline-glow" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
              {uploadingLogo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload New Logo
            </Button>
          </div>

          {/* Favicon Upload */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Favicon (Browser Tab Icon)</h3>
            {formData.logo.favicon_url && (
              <div className="rounded-lg border border-border bg-secondary/30 p-4 flex items-center justify-center">
                <img src={formData.logo.favicon_url} alt="Favicon" className="h-8 w-8 object-contain" />
              </div>
            )}
            <input ref={faviconInputRef} type="file" accept="image/png,image/x-icon,image/ico,image/svg+xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f) uploadFile(f, "favicon"); }} />
            <Button variant="outline-glow" onClick={() => faviconInputRef.current?.click()} disabled={uploadingFavicon}>
              {uploadingFavicon ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload Favicon
            </Button>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="rounded-xl border border-border bg-card p-6 space-y-5">
           <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Primary Color (HSL)</Label>
              <Input placeholder="142.1 76.2% 36.3%" value={formData.branding.primary_color} onChange={(e) => handleNestedChange("branding", "primary_color", e.target.value)} />
              <p className="text-xs text-muted-foreground">Tailwind HSL format without hsl() wrapper.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Secondary Color (HSL)</Label>
              <Input placeholder="240 4.8% 95.9%" value={formData.branding.secondary_color} onChange={(e) => handleNestedChange("branding", "secondary_color", e.target.value)} />
            </div>
          </div>
        </TabsContent>

        {/* Homepage Tab */}
        <TabsContent value="homepage" className="rounded-xl border border-border bg-card p-6 space-y-5">
          <h3 className="font-bold border-b border-border pb-2">Hero Section</h3>
          <div className="space-y-1.5">
            <Label>Hero Title</Label>
            <Input value={formData.homepage.hero_title} onChange={(e) => handleNestedChange("homepage", "hero_title", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Hero Subtitle</Label>
            <Textarea value={formData.homepage.hero_subtitle} onChange={(e) => handleNestedChange("homepage", "hero_subtitle", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Hero CTA Button Text</Label>
            <Input value={formData.homepage.cta_text} onChange={(e) => handleNestedChange("homepage", "cta_text", e.target.value)} />
          </div>

          <h3 className="font-bold border-b border-border pb-2 mt-6">Features Section</h3>
          <div className="space-y-1.5">
            <Label>Features Title</Label>
            <Input value={formData.homepage.features_title} onChange={(e) => handleNestedChange("homepage", "features_title", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Features Description</Label>
            <Textarea value={formData.homepage.features_description} onChange={(e) => handleNestedChange("homepage", "features_description", e.target.value)} />
          </div>

          <h3 className="font-bold border-b border-border pb-2 mt-6">Seller Section</h3>
          <div className="space-y-1.5">
            <Label>Seller Commission %</Label>
            <Input type="number" value={formData.homepage.seller_commission_pct} onChange={(e) => handleNestedChange("homepage", "seller_commission_pct", Number(e.target.value))} />
          </div>
        </TabsContent>

        {/* Social Tab */}
        <TabsContent value="social" className="rounded-xl border border-border bg-card p-6 space-y-5">
           <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>LinkedIn URL</Label>
              <Input type="url" value={formData.social.linkedin} onChange={(e) => handleNestedChange("social", "linkedin", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram URL</Label>
              <Input type="url" value={formData.social.instagram} onChange={(e) => handleNestedChange("social", "instagram", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Facebook URL</Label>
              <Input type="url" value={formData.social.facebook} onChange={(e) => handleNestedChange("social", "facebook", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Twitter/X URL</Label>
              <Input type="url" value={formData.social.twitter} onChange={(e) => handleNestedChange("social", "twitter", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>YouTube URL</Label>
              <Input type="url" value={formData.social.youtube} onChange={(e) => handleNestedChange("social", "youtube", e.target.value)} />
            </div>
          </div>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div className="space-y-1.5">
            <Label>Meta Title</Label>
            <Input value={formData.seo.meta_title} onChange={(e) => handleNestedChange("seo", "meta_title", e.target.value)} />
            <p className="text-xs text-muted-foreground">Appears in browser tab and search results.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Meta Description</Label>
            <Textarea value={formData.seo.meta_description} onChange={(e) => handleNestedChange("seo", "meta_description", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Keywords</Label>
            <Input value={formData.seo.keywords} onChange={(e) => handleNestedChange("seo", "keywords", e.target.value)} placeholder="projects, source code, final year..." />
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
};

export default SiteSettingsControls;
