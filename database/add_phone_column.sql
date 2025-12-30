-- =====================================================
-- TAMBAH KOLOM PHONE KE TABEL USERS
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- 1. Cek struktur tabel users saat ini
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Tambah kolom phone jika belum ada
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- 3. Tambah kolom status jika belum ada (untuk konsistensi)
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 4. Update data karyawan dengan nomor telepon
-- Ganti nomor telepon sesuai data real karyawan

-- Achmad Verry Trisnanto
UPDATE users SET phone = '081234567890' 
WHERE email = 'achmadverry20@gmail.com';

-- Angga Septian Kharisma  
UPDATE users SET phone = '081234567891'
WHERE email = 'anggaskharisma@gmail.com';

-- Dwiky Dias Priambodo
UPDATE users SET phone = '081234567892'
WHERE email = 'dwikydiaspriambodo@gmail.com';

-- Miftakhul Azis
UPDATE users SET phone = '081234567893'
WHERE email = 'mazis977@gmail.com';

-- Purwanto
UPDATE users SET phone = '081234567894'
WHERE email = 'wicaksonopurwanto@gmail.com';

-- Shaka Abrisam (Manager) - gunakan nomor real yang sudah diedit
UPDATE users SET phone = '085739605089'
WHERE email = 'shakadigital.id@gmail.com';

-- 5. Cek hasil update
SELECT id, email, name, role, phone, status
FROM users
ORDER BY role, name;

-- 6. Buat index untuk kolom phone (optional, untuk performance)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- SUCCESS MESSAGE
SELECT 'SUCCESS: Kolom phone berhasil ditambahkan ke tabel users!' as status;