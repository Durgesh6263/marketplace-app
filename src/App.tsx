import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import RealtimeProvider from "@/components/RealtimeProvider";
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Categories from "./pages/Categories";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import SellWithUs from "./pages/SellWithUs";
import ProtectedAdminRoute from "./components/auth/ProtectedAdminRoute";
import NotFound from "./pages/NotFound";

import SellerLogin from "./pages/seller/auth/SellerLogin";
import SellerSignup from "./pages/seller/auth/SellerSignup";
import ForgotPassword from "./pages/seller/auth/ForgotPassword";
import SellerDashboard from "./pages/seller/Dashboard";
import ProtectedSellerRoute from "./components/auth/ProtectedSellerRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RealtimeProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/project/:id" element={<ProjectDetail />} />
            <Route path="/categories" element={<Categories />} />
            
            {/* Admin Portal */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
            <Route path="/admin/*" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
            
            {/* Seller Portal */}
            <Route path="/seller/login" element={<SellerLogin />} />
            <Route path="/seller/signup" element={<SellerSignup />} />
            <Route path="/seller/forgot-password" element={<ForgotPassword />} />
            <Route path="/seller" element={<ProtectedSellerRoute><SellerDashboard /></ProtectedSellerRoute>} />
            <Route path="/seller/*" element={<ProtectedSellerRoute><SellerDashboard /></ProtectedSellerRoute>} />

            <Route path="/sell-with-us" element={<SellWithUs />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </RealtimeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
