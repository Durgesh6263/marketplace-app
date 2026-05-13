import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-10 md:p-16 text-center"
        >
          {/* Glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/10 blur-[100px] rounded-full" />

          <div className="relative z-10 space-y-6">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary glow-green-sm">
                <Rocket className="h-7 w-7" />
              </div>
            </div>
            <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              Access Anytime, <span className="text-gradient-green">Anywhere</span>
            </h2>
            <p className="mx-auto max-w-md text-muted-foreground">
              Discover and download projects effortlessly on The Last Minute Project. Start building your next big idea today.
            </p>
            <Button variant="hero" size="lg" asChild>
              <Link to="/projects">
                Get Started <Rocket className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
