-- Simple Fix for Duplicate Users
-- This approach uses ROW_NUMBER() which works reliably with UUIDs

-- Step 1: See current duplicates
SELECT 
    email,
    COUNT(*) as duplicate_count,
    STRING_AGG(name, ' | ') as all_names
FROM public.users 
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY email;

-- Step 2: See which users will be kept vs deleted
WITH ranked_users AS (
    SELECT 
        id,
        email,
        name,
        role,
        status,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at ASC) as rn
    FROM public.users
    WHERE email IN (
        SELECT email 
        FROM public.users 
        GROUP BY email 
        HAVING COUNT(*) > 1
    )
)
SELECT 
    email,
    name,
    role,
    created_at,
    CASE WHEN rn = 1 THEN '✅ KEEP' ELSE '❌ DELETE' END as action,
    id
FROM ranked_users
ORDER BY email, rn;

-- Step 3: Delete duplicates (keeps the oldest created_at for each email)
-- IMPORTANT: This will permanently delete duplicate users!

WITH ranked_users AS (
    SELECT 
        id,
        email,
        ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at ASC) as rn
    FROM public.users
)
DELETE FROM public.users 
WHERE id IN (
    SELECT id 
    FROM ranked_users 
    WHERE rn > 1
);

-- Step 4: Verify no duplicates remain
SELECT 
    email,
    COUNT(*) as count
FROM public.users 
GROUP BY email 
HAVING COUNT(*) > 1;

-- Step 5: Show final user list
SELECT 
    id,
    email,
    name,
    role,
    status,
    created_at
FROM public.users 
ORDER BY role, email;