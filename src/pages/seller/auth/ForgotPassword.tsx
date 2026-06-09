import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { Mail, ArrowLeft, Loader2, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  
  const { resetPassword } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Validation Error", description: "Please enter your email address.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      toast({ title: "Failed to Send Reset Email", description: error.message || "An error occurred.", variant: "destructive" });
      return;
    }

    setSent(true);
    toast({ title: "Email Sent! ✉️", description: "Check your inbox for password reset instructions." });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between">
      <Navbar />
      <main className="flex-1 flex items-center justify-center pt-24 pb-12 px-4 bg-grid-pattern">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Back button */}
          <Link
            to="/seller/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Seller Login
          </Link>

          <div className="rounded-2xl border border-border bg-card p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
            
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary glow-green-sm">
                <Key className="h-7 w-7" />
              </div>
            </div>

            <h1 className="font-display text-3xl font-bold text-foreground text-center mb-1">
              Reset <span className="text-gradient-green">Password</span>
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Enter your registered seller email to receive a recovery link
            </p>

            {sent ? (
              <div className="text-center py-6 space-y-4">
                <div className="rounded-lg bg-secondary/50 p-4 border border-border">
                  <p className="text-sm text-muted-foreground">
                    An email has been sent to <span className="text-foreground font-semibold">{email}</span>.
                    Follow the instructions inside to reset your password.
                  </p>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/seller/login">Return to Login</Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seller@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-secondary/30 border-border focus-visible:ring-primary"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full mt-2 font-display font-semibold transition-all hover:glow-green"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Link...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link to="/seller/login" className="text-primary hover:underline font-medium">
                  Login here
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default ForgotPassword;
