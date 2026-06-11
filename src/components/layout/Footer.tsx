import { Link } from "react-router-dom";
import { Phone, Mail } from "lucide-react";
import { useBranding } from "@/hooks/useBranding";

const Footer = () => {
  const { data: branding } = useBranding();

  const siteName = branding?.site_name || "The Last Minute Project";
  const supportEmail = branding?.support_email || "omjatale62@gmail.com";
  const contactPhone = branding?.contact_phone || "+91 6263097104";

  return (
    <footer className="border-t border-border bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              {branding?.logo_url ? (
                <img src={branding.logo_url} alt={siteName} className="h-8 max-w-[140px] object-contain" />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-gradient-green" />
              )}
              <span className="font-display text-xl font-bold text-foreground">
                {siteName}
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Your marketplace for academic and professional projects. Buy, sell, and collaborate.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold text-foreground">Quick Links</h4>
            <div className="flex flex-col gap-2">
              <Link to="/projects" className="text-sm text-muted-foreground hover:text-primary transition-colors">Browse Projects</Link>
              <Link to="/categories" className="text-sm text-muted-foreground hover:text-primary transition-colors">Categories</Link>
              <Link to="/sell-with-us" className="text-sm text-muted-foreground hover:text-primary transition-colors">Sell Your Project</Link>
            </div>
          </div>

          {/* Support */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold text-foreground">Support</h4>
            <div className="flex flex-col gap-2">
              <span className="text-sm text-muted-foreground">Help Center</span>
              <span className="text-sm text-muted-foreground">Terms of Service</span>
              <span className="text-sm text-muted-foreground">Privacy Policy</span>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-semibold text-foreground">Contact</h4>
            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${supportEmail}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4" />
                {supportEmail}
              </a>
              <a
                href={`tel:${contactPhone.replace(/\s/g, "")}`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4" />
                {contactPhone}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 {siteName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
