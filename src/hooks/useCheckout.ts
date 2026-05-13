import { useState, useCallback } from "react";

interface OrderResponse {
  order_id: string;
  razorpay_order_id: string;
  razorpay_key_id: string;
  amount: number;
  currency: string;
  project_title: string;
}

interface VerifyResponse {
  success: boolean;
  order_id: string;
  project_title: string;
  download_url: string;
}

interface CheckoutState {
  isCreatingOrder: boolean;
  isVerifying: boolean;
  error: string | null;
}

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (document.getElementById("razorpay-checkout-script")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.id = "razorpay-checkout-script";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const useCheckout = () => {
  const [state, setState] = useState<CheckoutState>({
    isCreatingOrder: false,
    isVerifying: false,
    error: null,
  });

  const createOrder = useCallback(
    async (projectId: string, buyerEmail: string, buyerName: string, buyerPhone: string): Promise<OrderResponse> => {
      const response = await fetch('/api/createOrder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, buyer_email: buyerEmail, buyer_name: buyerName, buyer_phone: buyerPhone })
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Failed to create order');
      return data as OrderResponse;
    },
    []
  );

  const verifyPayment = useCallback(
    async (params: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      order_id: string;
    }): Promise<VerifyResponse> => {
      const response = await fetch('/api/verifyPayment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || 'Verification failed');
      return data as VerifyResponse;
    },
    []
  );

  const startCheckout = useCallback(
    async (
      projectId: string,
      buyerEmail: string,
      buyerName: string,
      buyerPhone: string,
      onSuccess: (data: VerifyResponse) => void,
      onFailure?: (error: string) => void
    ) => {
      setState({ isCreatingOrder: true, isVerifying: false, error: null });

      try {
        const orderData = await createOrder(projectId, buyerEmail, buyerName, buyerPhone);

        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Failed to load payment gateway. Please try again.");
        }

        setState({ isCreatingOrder: false, isVerifying: false, error: null });

        const options = {
          key: orderData.razorpay_key_id,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "ProjectStore",
          description: `Purchase: ${orderData.project_title}`,
          order_id: orderData.razorpay_order_id,
          prefill: {
            email: buyerEmail,
            name: buyerName,
            contact: buyerPhone,
          },
          theme: {
            color: "#16a34a",
          },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            setState({ isCreatingOrder: false, isVerifying: true, error: null });
            try {
              const verifyData = await verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                order_id: orderData.order_id,
              });
              setState({ isCreatingOrder: false, isVerifying: false, error: null });
              onSuccess(verifyData);
            } catch (verifyErr: any) {
              const errMsg = verifyErr.message || "Payment verification failed";
              setState({ isCreatingOrder: false, isVerifying: false, error: errMsg });
              onFailure?.(errMsg);
            }
          },
          modal: {
            ondismiss: () => {
              setState({ isCreatingOrder: false, isVerifying: false, error: "Payment cancelled" });
              onFailure?.("Payment cancelled by user");
            },
          },
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      } catch (err: any) {
        const errMsg = err.message || "Something went wrong";
        setState({ isCreatingOrder: false, isVerifying: false, error: errMsg });
        onFailure?.(errMsg);
      }
    },
    [createOrder, verifyPayment]
  );

  return {
    ...state,
    startCheckout,
  };
};
