-- 1. Add digital_product_id to coupons
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS digital_product_id uuid;

-- 2. Add coupon tracking to digital_product_purchases
ALTER TABLE public.digital_product_purchases
  ADD COLUMN IF NOT EXISTS coupon_id uuid,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

-- 3. Download counter on files
ALTER TABLE public.digital_product_files
  ADD COLUMN IF NOT EXISTS download_count integer NOT NULL DEFAULT 0;

-- 4. Download logs table
CREATE TABLE IF NOT EXISTS public.digital_product_download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  digital_product_id uuid NOT NULL,
  file_id uuid NOT NULL,
  student_id uuid NOT NULL,
  file_title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dp_download_logs_tenant ON public.digital_product_download_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dp_download_logs_product ON public.digital_product_download_logs(digital_product_id);
CREATE INDEX IF NOT EXISTS idx_dp_download_logs_student ON public.digital_product_download_logs(student_id);

ALTER TABLE public.digital_product_download_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all download logs"
  ON public.digital_product_download_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Mentors view own tenant download logs"
  ON public.digital_product_download_logs FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE POLICY "Students view own download logs"
  ON public.digital_product_download_logs FOR SELECT
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

CREATE POLICY "Students insert own download logs"
  ON public.digital_product_download_logs FOR INSERT
  WITH CHECK (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));

-- 5. Atomic increment function for file download counter
CREATE OR REPLACE FUNCTION public.increment_dp_file_download(_file_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.digital_product_files
  SET download_count = download_count + 1
  WHERE id = _file_id;
END;
$$;