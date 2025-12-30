-- STEP 1: Check if Admin exists in auth.users (authentication table)
SELECT id, email, created_at
FROM auth.users
WHERE email = 'skrmmagetan@gmail.com';

-- STEP 2: Check if Admin profile exists in public.users table
SELECT id, email, name, role
FROM users
WHERE email = 'skrmmagetan@gmail.com';

-- STEP 3: If Admin exists in auth.users but NOT in users table, create the profile
-- (Uncomment and run if needed)
/*
INSERT INTO users (id, email, name, role, created_at)
VALUES (
    'ee5ddd1a-a5de-4c74-8a1b-aab726a750a5',
    'skrmmagetan@gmail.com',
    'Admin',
    'admin',
    NOW()
)
ON CONFLICT (id) DO UPDATE
SET role = 'admin', name = 'Admin';
*/

-- STEP 4: Verify all users again
SELECT id, email, name, role, created_at
FROM users
ORDER BY 
    CASE role
        WHEN 'admin' THEN 1
        WHEN 'manager' THEN 2
        WHEN 'employee' THEN 3
        ELSE 4
    END,
    created_at;
