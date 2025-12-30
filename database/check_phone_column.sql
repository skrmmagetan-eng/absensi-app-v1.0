-- =====================================================
-- CEK APAKAH KOLOM PHONE SUDAH BERHASIL DITAMBAHKAN
-- =====================================================

-- 1. Cek struktur tabel users
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Cek data karyawan dengan kolom phone
SELECT 
    name,
    email, 
    phone,
    role,
    CASE 
        WHEN phone IS NULL THEN '❌ Kosong'
        WHEN LENGTH(phone) < 10 THEN '⚠️ Terlalu pendek'
        WHEN LENGTH(phone) > 15 THEN '⚠️ Terlalu panjang'
        ELSE '✅ OK'
    END as phone_status
FROM users
WHERE role IN ('employee', 'manager')
ORDER BY role, name;

-- 3. Cek khusus data Shaka Abrisam
SELECT 
    name,
    email,
    phone,
    role,
    created_at
FROM users 
WHERE email = 'shakadigital.id@gmail.com';

-- 4. Update nomor Shaka jika belum ada
UPDATE users SET phone = '085156789012'
WHERE email = 'shakadigital.id@gmail.com' AND phone IS NULL;

-- 5. Cek hasil update
SELECT 
    'Shaka Abrisam' as karyawan,
    phone as nomor_telepon,
    CASE 
        WHEN phone = '085156789012' THEN '✅ Nomor sudah benar'
        WHEN phone IS NULL THEN '❌ Nomor masih kosong'
        ELSE '⚠️ Nomor berbeda: ' || phone
    END as status
FROM users 
WHERE email = 'shakadigital.id@gmail.com';