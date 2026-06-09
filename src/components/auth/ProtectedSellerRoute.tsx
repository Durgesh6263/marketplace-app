import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const ProtectedSellerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isSeller, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/20 animate-pulse" />
          <p className="text-sm text-muted-foreground font-body">Loading Seller Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/seller/login" replace />;
  }

  if (!isSeller && !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-md rounded-2xl border border-border bg-card p-8 glow-green-sm">
          <h1 className="font-display text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground font-body text-sm">
            This section is only accessible to registered sellers. Please sign up or log in with a seller account.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Navigate to="/seller/login" replace />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedSellerRoute;
