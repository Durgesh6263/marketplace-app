import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { categories } from "@/data/mockProjects";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Code, Smartphone, Brain, BarChart3, Cpu, Blocks, Gamepad2, Monitor } from "lucide-react";

const categoryIcons: Record<string, React.ElementType> = {
  "Web Development": Code,
  "Mobile App": Smartphone,
  "Machine Learning": Brain,
  "Data Science": BarChart3,
  "IoT": Cpu,
  "Blockchain": Blocks,
  "Game Development": Gamepad2,
  "Desktop App": Monitor,
};

const Categories = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <h1 className="font-display text-3xl font-bold text-foreground">
              Browse by <span className="text-gradient-green">Category</span>
            </h1>
            <p className="mt-2 text-muted-foreground">Find projects in your area of interest</p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((cat, index) => {
              const Icon = categoryIcons[cat] || Code;
              return (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <Link
                    to={`/projects?category=${encodeURIComponent(cat)}`}
                    className="card-hover group flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-8 text-center"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:glow-green-sm transition-all">
                      <Icon className="h-7 w-7" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {cat}
                    </h3>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Categories;
