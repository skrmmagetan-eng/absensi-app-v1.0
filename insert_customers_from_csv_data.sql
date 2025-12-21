-- Insert Customers from DataPelanggan.csv
-- Run this in Supabase SQL Editor after duplicate cleanup

-- Step 1: Verify employees are available
SELECT id, name, email, role FROM public.users WHERE role = 'employee' ORDER BY name;

-- Step 2: Insert customers based on actual CSV data
-- Note: This creates unique customers by combining name and location to avoid duplicates

INSERT INTO public.customers (name, phone, address, employee_id, latitude, longitude, notes, created_at) VALUES

-- PELANGGAN PURWANTO (wicaksonopurwanto@gmail.com)
('Adul Kodir', NULL, 'Jl Kelengkeng no 25, Gadungan, Gadungan, Pare', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), -7.932978, 112.534317, 'Populasi: 5, Pakan: 324AT', NOW()),
('Pak Sukadi', NULL, 'Jalan Durenan, Durenan, Sidorejo, Magetan', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), -7.668678, 111.287454, 'Populasi: 45, Pakan: CP', NOW()),
('Budi', NULL, 'Sidokerto, Sidokerto, Sidorejo, Magetan', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), -7.638533, 111.291036, 'Populasi: 5, Pakan: Klks 36', NOW()),
('Harsih', NULL, 'Tanjungsari, Tanjungsari, Panekan, Magetan', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), -7.633924, 111.289592, 'Populasi: 2, Pakan: Klks', NOW()),
('Pak Supri', NULL, 'Dukuh njati. Plangkrogan, Plangkrongan, Poncol, Magetan', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), -7.711093, 111.258606, 'Populasi: 1.3, Pakan: Klks 36 Spr', NOW()),
('Septian eko', NULL, 'Truneng alastuwo, Alastuwo, Poncol, Magetan', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), -7.711663, 111.242284, 'Populasi: 1.5, Pakan: Klks 36', NOW()),
('Wawan ngrobyong', NULL, 'Ngrobyong, Desa sidomulyo, Sidorejo, Magetan', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), NULL, NULL, 'Populasi: 1.5, Pakan: Klks 36 SPR', NOW()),
('Bu khoiri', NULL, 'Plaosan, Plaosan, Plaosan, Magetan', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), -7.676390, 111.255942, 'Populasi: 25, Pakan: 124P', NOW()),
('Lilis', NULL, 'Bulugunung, Sepring, Plaosan, Magetan', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), -7.698743, 111.266567, 'Populasi: 2, Pakan: 124Prima', NOW()),
('Pak padhi Randugede', NULL, 'Kandang slorok, Randugede, Plaosan, Magetan', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), -7.683355, 111.288415, 'Populasi: 3, Pakan: Klks 36 Spr', NOW()),

-- PELANGGAN ANGGA (anggaskharisma@gmail.com)  
('Rohman', NULL, 'Pasuruan, Pasuruan, Pasuruan, Pasuruan', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), -7.635564, 111.329247, 'Populasi: 50, Pakan: 124P', NOW()),
('Jono SUB', NULL, 'Turi, Turi, Panekan, Magetan', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), -7.606602, 111.297049, 'Populasi: 0, Pakan: Comfeed', NOW()),
('Purwanto', NULL, 'Manjung, Manjung, Panekan, Magetan', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), NULL, NULL, 'Populasi: 6, Pakan: KLKS 36 SPR', NOW()),
('Bayu', NULL, 'Sadon, Cepoko, Panekan, Magetan', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), -7.617465, 111.284789, 'Populasi: 40, Pakan: CP124P', NOW()),
('Mutik', NULL, 'Wates Jabung, Jabung, Panekan, Magetan', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), -7.606520, 111.283468, 'Populasi: 40, Pakan: KLKS 36', NOW()),
('Nurul', NULL, 'Wates Jabung, Jabung, Panekan, Magetan', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), -7.610769, 111.278354, 'Populasi: 3, Pakan: KLKS 36', NOW()),
('Gilang', NULL, 'Sedalem, Sedalem, Panekan, Magetan', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), -7.618359, 111.282607, 'Populasi: 2, Pakan: New Hope', NOW()),
('Yudi', NULL, 'Sedalem, Sedalem, Panekan, Magetan', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), -7.618422, 111.282570, 'Populasi: 1, Pakan: KLKS 36', NOW()),
('Ilham', NULL, 'Ngiliran, Ngiliran, Panekan, Magetan', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), -7.613739, 111.267212, 'Populasi: 1.5, Pakan: Selmix', NOW()),
('Pardi', NULL, 'Ngiliran, Ngiliran, Panekan, Magetan', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), -7.613023, 111.268154, 'Populasi: 5, Pakan: KLKS 36', NOW()),

