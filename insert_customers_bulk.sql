-- Bulk Insert Customers Data
-- Run this in Supabase SQL Editor after reset_all_data_keep_users.sql

-- First, check available employees and their IDs
SELECT id, name, email, role FROM public.users WHERE role = 'employee' ORDER BY name;

-- Example bulk insert customers (replace with your actual data)
-- Using LIMIT 1 to avoid "more than one row" error

INSERT INTO public.customers (name, phone, address, employee_id, latitude, longitude, notes, created_at) VALUES
-- Assign to Purwanto
('Pak Sukadi', '081234567890', 'Jl. Raya No. 1, Ponorogo', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), -7.668678, 111.287454, 'Peternak broiler', NOW()),
('Adul Kodir', '081234567891', 'Jl. Merdeka No. 2, Ponorogo', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), -7.639640, 111.330534, 'Peternak layer', NOW()),
('Budi Santoso', '081234567892', 'Jl. Sudirman No. 3, Ponorogo', (SELECT id FROM users WHERE email = 'wicaksonopurwanto@gmail.com' LIMIT 1), -7.633924, 111.289592, 'Peternak koloni', NOW()),

-- Assign to Angga
('Siti Aminah', '081234567893', 'Jl. Ahmad Yani No. 4, Ponorogo', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), -7.640000, 111.290000, 'Peternak ayam kampung', NOW()),
('Joko Widodo', '081234567894', 'Jl. Gatot Subroto No. 5, Ponorogo', (SELECT id FROM users WHERE email = 'anggaskharisma@gmail.com' LIMIT 1), -7.650000, 111.300000, 'Peternak bebek', NOW()),

-- Assign to Miftakhul Azis
('Rina Sari', '081234567895', 'Jl. Diponegoro No. 6, Ponorogo', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), -7.660000, 111.310000, 'Peternak burung puyuh', NOW()),
('Ahmad Fauzi', '081234567896', 'Jl. Kartini No. 7, Ponorogo', (SELECT id FROM users WHERE email = 'mazis977@gmail.com' LIMIT 1), -7.670000, 111.320000, 'Peternak lele', NOW()),

-- Assign to Achmad Verry
('Dewi Sartika', '081234567897', 'Jl. Cut Nyak Dien No. 8, Ponorogo', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), -7.680000, 111.330000, 'Peternak gurame', NOW()),
('Bambang Sutrisno', '081234567898', 'Jl. Pangeran Antasari No. 9, Ponorogo', (SELECT id FROM users WHERE email = 'achmadverry20@gmail.com' LIMIT 1), -7.690000, 111.340000, 'Peternak nila', NOW()),

-- Assign to Dwiky Dias
('Sari Indah', '081234567899', 'Jl. Veteran No. 10, Ponorogo', (SELECT id FROM users WHERE email = 'dwikydiaspriambodo@gmail.com' LIMIT 1), -7.700000, 111.350000, 'Peternak kambing', NOW()),
('Hendra Gunawan', '081234567900', 'Jl. Pemuda No. 11, Ponorogo', (SELECT id FROM users WHERE email = 'dwikydiaspriambodo@gmail.com' LIMIT 1), -7.710000, 111.360000, 'Peternak sapi', NOW());

-- Verify inserted customers
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