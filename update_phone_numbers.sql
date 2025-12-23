-- =====================================================
-- UPDATE NOMOR TELEPON KARYAWAN
-- Jalankan setelah kolom phone sudah ditambahkan
-- =====================================================

-- 1. Cek data karyawan saat ini
SELECT id, email, name, role, phone
FROM users
WHERE role IN ('employee', 'manager')
ORDER BY name;

-- 2. Update nomor telepon karyawan
-- Ganti dengan nomor telepon real masing-masing karyawan

-- Shaka Abrisam (Manager) - sudah ada nomor real
UPDATE users SET phone = '085156789012'
WHERE email = 'shakadigital.id@gmail.com';

-- Achmad Verry Trisnanto - ganti dengan nomor real
UPDATE users SET phone = '081234567890' 
WHERE email = 'achmadverry20@gmail.com';

-- Angga Septian Kharisma - ganti dengan nomor real
UPDATE users SET phone = '081234567891'
WHERE email = 'anggaskharisma@gmail.com';

-- Dwiky Dias Priambodo - ganti dengan nomor real
UPDATE users SET phone = '081234567892'
WHERE email = 'dwikydiaspriambodo@gmail.com';

-- Miftakhul Azis - ganti dengan nomor real
UPDATE users SET phone = '081234567893'
WHERE email = 'mazis977@gmail.com';

-- Purwanto - ganti dengan nomor real
UPDATE users SET phone = '081234567894'
WHERE email = 'wicaksonopurwanto@gmail.com';

-- 3. Cek hasil update
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

-- 4. Test format nomor telepon
SELECT 
    name,
    phone,
    -- Test format WhatsApp (hapus 0 depan, tambah 62)
    CASE 
        WHEN phone LIKE '08%' THEN CONCAT('62', SUBSTRING(phone, 2))
        WHEN phone LIKE '+62%' THEN REPLACE(phone, '+62', '62')
        WHEN phone LIKE '62%' THEN phone
        ELSE CONCAT('62', phone)
    END as whatsapp_format
FROM users
WHERE role IN ('employee', 'manager') AND phone IS NOT NULL
ORDER BY name;

-- SUCCESS MESSAGE
SELECT 'SUCCESS: Nomor telepon karyawan berhasil diupdate!' as status;