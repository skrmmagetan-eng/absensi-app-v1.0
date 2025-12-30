-- =====================================================
-- 01. PREPARE DATABASE FOR DATA IMPORT
-- =====================================================
-- Run this FIRST before importing any data
-- Adds required columns to attendance table

-- Step 1: Add missing columns to attendance table
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS latitude float,
ADD COLUMN IF NOT EXISTS longitude float,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Step 2: Verify table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'attendance' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 3: Check prerequisites
SELECT 'Employees Check' as check_type, COUNT(*) as count
FROM public.users 
WHERE role = 'employee'
UNION ALL
SELECT 'Customers Check' as check_type, COUNT(*) as count
FROM public.customers;

-- Expected Results:
-- - attendance table should have: employee_id, customer_id, check_in_time, 
--   latitude, longitude, notes, photo_url columns
-- - Should show 4 employees
-- - Customers count may be 0 (will be populated in step 2)

-- ✅ SUCCESS: Database is ready for data import!