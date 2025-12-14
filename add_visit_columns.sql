-- Tambahkan kolom bukti kunjungan ke tabel attendance
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Pastikan policy update mengizinkan user update data mereka sendiri
-- (Biasanya sudah ada, tapi kita tegaskan)
CREATE POLICY "Users can update own attendance" ON public.attendance
FOR UPDATE USING (auth.uid() = employee_id);
