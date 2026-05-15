import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useProject } from "@/hooks/useProjects";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ArrowLeft, CheckCircle, Play, Loader2 } from "lucide-react";
import StarRating from "@/components/projects/StarRating";
import { motion } from "framer-motion";
import CheckoutDialog from "@/components/checkout/CheckoutDialog";
import PaymentSuccessModal from "@/components/checkout/PaymentSuccessModal";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const getYouTubeId = (url?: string) => {
  if (!url) return null;
  const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regExp);
  return match ? match[1] : null;
};
const ProjectDetail = () => {
  const { id } = useParams();
  const { data: project, isLoading } = useProject(id || "");

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [successData, setSuccessData] = useState<{
    order_id: string;
    project_title: string;
    download_url: string;
  } | null>(null);



  const videoId = getYouTubeId(project?.demoVideoUrl);
  console.log("Demo Video Debug:", {
    rawUrl: project?.demoVideoUrl,
    parsedVideoId: videoId
  });
  console.log("Gallery Images Debug:", project?.projectImages);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <div className="text-center space-y-4">
            <h1 className="font-display text-2xl font-bold text-foreground">Project Not Found</h1>
            <Button variant="hero" asChild>
              <Link to="/projects">Browse Projects</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container mx-auto px-4">
          {/* Back button */}
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Projects
          </Link>

          <div className="grid gap-10 lg:grid-cols-3">
            {/* Left: Details */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 space-y-8"
            >
              {/* Main Large Preview Area */}
              {project.demoVideoUrl ? (
                videoId ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <button className="relative w-full aspect-video overflow-hidden rounded-xl border border-border bg-card cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary/50">
                        <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-colors group-hover:bg-black/50">
                          <div className="text-center space-y-3">
                            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
                              <Play className="h-8 w-8 ml-1" />
                            </div>
                            <p className="text-white font-medium drop-shadow-md">Watch Demo Video</p>
                          </div>
                        </div>
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl w-[90vw] bg-background/95 backdrop-blur-md border-border p-1 overflow-hidden">
                      <iframe
                        className="w-full aspect-video rounded-md"
                        src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <button 
                    onClick={() => window.open(project.demoVideoUrl, "_blank")}
                    className="relative w-full aspect-video overflow-hidden rounded-xl border border-border bg-card cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center transition-colors group-hover:bg-black/50">
                      <div className="text-center space-y-3">
                        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
                          <Play className="h-8 w-8 ml-1" />
                        </div>
                        <p className="text-white font-medium drop-shadow-md">Open External Video</p>
                      </div>
                    </div>
                  </button>
                )
              ) : (
                <div className="relative w-full aspect-video overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                  <img src={project.thumbnail} alt={project.title} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Screenshots Gallery Below */}
              {project.projectImages && project.projectImages.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-display text-xl font-bold text-foreground mb-4">Screenshots</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {project.projectImages.map((url, i) => (
                      <Dialog key={i}>
                        <DialogTrigger asChild>
                          <button className="relative aspect-video overflow-hidden rounded-xl border border-border bg-secondary transition-all hover:opacity-90 hover:ring-2 hover:ring-primary/50 focus:outline-none shadow-sm group">
                            <img src={url} alt={`${project.title} screenshot ${i + 1}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl w-[90vw] bg-background/95 backdrop-blur-md border-border p-1 overflow-hidden">
                          <img src={url} alt={`${project.title} screenshot ${i + 1}`} className="w-full h-auto max-h-[85vh] object-contain rounded-md" />
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-3">Description</h3>
                <p className="text-muted-foreground leading-relaxed">{project.description}</p>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-3">Features</h3>
                <div className="grid grid-cols-2 gap-2">
                  {project.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Right: Purchase card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="sticky top-24 space-y-6 rounded-xl border border-border bg-card p-6">
                {/* Category */}
                <Badge variant="secondary" className="bg-primary/10 text-primary border-0">
                  {project.category}
                </Badge>

                {/* Title */}
                <h1 className="font-display text-2xl font-bold text-foreground">{project.title}</h1>

                {/* Rating */}
                <StarRating
                  projectId={project.id}
                  currentRating={project.rating}
                  totalRatings={project.totalRatings}
                />
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{project.totalSales}</span> sales
                </div>

                {/* Price */}
                <div className="border-t border-b border-border py-4">
                  <p className="font-display text-3xl font-bold text-primary">
                    ₹{project.price.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">One-time payment, lifetime access</p>
                </div>

                {/* Buy button */}
                <Button
                  variant="hero"
                  className="w-full h-12 text-base"
                  onClick={() => setCheckoutOpen(true)}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Buy Now
                </Button>

                {/* Tech stack */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Tech Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-md bg-secondary px-2.5 py-1 text-xs text-secondary-foreground"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>✓ Instant download after payment</p>
                  <p>✓ Secure Google Drive link</p>
                  <p>✓ Download link expires in 5 minutes</p>
                  <p>✓ Email confirmation included</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Checkout Dialog */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        projectId={project.id}
        projectTitle={project.title}
        projectPrice={project.price}
        onSuccess={(data) => setSuccessData(data)}
      />

      {/* Payment Success Modal */}
      <PaymentSuccessModal
        open={!!successData}
        onOpenChange={(open) => { if (!open) setSuccessData(null); }}
        projectTitle={successData?.project_title || ""}
        downloadUrl={successData?.download_url || ""}
        orderId={successData?.order_id || ""}
      />
    </div>
  );
};

export default ProjectDetail;
