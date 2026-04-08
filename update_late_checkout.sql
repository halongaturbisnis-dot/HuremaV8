-- Menambahkan kolom late_checkout_minutes ke tabel attendances
ALTER TABLE public.attendances ADD COLUMN IF NOT EXISTS late_checkout_minutes integer DEFAULT 0;
