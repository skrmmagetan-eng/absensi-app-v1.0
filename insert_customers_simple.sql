-- Simple and Safe Bulk Insert Customers Data
-- Run this in Supabase SQL Editor after reset_all_data_keep_users.sql

-- Step 1: First, let's check what users we have
SELECT id, name, email, role FROM public.users WHERE role IN ('employee', 'admin', 'manager') ORDER BY role, name;

-- Step 2: Clean up any duplicate users if they exist (run this if you see duplicates above)
-- DELETE FROM public.users WHERE id NOT IN (
--     SELECT MIN(id) FROM public.users GROUP BY email
-- );

-- Step 3: Get specific employee IDs (copy these UUIDs for manual insertion)
-- Replace the UUIDs below with actual IDs from Step 1

-- Method A: Insert one by one (safest approach)
-- First get the actual UUIDs:
SELECT 
    'Purwanto' as name, id, email 
FROM public.users 
WHERE email = 'wicaksonopurwanto@gmail.com' AND role = 'employee'
UNION ALL
SELECT 
    'Angga' as name, id, email 
FROM public.users 
WHERE email = 'anggaskharisma@gmail.com' AND role = 'employee'
UNION ALL
SELECT 
    'Miftakhul' as name, id, email 
FROM public.users 
WHERE email = 'mazis977@gmail.com' AND role = 'employee'
UNION ALL
SELECT 
    'Achmad Verry' as name, id, email 
FROM public.users 
WHERE email = 'achmadverry20@gmail.com' AND role = 'employee'
UNION ALL
SELECT 
    'Dwiky' as name, id, email 
FROM public.users 
WHERE email = 'dwikydiaspriambodo@gmail.com' AND role = 'employee';

-- Step 4: Manual insert (replace 'EMPLOYEE_UUID_HERE' with actual UUIDs from Step 3)
-- Example format:
/*
INSERT INTO public.customers (name, phone, address, employee_id, latitude, longitude, notes, created_at) VALUES
('Pak Sukadi', '081234567890', 'Jl. Raya No. 1, Ponorogo', 'PURWANTO_UUID_HERE', -7.668678, 111.287454, 'Peternak broiler', NOW()),
('Adul Kodir', '081234567891', 'Jl. Merdeka No. 2, Ponorogo', 'PURWANTO_UUID_HERE', -7.639640, 111.330534, 'Peternak layer', NOW()),
('Budi Santoso', '081234567892', 'Jl. Sudirman No. 3, Ponorogo', 'PURWANTO_UUID_HERE', -7.633924, 111.289592, 'Peternak koloni', NOW());

INSERT INTO public.customers (name, phone, address, employee_id, latitude, longitude, notes, created_at) VALUES
('Siti Aminah', '081234567893', 'Jl. Ahmad Yani No. 4, Ponorogo', 'ANGGA_UUID_HERE', -7.640000, 111.290000, 'Peternak ayam kampung', NOW()),
('Joko Widodo', '081234567894', 'Jl. Gatot Subroto No. 5, Ponorogo', 'ANGGA_UUID_HERE', -7.650000, 111.300000, 'Peternak bebek', NOW());

-- Continue for other employees...
*/

-- Step 5: Verify customers after insertion
SELECT 
    c.name as customer_name,
    c.phone,
    c.address,
    u.name as employee_name,
    u.email as employee_email,
    c.latitude,
    c.longitude,
    c.notes
FROM public.customers c
JOIN public.users u ON c.employee_id = u.id
ORDER BY u.name, c.name;