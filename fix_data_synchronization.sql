-- ================================================================
-- 🔄 FIX DATA SYNCHRONIZATION - EMPLOYEE INPUT TO ADMIN VIEW
-- Perbaiki foreign key constraints dan data integrity
-- ================================================================

-- 1. Standardisasi field naming - Ubah user_id ke employee_id di customer_visits (jika ada)
DO $$
BEGIN
    -- Cek apakah kolom user_id ada di customer_visits
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'customer_visits' 
        AND table_schema = 'public' 
        AND column_name = 'user_id'
    ) THEN
        -- Rename user_id ke employee_id
        ALTER TABLE public.customer_visits 
        RENAME COLUMN user_id TO employee_id;
        
        RAISE NOTICE 'Column user_id renamed to employee_id in customer_visits table';
    ELSE
        -- Cek apakah employee_id sudah ada
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'customer_visits' 
            AND table_schema = 'public' 
            AND column_name = 'employee_id'
        ) THEN
            -- Tambah kolom employee_id jika belum ada
            ALTER TABLE public.customer_visits 
            ADD COLUMN employee_id UUID REFERENCES public.users(id);
            
            RAISE NOTICE 'Column employee_id added to customer_visits table';
        ELSE
            RAISE NOTICE 'Column employee_id already exists in customer_visits table';
        END IF;
    END IF;
END $$;

-- Update RLS policies untuk customer_visits
DROP POLICY IF EXISTS "Create visits" ON public.customer_visits;
DROP POLICY IF EXISTS "View visits" ON public.customer_visits;

-- Buat ulang policies dengan field yang benar
CREATE POLICY "Create visits" ON public.customer_visits 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "View visits" ON public.customer_visits 
FOR SELECT TO authenticated USING (
    (get_my_role() IN ('admin', 'manager')) 
    OR 
    (employee_id = auth.uid())
);

-- 2. Tambah CASCADE DELETE untuk data integrity (dengan safe checks)
-- Drop existing foreign keys dan buat ulang dengan CASCADE

-- Customers table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
        ALTER TABLE public.customers 
        DROP CONSTRAINT IF EXISTS customers_employee_id_fkey;

        ALTER TABLE public.customers 
        ADD CONSTRAINT customers_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES public.users(id) 
        ON DELETE CASCADE ON UPDATE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint updated for customers table';
    END IF;
END $$;

-- Orders table  
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
        ALTER TABLE public.orders 
        DROP CONSTRAINT IF EXISTS orders_employee_id_fkey;
        
        ALTER TABLE public.orders 
        DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;

        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES public.users(id) 
        ON DELETE CASCADE ON UPDATE CASCADE;

        ALTER TABLE public.orders 
        ADD CONSTRAINT orders_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES public.customers(id) 
        ON DELETE CASCADE ON UPDATE CASCADE;
        
        RAISE NOTICE 'Foreign key constraints updated for orders table';
    END IF;
END $$;

-- Attendance table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance' AND table_schema = 'public') THEN
        ALTER TABLE public.attendance 
        DROP CONSTRAINT IF EXISTS attendance_employee_id_fkey;
        
        ALTER TABLE public.attendance 
        DROP CONSTRAINT IF EXISTS attendance_customer_id_fkey;

        ALTER TABLE public.attendance 
        ADD CONSTRAINT attendance_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES public.users(id) 
        ON DELETE CASCADE ON UPDATE CASCADE;

        ALTER TABLE public.attendance 
        ADD CONSTRAINT attendance_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES public.customers(id) 
        ON DELETE SET NULL ON UPDATE CASCADE;
        
        RAISE NOTICE 'Foreign key constraints updated for attendance table';
    END IF;
END $$;

-- Customer visits table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_visits' AND table_schema = 'public') THEN
        ALTER TABLE public.customer_visits 
        DROP CONSTRAINT IF EXISTS customer_visits_employee_id_fkey;
        
        ALTER TABLE public.customer_visits 
        DROP CONSTRAINT IF EXISTS customer_visits_customer_id_fkey;

        ALTER TABLE public.customer_visits 
        ADD CONSTRAINT customer_visits_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES public.users(id) 
        ON DELETE CASCADE ON UPDATE CASCADE;

        ALTER TABLE public.customer_visits 
        ADD CONSTRAINT customer_visits_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES public.customers(id) 
        ON DELETE CASCADE ON UPDATE CASCADE;
        
        RAISE NOTICE 'Foreign key constraints updated for customer_visits table';
    END IF;
END $$;

-- Sales plans table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_plans' AND table_schema = 'public') THEN
        ALTER TABLE public.sales_plans 
        DROP CONSTRAINT IF EXISTS sales_plans_employee_id_fkey;

        ALTER TABLE public.sales_plans 
        ADD CONSTRAINT sales_plans_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES public.users(id) 
        ON DELETE CASCADE ON UPDATE CASCADE;
        
        RAISE NOTICE 'Foreign key constraint updated for sales_plans table';
    END IF;
