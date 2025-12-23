-- ================================================================
-- 🔄 SAFE DATA SYNCHRONIZATION FIX
-- Perbaikan yang aman untuk sinkronisasi data employee-admin
-- ================================================================

-- 1. Cek dan buat tabel customer_visits jika belum ada
CREATE TABLE IF NOT EXISTS public.customer_visits (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.customers(id) ON DELETE CASCADE,
  employee_id uuid references public.users(id) ON DELETE CASCADE,
  latitude float,
  longitude float,
  notes text,
  photo_url text,
  created_at timestamp with time zone default now()
);

-- 2. Enable RLS untuk customer_visits
ALTER TABLE public.customer_visits ENABLE ROW LEVEL SECURITY;

-- 3. Buat policies untuk customer_visits
DROP POLICY IF EXISTS "Create visits" ON public.customer_visits;
DROP POLICY IF EXISTS "View visits" ON public.customer_visits;

CREATE POLICY "Create visits" ON public.customer_visits 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "View visits" ON public.customer_visits 
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
    OR 
    (employee_id = auth.uid())
);

-- 4. Update foreign key constraints untuk tabel yang ada
-- Customers
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
        -- Drop dan buat ulang constraint
        ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_employee_id_fkey;
        ALTER TABLE public.customers ADD CONSTRAINT customers_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Orders
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
        ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_employee_id_fkey;
        ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
        
        ALTER TABLE public.orders ADD CONSTRAINT orders_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
        
        ALTER TABLE public.orders ADD CONSTRAINT orders_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Attendance
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance' AND table_schema = 'public') THEN
        ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_employee_id_fkey;
        ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS attendance_customer_id_fkey;
        
        ALTER TABLE public.attendance ADD CONSTRAINT attendance_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE ON UPDATE CASCADE;
        
        ALTER TABLE public.attendance ADD CONSTRAINT attendance_customer_id_fkey 
        FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- 5. Buat atau update KPI function
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
     
    -- Total Sales - hanya completed orders
    COALESCE((SELECT sum(total_amount) FROM orders o 
       WHERE o.employee_id = u.id 
       AND o.created_at BETWEEN start_date AND end_date 
       AND o.status IN ('completed', 'selesai')), 0) as total_sales,

    -- Skor KPI: (Visits * 2) + (New Customers * 10) + (Orders * 5)
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

-- 6. Buat function untuk real-time notifications (simplified)
CREATE OR REPLACE FUNCTION notify_data_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple notification
  PERFORM pg_notify('data_change', 
    TG_TABLE_NAME || ':' || TG_OP || ':' || COALESCE(NEW.employee_id::text, OLD.employee_id::text, 'unknown')
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 7. Apply notification triggers (safe)
DO $$
BEGIN
    -- Customers
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customers' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS notify_customers_change ON public.customers;
        CREATE TRIGGER notify_customers_change 
            AFTER INSERT OR UPDATE OR DELETE ON public.customers 
            FOR EACH ROW EXECUTE FUNCTION notify_data_change();
    END IF;

    -- Orders
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS notify_orders_change ON public.orders;
        CREATE TRIGGER notify_orders_change 
            AFTER INSERT OR UPDATE OR DELETE ON public.orders 
            FOR EACH ROW EXECUTE FUNCTION notify_data_change();
    END IF;

    -- Attendance
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendance' AND table_schema = 'public') THEN
        DROP TRIGGER IF EXISTS notify_attendance_change ON public.attendance;
        CREATE TRIGGER notify_attendance_change 
            AFTER INSERT OR UPDATE OR DELETE ON public.attendance 
            FOR EACH ROW EXECUTE FUNCTION notify_data_change();
    END IF;
END $$;

-- 8. Cek hasil
SELECT 
    'Tables checked' as status,
    count(*) as table_count
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'customers', 'orders', 'attendance', 'customer_visits');

-- SUCCESS MESSAGE
SELECT '✅ Safe data synchronization fix completed! Employee data will now sync properly with admin views.' as status;