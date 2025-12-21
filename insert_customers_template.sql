-- Template Insert Customers - Ganti dengan Data Real Anda
-- Run this in Supabase SQL Editor after duplicate cleanup

-- Step 1: Verify employees are available
SELECT id, name, email, role FROM public.users WHERE role = 'employee' ORDER BY name;

-- Step 2: Insert your real customer data
INSERT INTO public.customers (name, phone, address, employee_id, latitude, longitude, notes, created_at) VALUES

-- PELANGGAN PURWANTO (wicaksonopurwanto@gmail.com)
-- Ganti data di bawah ini dengan pelanggan real Purwanto:
('NAMA_PELANGGAN_1', 'TELEPON_1', 'ALAMAT_LENGKAP_1', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), LATITUDE_1, LONGITUDE_1, 'CATATAN_1', NOW()),
('NAMA_PELANGGAN_2', 'TELEPON_2', 'ALAMAT_LENGKAP_2', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), LATITUDE_2, LONGITUDE_2, 'CATATAN_2', NOW()),
('NAMA_PELANGGAN_3', 'TELEPON_3', 'ALAMAT_LENGKAP_3', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), LATITUDE_3, LONGITUDE_3, 'CATATAN_3', NOW()),

-- PELANGGAN ANGGA (anggaskharisma@gmail.com)  
-- Ganti data di bawah ini dengan pelanggan real Angga:
('NAMA_PELANGGAN_4', 'TELEPON_4', 'ALAMAT_LENGKAP_4', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), LATITUDE_4, LONGITUDE_4, 'CATATAN_4', NOW()),
('NAMA_PELANGGAN_5', 'TELEPON_5', 'ALAMAT_LENGKAP_5', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), LATITUDE_5, LONGITUDE_5, 'CATATAN_5', NOW()),

-- PELANGGAN MIFTAKHUL AZIS (mazis977@gmail.com)
-- Ganti data di bawah ini dengan pelanggan real Miftakhul:
('NAMA_PELANGGAN_6', 'TELEPON_6', 'ALAMAT_LENGKAP_6', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), LATITUDE_6, LONGITUDE_6, 'CATATAN_6', NOW()),
('NAMA_PELANGGAN_7', 'TELEPON_7', 'ALAMAT_LENGKAP_7', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), LATITUDE_7, LONGITUDE_7, 'CATATAN_7', NOW()),

-- PELANGGAN ACHMAD VERRY (achmadverry20@gmail.com)
-- Ganti data di bawah ini dengan pelanggan real Achmad Verry:
('NAMA_PELANGGAN_8', 'TELEPON_8', 'ALAMAT_LENGKAP_8', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), LATITUDE_8, LONGITUDE_8, 'CATATAN_8', NOW()),
('NAMA_PELANGGAN_9', 'TELEPON_9', 'ALAMAT_LENGKAP_9', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), LATITUDE_9, LONGITUDE_9, 'CATATAN_9', NOW()),

-- PELANGGAN DWIKY DIAS (dwikydiaspriambodo@gmail.com)
-- Ganti data di bawah ini dengan pelanggan real Dwiky:
('NAMA_PELANGGAN_10', 'TELEPON_10', 'ALAMAT_LENGKAP_10', (SELECT id FROM users WHERE email = 'dwikydiaspriambodo@gmail.com' LIMIT 1), LATITUDE_10, LONGITUDE_10, 'CATATAN_10', NOW()),
('NAMA_PELANGGAN_11', 'TELEPON_11', 'ALAMAT_LENGKAP_11', (SELECT id FROM users WHERE email = 'dwikydiaspriambodo@gmail.com' LIMIT 1), LATITUDE_11, LONGITUDE_11, 'CATATAN_11', NOW());

-- Step 3: Verify inserted customers
SELECT 
    c.name as customer_name,
    c.phone,
    c.address,
    u.name as employee_name,
    c.latitude,
    c.longitude,
    c.notes,
    c.created_at
FROM public.customers c
JOIN public.users u ON c.employee_id = u.id
ORDER BY u.name, c.name;

/*
PANDUAN PENGISIAN:
1. Ganti NAMA_PELANGGAN_X dengan nama pelanggan real
2. Ganti TELEPON_X dengan nomor telepon (atau NULL jika tidak ada)
3. Ganti ALAMAT_LENGKAP_X dengan alamat lengkap
4. Ganti LATITUDE_X, LONGITUDE_X dengan koordinat GPS (atau NULL jika tidak ada)
5. Ganti CATATAN_X dengan catatan (atau NULL jika tidak ada)

CONTOH:
('Pak Sukadi', '081234567890', 'Jl. Raya Desa Sukamaju No. 15, Ponorogo', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), -7.668678, 111.287454, 'Peternak broiler 5000 ekor', NOW()),

JIKA TIDAK ADA KOORDINAT GPS:
('Pak Sukadi', '081234567890', 'Jl. Raya Desa Sukamaju No. 15, Ponorogo', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), NULL, NULL, 'Peternak broiler 5000 ekor', NOW()),
*/