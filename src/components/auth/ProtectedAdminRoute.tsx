import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ShieldAlert } from "lucide-react";

const ProtectedAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  const [countdown, setCountdown] = useState(3);
  const navigate = useNavigate();

  const isAuthorized = user && isAdmin && user.email === "durgeshjatale@gmail.com";

  useEffect(() => {
    // Only start countdown if loading has finished and user is not authorized
    if (!loading && !isAuthorized) {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // Redirect to home if they are logged in but unauthorized, otherwise to login
        if (user) {
          navigate("/", { replace: true });
        } else {
          navigate("/admin/login", { replace: true });
        }
      }
    }
  }, [loading, isAuthorized, countdown, navigate, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full rounded-2xl border border-destructive/20 bg-destructive/10 p-8 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/20 text-destructive mb-4">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground font-body">
            Administrator privileges required.
          </p>
          <p className="text-xs text-muted-foreground mt-6">
            Redirecting in {countdown} seconds...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedAdminRoute;
