-- Verification Script: Check All Users in Database
-- Run this in Supabase SQL Editor to verify user data

SELECT 
    id,
    email,
    name,
    role,
    created_at
FROM users
ORDER BY created_at ASC;

-- Expected Results:
-- 1. ee5ddd1a-a5de-4c74-8a1b-aab726a750a5 | skrmmagetan@gmail.com | Admin | admin
-- 2. 1b7c6bea-44fb-433b-bd53-02f5f6d80bd8 | manager@skrm.com | Manager | manager
-- 3. 3d782b49-c23b-459b-8060-36aed6b55175 | affiliocare@gmail.com | Aji Nugroho | employee
-- 4. 5d9ccf42-e637-4a0b-96a8-6a26e3615d7b | shakadana05@gmail.com | Samsul Huda | employee

-- If any data is incorrect, use these UPDATE statements:

-- Update Admin role (if needed)
-- UPDATE users SET role = 'admin', name = 'Admin' 
-- WHERE id = 'ee5ddd1a-a5de-4c74-8a1b-aab726a750a5';

-- Update Manager role (if needed)
-- UPDATE users SET role = 'manager', name = 'Manager'
-- WHERE id = '1b7c6bea-44fb-433b-bd53-02f5f6d80bd8';

-- Update Employee 1 (if needed)
-- UPDATE users SET role = 'employee', name = 'Aji Nugroho'
-- WHERE id = '3d782b49-c23b-459b-8060-36aed6b55175';

-- Update Employee 2 (if needed)
-- UPDATE users SET role = 'employee', name = 'Samsul Huda'
-- WHERE id = '5d9ccf42-e637-4a0b-96a8-6a26e3615d7b';
