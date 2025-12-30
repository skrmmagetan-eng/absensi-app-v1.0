-- Add additional fields to users table for CSV import
-- Run this in Supabase SQL Editor

-- Add location field
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS location text;

-- Add notes field  
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS notes text;

-- Add avatar_url field
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Add sales_amount field (for tracking sales data from spreadsheet)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS sales_amount numeric DEFAULT 0;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;