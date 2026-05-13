import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Download, Mail } from "lucide-react";
import { motion } from "framer-motion";

interface PaymentSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectTitle: string;
  downloadUrl: string;
  orderId: string;
}

const PaymentSuccessModal = ({
  open,
  onOpenChange,
  projectTitle,
  downloadUrl,
  orderId,
}: PaymentSuccessModalProps) => {
  const handleDownload = () => {
    if (downloadUrl && downloadUrl !== "") {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card text-center">
        <DialogHeader className="items-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mx-auto mb-2"
          >
            <CheckCircle className="h-10 w-10 text-primary" />
          </motion.div>
          <DialogTitle className="font-display text-2xl text-foreground">
            Payment Successful! 🎉
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-base mt-2">
            You've successfully purchased <span className="font-medium text-foreground">{projectTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Download button */}
          <Button
            variant="hero"
            className="w-full h-12 text-base"
            onClick={handleDownload}
            disabled={!downloadUrl}
          >
            <Download className="mr-2 h-5 w-5" />
            {downloadUrl ? "Download Project" : "Download link not available yet"}
          </Button>

          {/* Email notice */}
          <div className="rounded-lg bg-secondary p-4 flex items-start gap-3 text-left">
            <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Check your email</p>
              <p className="text-xs text-muted-foreground mt-1">
                A download link has also been sent to your email address. The link expires in 5 minutes for security.
              </p>
            </div>
          </div>

          {/* Order ID */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Order ID: <span className="font-mono text-foreground/70">{orderId}</span></p>
            <p>✓ Instant download after payment</p>
            <p>✓ Lifetime access to the project</p>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Continue Browsing
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentSuccessModal;