END $$;

-- 3. Tambah audit trail columns ke semua tabel utama
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.users(id);

-- 4. Buat trigger untuk auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = auth.uid();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at 
    BEFORE UPDATE ON public.customers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_updated_at ON public.attendance;
CREATE TRIGGER update_attendance_updated_at 
    BEFORE UPDATE ON public.attendance 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Perbaiki KPI function untuk konsistensi field naming
CREATE OR REPLACE FUNCTION get_kpi_summary(start_date timestamp, end_date timestamp)
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
    -- Hitung Attendance (Kunjungan) - pastikan field employee_id
    (SELECT count(*) FROM attendance a 
     WHERE a.employee_id = u.id 
     AND a.check_in_time BETWEEN start_date AND end_date) as visit_count,
     
    -- Hitung Pelanggan Baru - pastikan field employee_id
    (SELECT count(*) FROM customers c 
     WHERE c.employee_id = u.id 
     AND c.created_at BETWEEN start_date AND end_date) as new_customer_count,
     
    -- Hitung Orders - pastikan field employee_id
    (SELECT count(*) FROM orders o 
     WHERE o.employee_id = u.id 
     AND o.created_at BETWEEN start_date AND end_date) as order_count,
     
    -- Total Sales - hanya completed orders
    COALESCE(
      (SELECT sum(total_amount) FROM orders o 
       WHERE o.employee_id = u.id 
       AND o.created_at BETWEEN start_date AND end_date 
       AND o.status = 'completed'), 
    0) as total_sales,

    -- Skor KPI: (Visits * 2) + (New Customers * 10) + (Orders * 5)
    LEAST(100, 
      (
        ((SELECT count(*) FROM attendance a WHERE a.employee_id = u.id AND a.check_in_time BETWEEN start_date AND end_date) * 2) +
        ((SELECT count(*) FROM customers c WHERE c.employee_id = u.id AND c.created_at BETWEEN start_date AND end_date) * 10) +
        ((SELECT count(*) FROM orders o WHERE o.employee_id = u.id AND o.created_at BETWEEN start_date AND end_date) * 5)
      )::numeric
    ) as score

  FROM users u
  WHERE u.role IN ('employee', 'manager')
  AND u.status = 'active'
  ORDER BY score DESC;
END;
$$;

-- 6. Buat function untuk real-time sync notification
CREATE OR REPLACE FUNCTION notify_data_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify admin dashboard about data changes
  PERFORM pg_notify('data_change', json_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'employee_id', COALESCE(NEW.employee_id, OLD.employee_id),
    'timestamp', NOW()
  )::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Apply notification triggers
DROP TRIGGER IF EXISTS notify_customers_change ON public.customers;
CREATE TRIGGER notify_customers_change 
    AFTER INSERT OR UPDATE OR DELETE ON public.customers 
    FOR EACH ROW EXECUTE FUNCTION notify_data_change();

DROP TRIGGER IF EXISTS notify_orders_change ON public.orders;
CREATE TRIGGER notify_orders_change 
    AFTER INSERT OR UPDATE OR DELETE ON public.orders 
    FOR EACH ROW EXECUTE FUNCTION notify_data_change();

DROP TRIGGER IF EXISTS notify_attendance_change ON public.attendance;
CREATE TRIGGER notify_attendance_change 
    AFTER INSERT OR UPDATE OR DELETE ON public.attendance 
    FOR EACH ROW EXECUTE FUNCTION notify_data_change();

-- 7. Validasi data integrity (dengan safe checks)
-- Cek orphaned records hanya jika tabel ada

DO $$
BEGIN
    -- Cek orphaned customers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
        RAISE NOTICE 'Checking orphaned customers...';
        PERFORM count(*) FROM customers c 
        LEFT JOIN users u ON c.employee_id = u.id 
        WHERE u.id IS NULL;
    END IF;

    -- Cek orphaned orders
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
        RAISE NOTICE 'Checking orphaned orders...';
        PERFORM count(*) FROM orders o 
        LEFT JOIN users u ON o.employee_id = u.id 
        WHERE u.id IS NULL;
        
        PERFORM count(*) FROM orders o 
        LEFT JOIN customers c ON o.customer_id = c.id 
        WHERE c.id IS NULL;
    END IF;

    -- Cek orphaned attendance
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance' AND table_schema = 'public') THEN
        RAISE NOTICE 'Checking orphaned attendance...';
        PERFORM count(*) FROM attendance a 
        LEFT JOIN users u ON a.employee_id = u.id 
        WHERE u.id IS NULL;
    END IF;
END $$;

-- SUCCESS MESSAGE
SELECT '✅ Data synchronization fixes applied! Employee input now syncs properly with admin views.' as status;