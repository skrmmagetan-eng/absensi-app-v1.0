-- Check for duplicate users that might cause role switching issues
-- Run this to diagnose the problem

-- 0. First, let's see the table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1. Check for duplicate emails
SELECT 
    email,
    COUNT(*) as user_count,
    STRING_AGG(id::text, ', ') as user_ids,
    STRING_AGG(role, ', ') as roles,
    STRING_AGG(name, ', ') as names
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- 2. Check all users to see the current state
SELECT 
    id,
    email,
    name,
    role,
    status,
    created_at
FROM users 
ORDER BY email, created_at;

-- 3. Check for any users with admin role
SELECT 
    id,
    email,
    name,
    role,
    status,
    created_at
FROM users 
WHERE role IN ('admin', 'manager')
ORDER BY created_at;

-- 4. Check for any users created recently (potential duplicates)
SELECT 
    id,
    email,
    name,
    role,
    status,
    created_at
FROM users 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 5. Check if there are any suspicious patterns
-- Users with same name but different roles
SELECT 
    name,
    COUNT(*) as count,
    STRING_AGG(DISTINCT role, ', ') as roles,
    STRING_AGG(DISTINCT email, ', ') as emails
FROM users 
GROUP BY name 
HAVING COUNT(*) > 1 OR COUNT(DISTINCT role) > 1;

-- 6. If you find duplicate users, you can clean them up with:
-- DELETE FROM users WHERE id = 'duplicate-user-id-here';
-- But be very careful and backup first!