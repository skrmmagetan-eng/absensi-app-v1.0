-- Add location fields to attendance table for CSV import
-- Run this in Supabase SQL Editor

-- Add latitude and longitude columns
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS latitude float,
ADD COLUMN IF NOT EXISTS longitude float;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'attendance' 
AND table_schema = 'public'
ORDER BY ordinal_position;