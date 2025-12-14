-- ================================================================
-- 🔒 SKRM DATA PRIVACY & SECURITY RULES (FINAL)
-- ================================================================

-- 1. Helper Function: Cek Role User saat ini
-- Ini mempercepat pengecekan apakah user adalah admin atau manager
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. PRIVASI TABEL: CUSTOMERS (Pelanggan)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers Visibility" ON public.customers;

-- Aturan: 
-- Admin/Manager: Boleh lihat SEMUA.
-- Employee: Hanya boleh lihat pelanggan yang ditugaskan ke dia (employee_id).
CREATE POLICY "Customers Visibility" ON public.customers
FOR SELECT USING (
  (get_my_role() IN ('admin', 'manager')) 
  OR 
  (employee_id = auth.uid())
);

-- Aturan Insert/Update: Employee boleh tambah/edit pelanggan sendiri
CREATE POLICY "Customers Management" ON public.customers
FOR ALL USING (
  (get_my_role() IN ('admin', 'manager')) 
  OR 
  (employee_id = auth.uid())
);


-- 3. PRIVASI TABEL: ORDERS (Pesanan)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Orders Visibility" ON public.orders;

CREATE POLICY "Orders Visibility" ON public.orders
FOR SELECT USING (
  (get_my_role() IN ('admin', 'manager')) 
  OR 
  (employee_id = auth.uid())
);

CREATE POLICY "Orders Entry" ON public.orders
FOR INSERT WITH CHECK (
  auth.uid() = employee_id
);

-- 4. PRIVASI TABEL: ATTENDANCE (Absensi/Kunjungan)
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Attendance Visibility" ON public.attendance;

CREATE POLICY "Attendance Visibility" ON public.attendance
FOR SELECT USING (
  (get_my_role() IN ('admin', 'manager')) 
  OR 
  (employee_id = auth.uid())
);

CREATE POLICY "Attendance Entry" ON public.attendance
FOR INSERT WITH CHECK (
  auth.uid() = employee_id
);

-- Update: Check-Out (Update row sendiri)
CREATE POLICY "Attendance Update" ON public.attendance
FOR UPDATE USING (
  employee_id = auth.uid()
);

-- Selesai! Privasi Data sudah dijamin Aman. 🔒
