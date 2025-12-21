-- Clean Duplicate Users with Priority Logic
-- This script keeps users based on priority: admin > manager > employee
-- And within same role, keeps the one with earliest created_at

-- Step 1: Analyze current duplicates
WITH duplicate_analysis AS (
    SELECT 
        email,
        id,
        name,
        role,
        status,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY email 
            ORDER BY 
                CASE role 
                    WHEN 'admin' THEN 1 
                    WHEN 'manager' THEN 2 
                    WHEN 'employee' THEN 3 
                    ELSE 4 
                END,
                created_at ASC
        ) as priority_rank
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
    id,
    name,
    role,
    status,
    created_at,
    priority_rank,
    CASE WHEN priority_rank = 1 THEN 'KEEP' ELSE 'DELETE' END as action
FROM duplicate_analysis
ORDER BY email, priority_rank;

-- Step 2: Show users that will be kept
WITH users_to_keep AS (
    SELECT 
        email,
        id,
        name,
        role,
        status,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY email 
            ORDER BY 
                CASE role 
                    WHEN 'admin' THEN 1 
                    WHEN 'manager' THEN 2 
                    WHEN 'employee' THEN 3 
                    ELSE 4 
                END,
                created_at ASC
        ) as priority_rank
    FROM public.users
)
SELECT 
    'USERS TO KEEP:' as info,
    email,
    id,
    name,
    role,
    status,
    created_at
FROM users_to_keep
WHERE priority_rank = 1
AND email IN (
    SELECT email 
    FROM public.users 
    GROUP BY email 
    HAVING COUNT(*) > 1
)
ORDER BY email;

-- Step 3: Show users that will be deleted
WITH users_to_delete AS (
    SELECT 
        email,
        id,
        name,
        role,
        status,
        created_at,
        ROW_NUMBER() OVER (
            PARTITION BY email 
            ORDER BY 
                CASE role 
                    WHEN 'admin' THEN 1 
                    WHEN 'manager' THEN 2 
                    WHEN 'employee' THEN 3 
                    ELSE 4 
                END,
                created_at ASC
        ) as priority_rank
    FROM public.users
)
SELECT 
    'USERS TO DELETE:' as info,
    email,
    id,
    name,
    role,
    status,
    created_at
FROM users_to_delete
WHERE priority_rank > 1
ORDER BY email, priority_rank;

-- Step 4: Delete duplicate users (UNCOMMENT TO EXECUTE)
-- IMPORTANT: Review the results above before uncommenting this!

/*
WITH users_to_keep AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY email 
            ORDER BY 
                CASE role 
                    WHEN 'admin' THEN 1 
                    WHEN 'manager' THEN 2 
                    WHEN 'employee' THEN 3 
                    ELSE 4 
                END,
                created_at ASC
        ) as priority_rank
    FROM public.users
)
DELETE FROM public.users 
WHERE id IN (
    SELECT id 
    FROM users_to_keep 
    WHERE priority_rank > 1
);
*/

-- Step 5: After deletion, verify results
SELECT 
    'FINAL VERIFICATION:' as info,
    email, 
    COUNT(*) as count
FROM public.users 
GROUP BY email 
HAVING COUNT(*) > 1;