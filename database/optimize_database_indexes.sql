-- ================================================================
-- 🚀 OPTIMASI DATABASE INDEXES UNTUK ADMIN/MANAGER DASHBOARD
-- Jalankan di Supabase SQL Editor untuk meningkatkan performa
-- ================================================================

-- 1. Index untuk Orders (paling sering diquery)
CREATE INDEX IF NOT EXISTS idx_orders_employee_created 
ON orders(employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status 
ON orders(status);

CREATE INDEX IF NOT EXISTS idx_orders_customer_created 
ON orders(customer_id, created_at DESC);

-- 2. Index untuk Attendance (untuk KPI calculation)
CREATE INDEX IF NOT EXISTS idx_attendance_employee_checkin 
ON attendance(employee_id, check_in_time DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_customer_date 
ON attendance(customer_id, check_in_time DESC);

-- 3. Index untuk Customers (untuk new customer metrics)
CREATE INDEX IF NOT EXISTS idx_customers_employee_created 
ON customers(employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customers_livestock_type 
ON customers(livestock_type);

-- 4. Index untuk Users (untuk employee filtering)
CREATE INDEX IF NOT EXISTS idx_users_role_status 
ON users(role, status);

-- 5. Index untuk Sales Plans (untuk target tracking)
CREATE INDEX IF NOT EXISTS idx_sales_plans_employee_status 
ON sales_plans(employee_id, current_status);

CREATE INDEX IF NOT EXISTS idx_sales_plans_deadline 
ON sales_plans(deadline);

-- 6. Composite index untuk KPI queries (most important)
CREATE INDEX IF NOT EXISTS idx_orders_kpi_composite 
ON orders(employee_id, created_at, status, total_amount);

CREATE INDEX IF NOT EXISTS idx_attendance_kpi_composite 
ON attendance(employee_id, check_in_time, customer_id);

-- 7. Index untuk business profile (admin settings)
CREATE INDEX IF NOT EXISTS idx_business_profile_updated 
ON business_profile(updated_at DESC);

-- 8. Verify indexes created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- SUCCESS MESSAGE
SELECT '✅ Database indexes berhasil dibuat! Dashboard akan lebih cepat.' as status;