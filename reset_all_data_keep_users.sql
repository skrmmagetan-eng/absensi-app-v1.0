-- Reset All Data Tables (Keep Specific Users Only)
-- Run this in Supabase SQL Editor

-- 1. DELETE ALL DATA FROM RELATED TABLES FIRST (to avoid foreign key constraints)
DELETE FROM public.customer_visits;
DELETE FROM public.attendance;
DELETE FROM public.orders;
DELETE FROM public.sales_plans;
DELETE FROM public.products;

-- 2. DELETE ALL CUSTOMERS
DELETE FROM public.customers;

-- 3. DELETE USERS EXCEPT THE ONES TO KEEP
DELETE FROM public.users 
WHERE email NOT IN (
    'skrmmagetan@gmail.com',
    'manager@skrm.com', 
    'wicaksonopurwanto@gmail.com',
    'anggaskharisma@gmail.com',
    'mazis977@gmail.com',
    'achmadverry20@gmail.com',
    'dwikydiaspriambodo@gmail.com'
);

-- 4. UPDATE EXISTING USERS WITH CORRECT DATA
UPDATE public.users SET 
    name = 'Admin SKRM',
    role = 'admin',
    status = 'active'
WHERE email = 'skrmmagetan@gmail.com';

UPDATE public.users SET 
    name = 'Manager',
    role = 'manager', 
    status = 'active'
WHERE email = 'manager@skrm.com';

UPDATE public.users SET 
    name = 'Purwanto',
    role = 'employee',
    status = 'active'
WHERE email = 'wicaksonopurwanto@gmail.com';

UPDATE public.users SET 
    name = 'Angga Septian Kharisma',
    role = 'employee',
    status = 'active'
WHERE email = 'anggaskharisma@gmail.com';

UPDATE public.users SET 
    name = 'Miftakhul Azis',
    role = 'employee',
    status = 'active'
WHERE email = 'mazis977@gmail.com';

UPDATE public.users SET 
    name = 'Achmad Verry Trisnanto',
    role = 'employee',
    status = 'active'
WHERE email = 'achmadverry20@gmail.com';

UPDATE public.users SET 
    name = 'Dwiky Dias Priambodo',
    role = 'employee',
    status = 'active'
WHERE email = 'dwikydiaspriambodo@gmail.com';

-- 5. VERIFY REMAINING USERS
SELECT id, email, name, role, status, created_at 
FROM public.users 
ORDER BY role, name;

-- 6. RESET SEQUENCES (Optional - to start IDs from 1 again)
-- Note: Only run if you want to reset auto-increment counters
-- ALTER SEQUENCE customers_id_seq RESTART WITH 1;
-- ALTER SEQUENCE products_id_seq RESTART WITH 1;