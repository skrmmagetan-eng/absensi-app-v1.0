-- Add livestock_type column to customers table
-- Run this SQL in Supabase SQL Editor

-- Add the livestock_type column
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS livestock_type TEXT;

-- Add comment for documentation
COMMENT ON COLUMN customers.livestock_type IS 'Jenis/tipe ternak yang dipelihara pelanggan (ayam broiler, ayam grower/pullet, sapi perah, dll)';

-- Create index for better search performance
CREATE INDEX IF NOT EXISTS idx_customers_livestock_type ON customers(livestock_type);

-- Update existing customers with default value (optional)
-- UPDATE customers SET livestock_type = 'Belum diisi' WHERE livestock_type IS NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND column_name = 'livestock_type';