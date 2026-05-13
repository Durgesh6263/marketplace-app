import { Link } from "react-router-dom";
import { Star, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/data/mockProjects";
import { motion } from "framer-motion";

interface ProjectCardProps {
  project: Project;
  index?: number;
}

const categoryColors: Record<string, string> = {
  "Web Development": "bg-primary/10 text-primary",
  "Mobile App": "bg-blue-500/10 text-blue-400",
  "Machine Learning": "bg-purple-500/10 text-purple-400",
  "Data Science": "bg-orange-500/10 text-orange-400",
  "IoT": "bg-cyan-500/10 text-cyan-400",
  "Blockchain": "bg-yellow-500/10 text-yellow-400",
  "Game Development": "bg-red-500/10 text-red-400",
  "Desktop App": "bg-indigo-500/10 text-indigo-400",
};

const ProjectCard = ({ project, index = 0 }: ProjectCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link to={`/project/${project.id}`} className="group block">
        <div className="card-hover overflow-hidden rounded-xl border border-border bg-card">
          {/* Thumbnail */}
          <div className="relative aspect-video bg-secondary overflow-hidden">
            <div className="absolute inset-0 bg-gradient-green opacity-10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-display text-lg font-semibold text-muted-foreground">
                {project.title}
              </span>
            </div>
            {/* Category badge */}
            <div className="absolute top-3 left-3">
              <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${categoryColors[project.category] || "bg-primary/10 text-primary"}`}>
                {project.category}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5 space-y-3">
            <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
              {project.title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {project.shortDescription}
            </p>

            {/* Tech stack */}
            <div className="flex flex-wrap gap-1.5">
              {project.techStack.slice(0, 3).map((tech) => (
                <span
                  key={tech}
                  className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  {tech}
                </span>
              ))}
              {project.techStack.length > 3 && (
                <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                  +{project.techStack.length - 3}
                </span>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-primary text-primary" />
                <span className="text-sm font-medium text-foreground">{project.rating}</span>
                <span className="text-xs text-muted-foreground">({project.totalSales} sales)</span>
              </div>
              <span className="font-display text-lg font-bold text-primary">
                ₹{project.price.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProjectCard;
