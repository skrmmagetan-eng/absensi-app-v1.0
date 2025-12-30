-- RESET RLS (Hapus policy lama agar tidak error)
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
DROP POLICY IF EXISTS "Auth Insert Products" ON public.products;
DROP POLICY IF EXISTS "Auth Update Products" ON public.products;
DROP POLICY IF EXISTS "Auth Delete Products" ON public.products;

-- Setup Ulang Policy yang Benar
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 1. Izinkan SEMUA orang (termasuk user aplikasi) untuk MELIHAT produk
CREATE POLICY "Public Read Products" 
ON public.products FOR SELECT 
USING (true);

-- 2. Izinkan USER YANG LOGIN (Authenticated) untuk MENAMBAH produk
CREATE POLICY "Auth Insert Products" 
ON public.products FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- 3. Izinkan USER YANG LOGIN untuk UPDATE & DELETE
CREATE POLICY "Auth Update Products" 
ON public.products FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Auth Delete Products" 
ON public.products FOR DELETE 
USING (auth.role() = 'authenticated');

--------------------------------------------------------------
-- STORAGE POLICIES (Bucket: app-assets)
--------------------------------------------------------------
-- Pastikan bucket ada
INSERT INTO storage.buckets (id, name, public) 
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Reset Policy Storage Lama
DROP POLICY IF EXISTS "Public Access Bucket" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Bucket" ON storage.objects;

-- Buat Policy Storage Baru
CREATE POLICY "Public Access Bucket"
ON storage.objects FOR SELECT
USING ( bucket_id = 'app-assets' );

CREATE POLICY "Auth Upload Bucket"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'app-assets' AND auth.role() = 'authenticated' );
