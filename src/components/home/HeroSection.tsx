import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-illustration.png";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const HeroSection = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { data: settings } = useSiteSettings();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/projects?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      
      {/* Gradient orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
                Trusted by 10,000+ students
              </motion.div>

              <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {settings?.homepage.hero_title || "Ship Your Next Project Faster"}
              </h1>

              <p className="max-w-lg text-lg text-muted-foreground">
                {settings?.homepage.hero_subtitle || "Access hundreds of ready-to-use, verified computer science projects with complete source code and documentation."}
              </p>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex max-w-md gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-12 pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                />
              </div>
              <Button type="submit" variant="hero" className="h-12 px-6">
                {settings?.homepage.cta_text || "Explore"}
              </Button>
            </form>

            {/* Stats */}
            <div className="flex gap-8">
              {[
                { label: "Projects", value: "500+" },
                { label: "Downloads", value: "12K+" },
                { label: "Happy Users", value: "8K+" },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <img
                src={heroImage}
                alt="Project marketplace illustration"
                className="w-full rounded-2xl animate-float"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-background/60 via-transparent to-transparent" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
