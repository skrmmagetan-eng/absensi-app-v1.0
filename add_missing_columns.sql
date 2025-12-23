-- ================================================================
-- 🔧 ADD MISSING COLUMNS FOR DATA SYNCHRONIZATION
-- Tambah kolom yang diperlukan untuk sinkronisasi data
-- ================================================================

-- 1. Tambah kolom items_summary ke tabel orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS items_summary TEXT;

-- 2. Tambah kolom audit trail yang mungkin belum ada
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

-- 3. Tambah kolom photo_url ke attendance jika belum ada
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 4. Update existing orders yang belum punya items_summary
UPDATE public.orders 
SET items_summary = CASE 
    WHEN items IS NOT NULL AND jsonb_array_length(items) > 0 THEN
        (
            SELECT string_agg(
                (item->>'name') || ' (' || (item->>'qty') || 'x)', 
                ', '
            )
            FROM jsonb_array_elements(items) AS item
        )
    ELSE 'Item tidak tersedia'
END
WHERE items_summary IS NULL OR items_summary = '';

-- 5. Cek struktur tabel orders
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'orders' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Cek struktur tabel customers
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'customers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. Cek struktur tabel attendance
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'attendance' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- SUCCESS MESSAGE
SELECT '✅ Missing columns added successfully! Now you can run the other SQL files.' as status;