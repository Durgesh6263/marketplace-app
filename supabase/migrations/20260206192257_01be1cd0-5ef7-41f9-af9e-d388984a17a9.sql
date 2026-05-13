
-- Create orders table for tracking real payments
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  buyer_email text NOT NULL,
  buyer_name text NOT NULL DEFAULT '',
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Only allow reading orders via edge functions (admin) — no public read
CREATE POLICY "No public read on orders"
ON public.orders
FOR SELECT
USING (false);

-- Allow insert from edge function (service role bypasses RLS anyway)
-- No public insert needed

-- Trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-increment total_sales on projects when order is paid
CREATE OR REPLACE FUNCTION public.increment_project_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> 'paid') THEN
    UPDATE public.projects
    SET total_sales = COALESCE(total_sales, 0) + 1
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-increment sales on payment success
CREATE TRIGGER trg_increment_sales_on_payment
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.increment_project_sales();

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
