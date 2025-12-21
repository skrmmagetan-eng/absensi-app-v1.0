-- Clean Duplicate Users Script
-- Run this in Supabase SQL Editor to remove duplicate users

-- Step 1: Check current duplicate users
SELECT 
    email, 
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as user_ids,
    STRING_AGG(name, ', ') as names
FROM public.users 
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY email;

-- Step 2: Show which users will be kept (oldest created_at for each email)
SELECT 
    u1.id,
    u1.email,
    u1.name,
    u1.role,
    u1.created_at,
    'WILL BE KEPT' as status
FROM public.users u1
WHERE u1.id IN (
    SELECT MIN(id) 
    FROM public.users 
    GROUP BY email
)
AND u1.email IN (
    SELECT email 
    FROM public.users 
    GROUP BY email 
    HAVING COUNT(*) > 1
)
ORDER BY u1.email;

-- Step 3: Show which users will be deleted
SELECT 
    u1.id,
    u1.email,
    u1.name,
    u1.role,
    u1.created_at,
    'WILL BE DELETED' as status
FROM public.users u1
WHERE u1.id NOT IN (
    SELECT MIN(id) 
    FROM public.users 
    GROUP BY email
)
ORDER BY u1.email;

-- Step 4: Delete duplicate users (keep the oldest one for each email)
-- IMPORTANT: This will permanently delete duplicate users!
-- Make sure to backup your data first if needed

DELETE FROM public.users 
WHERE id NOT IN (
    SELECT MIN(id) 
    FROM public.users 
    GROUP BY email
);

-- Step 5: Verify no more duplicates exist
SELECT 
    email, 
    COUNT(*) as count
FROM public.users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Step 6: Show final user list
SELECT 
    id,
    email,
    name,
    role,
    status,
    created_at
FROM public.users 
ORDER BY role, name;