import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShoppingCart, Mail, User, Phone } from "lucide-react";
import { useCheckout } from "@/hooks/useCheckout";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  projectPrice: number;
  onSuccess: (data: { order_id: string; project_title: string; download_url: string }) => void;
}

const CheckoutDialog = ({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  projectPrice,
  onSuccess,
}: CheckoutDialogProps) => {
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const { isCreatingOrder, isVerifying, error, startCheckout } = useCheckout();

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    const re = /^[+]?[\d\s-]{7,15}$/;
    return re.test(phone.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    setPhoneError("");

    if (!validateEmail(buyerEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (!validatePhone(buyerPhone)) {
      setPhoneError("Please enter a valid phone number (7-15 digits)");
      return;
    }

    startCheckout(
      projectId,
      buyerEmail,
      buyerName,
      buyerPhone.trim(),
      (data) => {
        onOpenChange(false);
        onSuccess(data);
      },
      (errMsg) => {
        console.error("Checkout failed:", errMsg);
      }
    );
  };

  const isLoading = isCreatingOrder || isVerifying;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">
            Complete Your Purchase
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter your details below to purchase <span className="font-medium text-foreground">{projectTitle}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Price display */}
          <div className="rounded-lg bg-secondary p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="font-display text-3xl font-bold text-primary mt-1">
              ₹{projectPrice.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">One-time payment • Instant download</p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="buyer-name" className="text-foreground text-sm flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Full Name
            </Label>
            <Input
              id="buyer-name"
              placeholder="John Doe"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="bg-secondary border-border"
              disabled={isLoading}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="buyer-email" className="text-foreground text-sm flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="buyer-email"
              type="email"
              placeholder="you@example.com"
              value={buyerEmail}
              onChange={(e) => {
                setBuyerEmail(e.target.value);
                setEmailError("");
              }}
              className="bg-secondary border-border"
              required
              disabled={isLoading}
            />
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Download link will be sent to this email
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="buyer-phone" className="text-foreground text-sm flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              Contact Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="buyer-phone"
              type="tel"
              placeholder="+91 9876543210"
              value={buyerPhone}
              onChange={(e) => {
                setBuyerPhone(e.target.value);
                setPhoneError("");
              }}
              className="bg-secondary border-border"
              required
              disabled={isLoading}
            />
            {phoneError && (
              <p className="text-xs text-destructive">{phoneError}</p>
            )}
          </div>

          {/* Error */}
          {error && error !== "Payment cancelled" && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="hero"
            className="w-full h-12 text-base"
            disabled={isLoading || !buyerEmail || !buyerPhone}
          >
            {isCreatingOrder ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Order...
              </>
            ) : isVerifying ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Verifying Payment...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-5 w-5" />
                Pay ₹{projectPrice.toLocaleString()}
              </>
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            🔒 Secure payment via Razorpay • 256-bit encryption
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutDialog;
