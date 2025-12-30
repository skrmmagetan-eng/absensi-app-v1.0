-- Simple user diagnostic - guaranteed to work
-- Run these queries one by one to diagnose the role switching issue

-- 1. Show table structure first
\d users;

-- 2. Count total users
SELECT COUNT(*) as total_users FROM users;

-- 3. Check for duplicate emails (main suspect)
SELECT 
    email,
    COUNT(*) as count
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 4. Show all users with their roles
SELECT 
    id,
    email,
    name,
    role,
    status
FROM users 
ORDER BY email;

-- 5. Show only admin/manager users
SELECT 
    id,
    email,
    name,
    role,
    status
FROM users 
WHERE role IN ('admin', 'manager');

-- 6. Show only employee users
SELECT 
    id,
    email,
    name,
    role,
    status
FROM users 
WHERE role = 'employee';

-- 7. If you find duplicates, show details
-- Replace 'duplicate-email@example.com' with actual duplicate email
-- SELECT * FROM users WHERE email = 'duplicate-email@example.com';