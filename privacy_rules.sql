-- ================================================================
-- 🔒 SKRM ADVANCED SECURITY & PRIVACY RULES
-- ================================================================

-- 1. Helper Function: Cek Role User saat ini
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. PRIVASI TABEL: CUSTOMERS (Pelanggan)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers Visibility" ON public.customers;
DROP POLICY IF EXISTS "Customers Management" ON public.customers;

-- Aturan Melihat: Admin/Manager boleh lihat SEMUA. Employee hanya yang miliknya.
CREATE POLICY "Customers Visibility" ON public.customers
FOR SELECT USING (
  (get_my_role() IN ('admin', 'manager')) 
  OR 
  (employee_id = auth.uid())
);

-- Aturan Insert/Update: Admin/Manager bebas. Employee boleh tambah/edit pelanggan sendiri.
CREATE POLICY "Customers Insert Update" ON public.customers
FOR INSERT WITH CHECK (
  (get_my_role() IN ('admin', 'manager')) 
  OR 
  (employee_id = auth.uid())
);

CREATE POLICY "Customers Update" ON public.customers
FOR UPDATE USING (
  (get_my_role() IN ('admin', 'manager')) 
  OR 
  (employee_id = auth.uid())
);

-- PROTEKSI EKSTRA: Hanya Admin/Manager yang boleh MENGHAPUS pelanggan
CREATE POLICY "Customers Delete" ON public.customers
FOR DELETE USING (
  get_my_role() IN ('admin', 'manager')
);


-- 3. PRIVASI TABEL: PRODUCTS (Katalog)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Products" ON public.products;
DROP POLICY IF EXISTS "Auth Manage Products" ON public.products;
DROP POLICY IF EXISTS "Auth Insert Products" ON public.products;
DROP POLICY IF EXISTS "Auth Update Products" ON public.products;
DROP POLICY IF EXISTS "Auth Delete Products" ON public.products;

-- Siapapun yang login bisa lihat
CREATE POLICY "Products Read" ON public.products FOR SELECT USING (true);

-- Hanya Admin/Manager yang bisa kelola (Add/Edit/Delete)
CREATE POLICY "Products Management" ON public.products
FOR ALL USING (get_my_role() IN ('admin', 'manager'));


-- 4. PRIVASI TABEL: BUSINESS PROFILE
ALTER TABLE public.business_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profile Read" ON public.business_profile;
DROP POLICY IF EXISTS "Profile Update" ON public.business_profile;

-- Semua user login bisa lihat info bisnis
CREATE POLICY "Profile Read" ON public.business_profile FOR SELECT USING (true);

-- Hanya Admin yang bisa edit profil bisnis
CREATE POLICY "Profile Update" ON public.business_profile
FOR UPDATE USING (get_my_role() = 'admin');


-- 5. PRIVASI TABEL: CUSTOMER VISITS / SURVEY
ALTER TABLE public.customer_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "View visits" ON public.customer_visits;
DROP POLICY IF EXISTS "Create visits" ON public.customer_visits;

-- Perketat: Hanya boleh lihat kunjungan miliknya atau jika admin
CREATE POLICY "Visits Visibility" ON public.customer_visits
FOR SELECT USING (
  (get_my_role() IN ('admin', 'manager')) 
  OR 
  (user_id = auth.uid())
);

-- Hanya bisa create untuk dirinya sendiri
CREATE POLICY "Visits Creation" ON public.customer_visits
FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 6. PRIVASI TABEL: ORDERS (Pesanan)
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Orders Visibility" ON public.orders;
DROP POLICY IF EXISTS "Orders Entry" ON public.orders;

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


-- 7. PRIVASI TABEL: ATTENDANCE (Absensi)
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Attendance Visibility" ON public.attendance;
DROP POLICY IF EXISTS "Attendance Entry" ON public.attendance;
DROP POLICY IF EXISTS "Attendance Update" ON public.attendance;

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

CREATE POLICY "Attendance Update" ON public.attendance
FOR UPDATE USING (
  employee_id = auth.uid()
);


-- 8. PROTEKSI TABEL USERS (Penting!)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users Visibility" ON public.users;
DROP POLICY IF EXISTS "Users Self Update" ON public.users;
DROP POLICY IF EXISTS "Users Access" ON public.users;
DROP POLICY IF EXISTS "Users Management Admin" ON public.users;

-- Admin bisa lihat semua, user biasa hanya bisa lihat dirinya sendiri
CREATE POLICY "Users Access" ON public.users
FOR SELECT USING (
  (get_my_role() IN ('admin', 'manager')) 
  OR 
  (id = auth.uid())
);

-- User tidak boleh ubah role sendiri! Hanya admin yang bisa update user
CREATE POLICY "Users Management Admin" ON public.users
FOR UPDATE USING (get_my_role() = 'admin');

-- Selesai! Keamanan Data & Proteksi Admin diperketat. 🔒