-- PELANGGAN MIFTAKHUL AZIS (mazis977@gmail.com)
('Sarno', NULL, 'Baleasri RT 01 RW 04, Duwet sewu, Ngariboyo, Magetan', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), -7.682900, 111.313933, 'Populasi: 3, Pakan: Cp124p', NOW()),
('Franky', NULL, 'RT 05 RW 01, Banjarpanjang, Ngariboyo, Magetan', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), -7.726532, 111.367410, 'Populasi: 2.5, Pakan: Klks 36 SPR', NOW()),
('Gunawan', NULL, 'Desa Tamanan RT 04 RW 03, Tamanan, Sukomoro, Magetan', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), -7.649844, 111.387159, 'Populasi: 600, Pakan: Klks 36', NOW()),
('Kuat', NULL, 'RT 04 RW 01, Sumberdodol, Panekan, Magetan', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), -7.629033, 111.276835, 'Populasi: 3, Pakan: Klks 36 SPR', NOW()),
('Bu surawan', NULL, 'Wates, Wates, Panekan, Magetan', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), NULL, NULL, 'Populasi: 7, Pakan: CP 124P', NOW()),
('Iin', NULL, 'RT 01 RW 02, Simo, Kendal, Ngawi', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), NULL, NULL, 'Populasi: 800, Pakan: Cp 124p', NOW()),
('Umi', NULL, 'RT 01 RW 02, Simo, Kendal, Ngawi', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), -7.590398, 111.292055, 'Populasi: 1.2, Pakan: CP 124P', NOW()),
('Deni/kening', NULL, 'Dusun gilis RT 03 RW 01, Ploso, Kendal, Ngawi', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), -7.585607, 111.291366, 'Populasi: 2, Pakan: 324KJ', NOW()),
('Amin', NULL, 'RT 04 RW 02, Kentangan, Sukomoro, Magetan', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), -7.615941, 111.355362, 'Populasi: 300, Pakan: 524AX', NOW()),
('Pak Yusuf Rado', NULL, 'Kletekan, Kletekan, Jogorogo, Ngawi', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), -7.538892, 111.231209, 'Populasi: 20, Pakan: Klks 36', NOW()),

-- PELANGGAN ACHMAD VERRY (achmadverry20@gmail.com)
('Bapak sarno', NULL, 'Baleasri Duwet Sewu RT 01 RW 04, Duwet sewu, Ngariboyo, Magetan', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), NULL, NULL, 'Populasi: 3, Pakan: Cp124p', NOW()),
('Mas Franky', NULL, 'Banjarpanjang RT 5 RW 1, Banjarpanjang, Ngariboyo, Magetan', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), -7.699495, 111.365595, 'Populasi: 2.5, Pakan: Comfeed klks 36 spr', NOW()),
('Pak Gunawan', NULL, 'Tamanan rt 4 RW 3, Tamanan, Sukomoro, Magetan', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), -7.653913, 111.389440, 'Populasi: 600, Pakan: Comfeed klks 36', NOW()),
('Bu nanik', NULL, 'Simo RT 1 RW 2, Simo, Kendal, Ngawi', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), -7.590428, 111.292045, 'Populasi: 1, Pakan: 124 p', NOW()),
('Bu umi', NULL, 'Simo RT 1 RW 2, Simo, Kendal, Ngawi', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), -7.607250, 111.291023, 'Populasi: 1, Pakan: 124p', NOW()),
('Bu iin', NULL, 'Simo RT 1 RW 2, Simo, Kendal, Ngawi', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), -7.590393, 111.291919, 'Populasi: 1, Pakan: Cp 124p', NOW()),
('Pak keneng/pak Dani', NULL, 'Ploso babadan RT 3 RW 1, Ploso, Kendal, Ngawi', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), -7.585496, 111.291320, 'Populasi: 2, Pakan: 324 kj', NOW()),
('Pak amin', NULL, 'Kentangan RT 4 RW 2, Kentangan, Sukomoro, Magetan', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), -7.615626, 111.355359, 'Populasi: 300, Pakan: Cp 524ax', NOW()),
('Mas nurul', NULL, 'Kidul simatan Sidowayah, Simatan, Panekan, Magetan', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), NULL, NULL, 'Populasi: 2.5, Pakan: Klks 36', NOW()),
('Mbak ina', NULL, 'Simatan, Simatan, Panekan, Magetan', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), -7.604056, 111.322329, 'Populasi: 1, Pakan: Klks 36', NOW());

-- Step 3: Verify inserted customers
SELECT 
    c.name as customer_name,
    c.address,
    u.name as employee_name,
    c.latitude,
    c.longitude,
    c.notes,
    c.created_at
FROM public.customers c
JOIN public.users u ON c.employee_id = u.id
ORDER BY u.name, c.name;

-- Step 4: Count customers per employee
SELECT 
    u.name as employee_name,
    COUNT(c.id) as total_customers
FROM public.users u
LEFT JOIN public.customers c ON u.id = c.employee_id
WHERE u.role = 'employee'
GROUP BY u.id, u.name
ORDER BY u.name;