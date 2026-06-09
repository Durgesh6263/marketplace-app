import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { Lock, Mail, ArrowLeft, Loader2, Store } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/integrations/firebase/client";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const SellerLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Validation Error", description: "Please enter your email and password.", variant: "destructive" });
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);

    if (error) {
      toast({ title: "Login Failed", description: error.message || "Invalid credentials.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Direct role check immediately after sign in
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const docRef = doc(db, "user_roles", currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && (docSnap.data().role === "seller" || docSnap.data().role === "admin")) {
          toast({ title: "Welcome back! 👋", description: "Successfully logged in to the Seller Portal." });
          navigate("/seller");
        } else {
          // Not authorized. Sign out immediately.
          await signOut();
          toast({
            title: "Access Denied",
            description: "This account is not registered as a seller. Please sign up to become a seller.",
            variant: "destructive"
          });
        }
      } else {
        toast({ title: "Error", description: "User session not found.", variant: "destructive" });
      }
    } catch (err: any) {
      console.error("Direct role check error during login:", err);
      await signOut();
      toast({ title: "Error", description: "Could not verify user role. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
            to="/sell-with-us"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Sell with Us info
          </Link>

          <div className="rounded-2xl border border-border bg-card p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
            
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary glow-green-sm">
                <Store className="h-7 w-7" />
              </div>
            </div>

            <h1 className="font-display text-3xl font-bold text-foreground text-center mb-1">
              Seller <span className="text-gradient-green">Login</span>
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-8">
              Sign in to manage your project products and view earnings
            </p>

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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/seller/forgot-password"
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging In...
                  </>
                ) : (
                  "Log In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have a seller account yet?{" "}
                <Link to="/seller/signup" className="text-primary hover:underline font-medium">
                  Register here
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

export default SellerLogin;
