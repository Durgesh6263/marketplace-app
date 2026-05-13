import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Send, CheckCircle, Store, IndianRupee, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/integrations/firebase/client";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be under 100 characters"),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().min(1, "Phone number is required").max(15, "Invalid phone number"),
  projectTitle: z.string().trim().min(1, "Project title is required").max(200),
  projectDescription: z.string().trim().min(10, "Please describe your project in at least 10 characters").max(2000),
  expectedPrice: z.string().trim().min(1, "Expected price is required"),
  techStack: z.string().trim().min(1, "Please mention the tech stack").max(500),
});

type ContactFormData = z.infer<typeof contactSchema>;

const benefits = [
  {
    icon: Store,
    title: "Showcase & Sell",
    description: "We list your project on our marketplace and handle all the marketing.",
  },
  {
    icon: IndianRupee,
    title: "Commission Based",
    description: "You earn a commission on every sale. No upfront cost to list.",
  },
  {
    icon: Shield,
    title: "Secure & Trusted",
    description: "Secure payment processing and verified buyer base.",
  },
];

const SellWithUs = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    phone: "",
    projectTitle: "",
    projectDescription: "",
    expectedPrice: "",
    techStack: "",
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
      await addDoc(collection(db, "seller_requests"), {
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone,
        project_title: result.data.projectTitle,
        project_description: result.data.projectDescription,
        expected_price: result.data.expectedPrice,
        tech_stack: result.data.techStack,
        status: "new",
        created_at: serverTimestamp()
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
      description: "We'll review your project and get back to you within 24 hours.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <section className="py-16">
          <div className="container mx-auto px-4">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-12"
            >
              <h1 className="font-display text-4xl font-bold text-foreground md:text-5xl">
                Sell Your Project on{" "}
                <span className="text-gradient-green">The Last Minute Project</span>
              </h1>
              <p className="mt-4 mx-auto max-w-xl text-muted-foreground">
                Submit your project details and we'll list it on our marketplace. You earn a commission on every sale — zero upfront cost.
              </p>
            </motion.div>

            {/* Benefits */}
            <div className="grid gap-6 md:grid-cols-3 mb-16">
              {benefits.map((benefit, i) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border border-border bg-card p-6 text-center"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <benefit.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Form / Success */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 md:p-10"
            >
              {submitted ? (
                <div className="text-center py-10 space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle className="h-8 w-8" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-foreground">
                    Thank You!
                  </h2>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    We've received your project details. Our team will review it and contact you within 24 hours to discuss the commission terms.
                  </p>
                  <Button
                    variant="outline-glow"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({
                        name: "",
                        email: "",
                        phone: "",
                        projectTitle: "",
                        projectDescription: "",
                        expectedPrice: "",
                        techStack: "",
                      });
                    }}
                  >
                    Submit Another Project
                  </Button>
                </div>
              ) : (
                <>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-6">
                    Submit Your Project
                  </h2>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="Your name"
                          value={formData.name}
                          onChange={(e) => handleChange("name", e.target.value)}
                        />
                        {errors.name && (
                          <p className="text-xs text-destructive">{errors.name}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={(e) => handleChange("email", e.target.value)}
                        />
                        {errors.email && (
                          <p className="text-xs text-destructive">{errors.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          placeholder="+91 9876543210"
                          value={formData.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                        />
                        {errors.phone && (
                          <p className="text-xs text-destructive">{errors.phone}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="expectedPrice">Expected Price (₹)</Label>
                        <Input
                          id="expectedPrice"
                          placeholder="e.g. 999"
                          value={formData.expectedPrice}
                          onChange={(e) => handleChange("expectedPrice", e.target.value)}
                        />
                        {errors.expectedPrice && (
                          <p className="text-xs text-destructive">{errors.expectedPrice}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="projectTitle">Project Title</Label>
                      <Input
                        id="projectTitle"
                        placeholder="e.g. E-Commerce Dashboard with React"
                        value={formData.projectTitle}
                        onChange={(e) => handleChange("projectTitle", e.target.value)}
                      />
                      {errors.projectTitle && (
                        <p className="text-xs text-destructive">{errors.projectTitle}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="techStack">Tech Stack</Label>
                      <Input
                        id="techStack"
                        placeholder="e.g. React, Node.js, MongoDB, Tailwind CSS"
                        value={formData.techStack}
                        onChange={(e) => handleChange("techStack", e.target.value)}
                      />
                      {errors.techStack && (
                        <p className="text-xs text-destructive">{errors.techStack}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="projectDescription">Project Description</Label>
                      <Textarea
                        id="projectDescription"
                        placeholder="Describe your project, its features, and why it's valuable..."
                        rows={5}
                        value={formData.projectDescription}
                        onChange={(e) => handleChange("projectDescription", e.target.value)}
                      />
                      {errors.projectDescription && (
                        <p className="text-xs text-destructive">{errors.projectDescription}</p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="hero"
                      size="lg"
                      className="w-full"
                      disabled={loading}
                    >
                      {loading ? (
                        "Submitting..."
                      ) : (
                        <>
                          Submit for Review <Send className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SellWithUs;
