-- Add buyer_phone column to orders table
ALTER TABLE public.orders ADD COLUMN buyer_phone text NOT NULL DEFAULT '';
