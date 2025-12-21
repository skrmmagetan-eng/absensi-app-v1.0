-- Fix Specific Duplicate Users
-- Based on the screenshot showing duplicate users

-- Step 1: Check current state of specific users
SELECT 
    id,
    email,
    name,
    role,
    status,
    created_at,
    location
FROM public.users 
WHERE email IN (
    'wicaksonopurwanto@gmail.com',
    'anggaskharisma@gmail.com',
    'mazis977@gmail.com',
    'achmadverry20@gmail.com',
    'dwikydiaspriambodo@gmail.com',
    'manager@skrm.com',
    'skrmmagetan@gmail.com'
)
ORDER BY email, created_at;

-- Step 2: Identify which specific IDs to keep (earliest created_at for each email)
WITH ranked_users AS (
    SELECT 
        id,
        email,
        name,
        role,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at ASC) as rn
    FROM public.users
    WHERE email IN (
        'wicaksonopurwanto@gmail.com',
        'anggaskharisma@gmail.com',
        'mazis977@gmail.com',
        'achmadverry20@gmail.com',
        'dwikydiaspriambodo@gmail.com',
        'manager@skrm.com',
        'skrmmagetan@gmail.com'
    )
)
SELECT 
    id,
    email,
    name,
    role,
    created_at,
    CASE WHEN rn = 1 THEN '✓ KEEP' ELSE '✗ DELETE' END as action
FROM ranked_users
ORDER BY email, rn;

-- Step 3: Check if any customers are linked to duplicate users
SELECT 
    u.email,
    u.id as user_id,
    u.name as user_name,
    COUNT(c.id) as customer_count
FROM public.users u
LEFT JOIN public.customers c ON u.id = c.employee_id
WHERE u.id NOT IN (
    SELECT MIN(id) 
    FROM public.users 
    WHERE email IN (
        'wicaksonopurwanto@gmail.com',
        'anggaskharisma@gmail.com',
        'mazis977@gmail.com',
        'achmadverry20@gmail.com',
        'dwikydiaspriambodo@gmail.com',
        'manager@skrm.com',
        'skrmmagetan@gmail.com'
    )
    GROUP BY email
)
AND u.email IN (
    'wicaksonopurwanto@gmail.com',
    'anggaskharisma@gmail.com',
    'mazis977@gmail.com',
    'achmadverry20@gmail.com',
    'dwikydiaspriambodo@gmail.com',
    'manager@skrm.com',
    'skrmmagetan@gmail.com'
)
GROUP BY u.email, u.id, u.name;

-- Step 4: Delete duplicate users (keeps oldest for each email)
-- IMPORTANT: This will delete duplicate users permanently!

DELETE FROM public.users 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM public.users 
    GROUP BY email
)
AND email IN (
    'wicaksonopurwanto@gmail.com',
    'anggaskharisma@gmail.com',
    'mazis977@gmail.com',
    'achmadverry20@gmail.com',
    'dwikydiaspriambodo@gmail.com',
    'manager@skrm.com',
    'skrmmagetan@gmail.com'
);

-- Step 5: Verify cleanup
SELECT 
    email,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as names
FROM public.users 
WHERE email IN (
    'wicaksonopurwanto@gmail.com',
    'anggaskharisma@gmail.com',
    'mazis977@gmail.com',
    'achmadverry20@gmail.com',
    'dwikydiaspriambodo@gmail.com',
    'manager@skrm.com',
    'skrmmagetan@gmail.com'
)
GROUP BY email
ORDER BY email;

-- Step 6: Final check - should return 0 rows
SELECT 
    email, 
    COUNT(*) as duplicate_count
FROM public.users 
GROUP BY email 
HAVING COUNT(*) > 1;