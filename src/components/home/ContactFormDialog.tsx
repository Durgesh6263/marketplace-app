import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/integrations/firebase/client";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Please enter a valid email").max(255),
  project_title: z.string().trim().min(1, "Project title is required").max(200),
  project_description: z.string().trim().min(10, "Please describe your project (min 10 chars)").max(2000),
  budget: z.string().trim().max(100).optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ContactFormDialog = ({ open, onOpenChange }: ContactFormDialogProps) => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    project_title: "",
    project_description: "",
    budget: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ContactFormData, string>> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as keyof ContactFormData;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    try {
      await addDoc(collection(db, "contact_submissions"), {
        name: result.data.name,
        email: result.data.email,
        project_title: result.data.project_title,
        project_description: result.data.project_description,
        budget: result.data.budget || null,
        created_at: serverTimestamp(),
      });
    } catch (error) {
      setLoading(false);
      toast({
        title: "Submission Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setSubmitted(true);
    setLoading(false);
    toast({
      title: "Request Submitted!",
      description: "We'll review your project and get back to you soon.",
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after animation
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
        name: "",
        email: "",
        project_title: "",
        project_description: "",
        budget: "",
      });
      setErrors({});
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {submitted ? "Thank You!" : "Get in Touch"}
          </DialogTitle>
          <DialogDescription>
            {submitted
              ? "We've received your request."
              : "Tell us about your project and we'll get back to you."}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle className="h-7 w-7" />
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Our team will review your requirements and contact you within 24 hours.
            </p>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Name *</Label>
                <Input
                  id="contact-name"
                  placeholder="Your name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-email">Email *</Label>
                <Input
                  id="contact-email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact-project">Project Title *</Label>
                <Input
                  id="contact-project"
                  placeholder="e.g. E-Commerce App"
                  value={formData.project_title}
                  onChange={(e) => handleChange("project_title", e.target.value)}
                />
                {errors.project_title && <p className="text-xs text-destructive">{errors.project_title}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-budget">Budget (Optional)</Label>
                <Input
                  id="contact-budget"
                  placeholder="e.g. ₹5,000"
                  value={formData.budget}
                  onChange={(e) => handleChange("budget", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contact-description">Project Description *</Label>
              <Textarea
                id="contact-description"
                placeholder="Describe what you need..."
                rows={4}
                value={formData.project_description}
                onChange={(e) => handleChange("project_description", e.target.value)}
              />
              {errors.project_description && (
                <p className="text-xs text-destructive">{errors.project_description}</p>
              )}
            </div>

            <Button type="submit" variant="hero" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  Submit Request <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ContactFormDialog;
