import { motion } from "framer-motion";
import ProjectCard from "@/components/projects/ProjectCard";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const FeaturedProjects = () => {
  const { data: projects = [], isLoading } = useProjects();

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 flex items-end justify-between"
        >
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">
              Featured <span className="text-gradient-green">Projects</span>
            </h2>
            <p className="mt-2 text-muted-foreground">Hand-picked projects for you</p>
          </div>
          <Button variant="outline-glow" size="sm" asChild className="hidden sm:inline-flex">
            <Link to="/projects">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </motion.div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-80 rounded-xl border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 3).map((project, index) => (
              <ProjectCard key={project.id} project={project} index={index} />
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Button variant="outline-glow" size="lg" asChild className="px-8">
            <Link to="/projects">
              View All Projects <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProjects;
