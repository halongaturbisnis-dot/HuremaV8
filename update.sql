-- Nonaktifkan RLS untuk dispensation_requests karena login menggunakan tabel kustom
ALTER TABLE public.dispensation_requests DISABLE ROW LEVEL SECURITY;

-- Hapus policy yang sebelumnya dibuat agar bersih
DROP POLICY IF EXISTS "Users can view their own dispensation requests" ON public.dispensation_requests;
DROP POLICY IF EXISTS "Users can insert their own dispensation requests" ON public.dispensation_requests;
DROP POLICY IF EXISTS "Users can update their own pending dispensation requests" ON public.dispensation_requests;
DROP POLICY IF EXISTS "Admins can manage all dispensation requests" ON public.dispensation_requests;
