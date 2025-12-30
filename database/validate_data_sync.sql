-- ================================================================
-- 🔍 VALIDASI SINKRONISASI DATA EMPLOYEE-ADMIN
-- Script untuk memastikan data employee tersinkron dengan admin view
-- ================================================================

-- 1. Cek konsistensi employee_id di semua tabel
SELECT 'EMPLOYEE ID CONSISTENCY CHECK' as check_type;

-- Cek customers tanpa employee yang valid
SELECT 
    'Customers with invalid employee_id' as issue,
    count(*) as count,
    array_agg(c.name) as affected_customers
FROM customers c 
LEFT JOIN users u ON c.employee_id = u.id 
WHERE u.id IS NULL AND c.employee_id IS NOT NULL;

-- Cek orders tanpa employee yang valid  
SELECT 
    'Orders with invalid employee_id' as issue,
    count(*) as count,
    array_agg(o.id::text) as affected_orders
FROM orders o 
LEFT JOIN users u ON o.employee_id = u.id 
WHERE u.id IS NULL AND o.employee_id IS NOT NULL;

-- Cek attendance tanpa employee yang valid
SELECT 
    'Attendance with invalid employee_id' as issue,
    count(*) as count,
    array_agg(a.id::text) as affected_attendance
FROM attendance a 
LEFT JOIN users u ON a.employee_id = u.id 
WHERE u.id IS NULL AND a.employee_id IS NOT NULL;

-- 2. Cek konsistensi customer_id di tabel terkait
SELECT 'CUSTOMER ID CONSISTENCY CHECK' as check_type;

-- Cek orders tanpa customer yang valid
SELECT 
    'Orders with invalid customer_id' as issue,
    count(*) as count,
    array_agg(o.id::text) as affected_orders
FROM orders o 
LEFT JOIN customers c ON o.customer_id = c.id 
WHERE c.id IS NULL AND o.customer_id IS NOT NULL;

-- Cek attendance tanpa customer yang valid
SELECT 
    'Attendance with invalid customer_id' as issue,
    count(*) as count,
    array_agg(a.id::text) as affected_attendance
FROM attendance a 
LEFT JOIN customers c ON a.customer_id = c.id 
WHERE c.id IS NULL AND a.customer_id IS NOT NULL;

-- 3. Cek field naming consistency
SELECT 'FIELD NAMING CONSISTENCY CHECK' as check_type;

-- Cek apakah customer_visits masih menggunakan user_id
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'customer_visits' 
AND table_schema = 'public'
AND column_name IN ('user_id', 'employee_id');

-- 4. Cek data integrity untuk KPI calculation
SELECT 'KPI DATA INTEGRITY CHECK' as check_type;

-- Cek orders dengan total_amount null atau negatif
SELECT 
    'Orders with invalid total_amount' as issue,
    count(*) as count
FROM orders 
WHERE total_amount IS NULL OR total_amount < 0;

-- Cek attendance tanpa check_in_time
SELECT 
    'Attendance without check_in_time' as issue,
    count(*) as count
FROM attendance 
WHERE check_in_time IS NULL;

-- Cek customers tanpa employee_id
SELECT 
    'Customers without employee_id' as issue,
    count(*) as count
FROM customers 
WHERE employee_id IS NULL;

-- 5. Cek livestock_type consistency
SELECT 'LIVESTOCK TYPE CONSISTENCY CHECK' as check_type;

-- Lihat semua livestock_type yang ada
SELECT 
    livestock_type,
    count(*) as customer_count
FROM customers 
WHERE livestock_type IS NOT NULL
GROUP BY livestock_type
ORDER BY customer_count DESC;

-- 6. Cek items vs items_summary consistency di orders (jika kolom ada)
SELECT 'ORDERS ITEMS CONSISTENCY CHECK' as check_type;

-- Cek apakah kolom items_summary ada
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND table_schema = 'public' 
        AND column_name = 'items_summary'
    ) THEN
        -- Cek orders yang punya items tapi tidak ada items_summary
        RAISE NOTICE 'Checking orders with items but no items_summary...';
        PERFORM count(*) FROM orders 
        WHERE items IS NOT NULL 
        AND (items_summary IS NULL OR items_summary = '');
        
        -- Cek orders yang punya items_summary tapi tidak ada items
        RAISE NOTICE 'Checking orders with items_summary but no items...';
        PERFORM count(*) FROM orders 
        WHERE items_summary IS NOT NULL 
        AND items_summary != ''
        AND (items IS NULL OR items::text = '[]');
    ELSE
        RAISE NOTICE 'Column items_summary does not exist in orders table. Run add_missing_columns.sql first.';
    END IF;
END $$;

-- 7. Cek audit trail fields (dengan safe check)
SELECT 'AUDIT TRAIL CHECK' as check_type;

-- Cek tabel yang belum punya updated_at
SELECT 
    'Tables missing updated_at column' as check_type,
    array_agg(table_name) as missing_tables
FROM (
    SELECT 'customers' as table_name
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers'
        AND column_name = 'updated_at'
    )
    UNION ALL
    SELECT 'orders' as table_name
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
        AND column_name = 'updated_at'
    )
    UNION ALL
    SELECT 'attendance' as table_name
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'attendance'
        AND column_name = 'updated_at'
    )
) missing_updated_at;

-- Cek tabel yang belum punya updated_by
SELECT 
    'Tables missing updated_by column' as check_type,
    array_agg(table_name) as missing_tables
FROM (
    SELECT 'customers' as table_name
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers'
        AND column_name = 'updated_by'
    )
    UNION ALL
    SELECT 'orders' as table_name
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'orders'
        AND column_name = 'updated_by'
    )
    UNION ALL
    SELECT 'attendance' as table_name
    WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'attendance'
        AND column_name = 'updated_by'
    )
) missing_updated_by;

-- 8. Cek RLS policies
SELECT 'RLS POLICIES CHECK' as check_type;

-- Lihat semua policies yang aktif
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('customers', 'orders', 'attendance', 'users')
ORDER BY tablename, policyname;

-- 9. Performance check - cek indexes
SELECT 'INDEXES CHECK' as check_type;

-- Lihat indexes yang sudah dibuat
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 10. Data volume check
SELECT 'DATA VOLUME CHECK' as check_type;

SELECT 'users' as table_name, count(*) as record_count FROM users
UNION ALL
SELECT 'customers' as table_name, count(*) as record_count FROM customers
UNION ALL
SELECT 'orders' as table_name, count(*) as record_count FROM orders
UNION ALL
SELECT 'attendance' as table_name, count(*) as record_count FROM attendance
UNION ALL
SELECT 'customer_visits' as table_name, count(*) as record_count FROM customer_visits
ORDER BY record_count DESC;

-- 11. Recent activity check (last 24 hours)
SELECT 'RECENT ACTIVITY CHECK' as check_type;

SELECT 
    'New customers (24h)' as activity,
    count(*) as count
FROM customers 
WHERE created_at > NOW() - INTERVAL '24 hours';

SELECT 
    'New orders (24h)' as activity,
    count(*) as count
FROM orders 
WHERE created_at > NOW() - INTERVAL '24 hours';

SELECT 
    'New attendance (24h)' as activity,
    count(*) as count
FROM attendance 
WHERE check_in_time > NOW() - INTERVAL '24 hours';

-- SUCCESS MESSAGE
SELECT '✅ Data synchronization validation completed! Check results above for any issues.' as status;