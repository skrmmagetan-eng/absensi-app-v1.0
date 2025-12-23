-- ================================================================
-- 🔒 MANAGER VISIBILITY POLICIES - CUSTOMIZED FOR BUSINESS NEEDS
-- Manager: Bantu admin kelola Katalog, Follow-up Orders, Manajemen Karyawan
-- ================================================================

-- 1. Helper function untuk cek role dan permissions
CREATE OR REPLACE FUNCTION public.is_admin_or_manager()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. PRODUCTS (Katalog) - Manager bisa kelola seperti Admin
DROP POLICY IF EXISTS "Products management for managers" ON public.products;
CREATE POLICY "Products management for managers" ON public.products
FOR ALL USING (is_admin_or_manager());

-- 3. ORDERS - Manager bisa lihat dan update SEMUA orders (untuk follow-up)
DROP POLICY IF EXISTS "Orders visibility for managers" ON public.orders;
DROP POLICY IF EXISTS "Orders management for managers" ON public.orders;

CREATE POLICY "Orders visibility for managers" ON public.orders
FOR SELECT USING (
  -- Admin & Manager bisa lihat semua orders
  is_admin_or_manager()
  OR
  -- Employee hanya bisa lihat orders sendiri
  (employee_id = auth.uid())
);

CREATE POLICY "Orders management for managers" ON public.orders
FOR UPDATE USING (
  -- Admin & Manager bisa update semua orders (untuk follow-up)
  is_admin_or_manager()
);

-- 4. CUSTOMERS - Manager bisa lihat SEMUA customers (untuk follow-up orders)
DROP POLICY IF EXISTS "Customers visibility for managers" ON public.customers;
CREATE POLICY "Customers visibility for managers" ON public.customers
FOR SELECT USING (
  -- Admin & Manager bisa lihat semua customers
  is_admin_or_manager()
  OR
  -- Employee hanya bisa lihat customers sendiri
  (employee_id = auth.uid())
);

-- 5. USERS (Karyawan) - Manager bisa lihat dan edit, tapi TIDAK BISA HAPUS
DROP POLICY IF EXISTS "Users visibility for managers" ON public.users;
DROP POLICY IF EXISTS "Users management for managers" ON public.users;
DROP POLICY IF EXISTS "Users delete restriction" ON public.users;

CREATE POLICY "Users visibility for managers" ON public.users
FOR SELECT USING (
  -- Admin & Manager bisa lihat semua users
  is_admin_or_manager()
  OR
  -- User bisa lihat profile sendiri
  (id = auth.uid())
);

CREATE POLICY "Users management for managers" ON public.users
FOR UPDATE USING (
  -- Admin & Manager bisa edit users
  is_admin_or_manager()
  OR
  -- User bisa edit profile sendiri
  (id = auth.uid())
);

-- PENTING: Hanya Admin yang bisa DELETE users
CREATE POLICY "Users delete restriction" ON public.users
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 6. ATTENDANCE - Manager bisa lihat semua (untuk monitoring karyawan)
DROP POLICY IF EXISTS "Attendance visibility for managers" ON public.attendance;
CREATE POLICY "Attendance visibility for managers" ON public.attendance
FOR SELECT USING (
  -- Admin & Manager bisa lihat semua attendance
  is_admin_or_manager()
  OR
  -- Employee hanya bisa lihat attendance sendiri
  (employee_id = auth.uid())
);

-- 7. SALES PLANS - Manager bisa lihat dan kelola semua target
DROP POLICY IF EXISTS "Sales plans visibility for managers" ON public.sales_plans;
DROP POLICY IF EXISTS "Sales plans management for managers" ON public.sales_plans;

CREATE POLICY "Sales plans visibility for managers" ON public.sales_plans
FOR SELECT USING (
  -- Admin & Manager bisa lihat semua sales plans
  is_admin_or_manager()
  OR
  -- Employee hanya bisa lihat sales plans sendiri
  (employee_id = auth.uid())
);

CREATE POLICY "Sales plans management for managers" ON public.sales_plans
FOR ALL USING (
  -- Admin & Manager bisa kelola semua sales plans
  is_admin_or_manager()
  OR
  -- Employee hanya bisa kelola sales plans sendiri
  (employee_id = auth.uid())
);

-- 8. BUSINESS PROFILE - Hanya Admin yang bisa edit
DROP POLICY IF EXISTS "Business profile management" ON public.business_profile;
CREATE POLICY "Business profile management" ON public.business_profile
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 9. Update KPI function - Manager bisa lihat KPI semua karyawan
CREATE OR REPLACE FUNCTION get_kpi_summary_for_managers(
  start_date timestamp, 
  end_date timestamp
)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  visit_count bigint,
  new_customer_count bigint,
  order_count bigint,
  total_sales numeric,
  score numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.name,
    -- Hitung Attendance (Kunjungan)
    COALESCE((SELECT count(*) FROM attendance a 
     WHERE a.employee_id = u.id 
     AND a.check_in_time BETWEEN start_date AND end_date), 0) as visit_count,
     
    -- Hitung Pelanggan Baru
    COALESCE((SELECT count(*) FROM customers c 
     WHERE c.employee_id = u.id 
     AND c.created_at BETWEEN start_date AND end_date), 0) as new_customer_count,
     
    -- Hitung Orders
    COALESCE((SELECT count(*) FROM orders o 
     WHERE o.employee_id = u.id 
     AND o.created_at BETWEEN start_date AND end_date), 0) as order_count,
     
    -- Total Sales
    COALESCE((SELECT sum(total_amount) FROM orders o 
       WHERE o.employee_id = u.id 
       AND o.created_at BETWEEN start_date AND end_date 
       AND o.status IN ('completed', 'selesai')), 0) as total_sales,

    -- Skor KPI
    LEAST(100, 
      (
        (COALESCE((SELECT count(*) FROM attendance a WHERE a.employee_id = u.id AND a.check_in_time BETWEEN start_date AND end_date), 0) * 2) +
        (COALESCE((SELECT count(*) FROM customers c WHERE c.employee_id = u.id AND c.created_at BETWEEN start_date AND end_date), 0) * 10) +
        (COALESCE((SELECT count(*) FROM orders o WHERE o.employee_id = u.id AND o.created_at BETWEEN start_date AND end_date), 0) * 5)
      )::numeric
    ) as score

  FROM users u
  WHERE u.role IN ('employee', 'manager')
  AND (u.status = 'active' OR u.status IS NULL)
  ORDER BY score DESC;
END;
$$;

-- 10. Summary permissions untuk Manager vs Admin
/*
RINGKASAN PERMISSIONS SETELAH SCRIPT INI:

MANAGER BISA:
✅ Kelola Katalog (products) - CRUD semua produk
✅ Follow-up Orders - Lihat & update status semua orders  
✅ Manajemen Karyawan - Lihat & edit profile karyawan
✅ Lihat semua customers (untuk follow-up)
✅ Lihat semua attendance (monitoring karyawan)
✅ Kelola sales plans/targets
✅ Lihat KPI semua karyawan

MANAGER TIDAK BISA:
❌ Hapus karyawan (hanya Admin)
❌ Edit business profile (hanya Admin)
❌ Reset password karyawan (hanya Admin)

EMPLOYEE TETAP:
✅ Hanya bisa lihat/edit data sendiri
✅ Input customers, orders, attendance sendiri
✅ Lihat katalog produk
*/

-- SUCCESS MESSAGE
SELECT '✅ Manager permissions berhasil diatur! Manager sekarang bisa bantu Admin kelola Katalog, Follow-up Orders, dan Manajemen Karyawan.' as status;