-- ================================================================
-- 🐄 ADD LIVESTOCK POPULATION & FEED TRACKING
-- Tambah fitur tracking populasi ternak dan pakan
-- ================================================================

-- 1. Tambah kolom populasi dan pakan ke tabel customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS population_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS population_unit VARCHAR(10) DEFAULT 'ekor', -- 'ekor' atau 'kg'
ADD COLUMN IF NOT EXISTS feed_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS feed_brand VARCHAR(100),
ADD COLUMN IF NOT EXISTS daily_feed_consumption DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS feed_unit VARCHAR(10) DEFAULT 'kg', -- 'kg' atau 'sak'
ADD COLUMN IF NOT EXISTS last_population_update TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_feed_update TIMESTAMPTZ DEFAULT NOW();

-- 2. Buat tabel untuk tracking history perubahan populasi & pakan
CREATE TABLE IF NOT EXISTS public.livestock_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  update_type VARCHAR(20) NOT NULL, -- 'population' atau 'feed'
  
  -- Data populasi (jika update_type = 'population')
  old_population_count INTEGER,
  new_population_count INTEGER,
  population_unit VARCHAR(10),
  
  -- Data pakan (jika update_type = 'feed')
  old_feed_type VARCHAR(100),
  new_feed_type VARCHAR(100),
  old_feed_brand VARCHAR(100),
  new_feed_brand VARCHAR(100),
  old_daily_consumption DECIMAL(10,2),
  new_daily_consumption DECIMAL(10,2),
  feed_unit VARCHAR(10),
  
  -- Metadata
  notes TEXT,
  visit_id UUID, -- Link ke attendance jika update saat visit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Buat indexes untuk performa
CREATE INDEX IF NOT EXISTS idx_livestock_updates_customer 
ON public.livestock_updates(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_livestock_updates_employee 
ON public.livestock_updates(employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_livestock_updates_type 
ON public.livestock_updates(update_type, created_at DESC);

-- 4. RLS Policies untuk livestock_updates
ALTER TABLE public.livestock_updates ENABLE ROW LEVEL SECURITY;

-- Policy untuk insert (karyawan bisa insert update mereka sendiri)
CREATE POLICY "Enable insert for authenticated users" ON public.livestock_updates
FOR INSERT TO authenticated WITH CHECK (auth.uid() = employee_id);

-- Policy untuk select (admin/manager lihat semua, employee lihat yang mereka buat)
CREATE POLICY "Enable select based on role" ON public.livestock_updates
FOR SELECT TO authenticated USING (
  (get_my_role() IN ('admin', 'manager')) 
  OR 
  (employee_id = auth.uid())
);

-- Policy untuk update (hanya yang membuat bisa update)
CREATE POLICY "Enable update for own records" ON public.livestock_updates
FOR UPDATE TO authenticated USING (employee_id = auth.uid());

-- 5. Trigger untuk auto-update timestamps
CREATE OR REPLACE FUNCTION update_livestock_updates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_livestock_updates_timestamp ON public.livestock_updates;
CREATE TRIGGER update_livestock_updates_timestamp 
    BEFORE UPDATE ON public.livestock_updates 
    FOR EACH ROW EXECUTE FUNCTION update_livestock_updates_timestamp();

-- 6. Function untuk mencatat perubahan populasi
CREATE OR REPLACE FUNCTION log_population_update(
    p_customer_id UUID,
    p_employee_id UUID,
    p_old_count INTEGER,
    p_new_count INTEGER,
    p_unit VARCHAR(10),
    p_notes TEXT DEFAULT NULL,
    p_visit_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    update_id UUID;
BEGIN
    INSERT INTO public.livestock_updates (
        customer_id, employee_id, update_type,
        old_population_count, new_population_count, population_unit,
        notes, visit_id
    ) VALUES (
        p_customer_id, p_employee_id, 'population',
        p_old_count, p_new_count, p_unit,
        p_notes, p_visit_id
    ) RETURNING id INTO update_id;
    
    -- Update timestamp di customers
    UPDATE public.customers 
    SET last_population_update = NOW()
    WHERE id = p_customer_id;
    
    RETURN update_id;
END;
$$ LANGUAGE plpgsql;

-- 7. Function untuk mencatat perubahan pakan
CREATE OR REPLACE FUNCTION log_feed_update(
    p_customer_id UUID,
    p_employee_id UUID,
    p_old_type VARCHAR(100),
    p_new_type VARCHAR(100),
    p_old_brand VARCHAR(100),
    p_new_brand VARCHAR(100),
    p_old_consumption DECIMAL(10,2),
    p_new_consumption DECIMAL(10,2),
    p_unit VARCHAR(10),
    p_notes TEXT DEFAULT NULL,
    p_visit_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    update_id UUID;
BEGIN
    INSERT INTO public.livestock_updates (
        customer_id, employee_id, update_type,
        old_feed_type, new_feed_type,
        old_feed_brand, new_feed_brand,
        old_daily_consumption, new_daily_consumption, feed_unit,
        notes, visit_id
    ) VALUES (
        p_customer_id, p_employee_id, 'feed',
        p_old_type, p_new_type,
        p_old_brand, p_new_brand,
        p_old_consumption, p_new_consumption, p_unit,
        p_notes, p_visit_id
    ) RETURNING id INTO update_id;
    
    -- Update timestamp di customers
    UPDATE public.customers 
    SET last_feed_update = NOW()
    WHERE id = p_customer_id;
    
    RETURN update_id;
END;
$$ LANGUAGE plpgsql;

-- 8. View untuk summary populasi & pakan per customer
CREATE OR REPLACE VIEW customer_livestock_summary AS
SELECT 
    c.id,
    c.name,
    c.livestock_type,
    c.population_count,
    c.population_unit,
    c.feed_type,
    c.feed_brand,
    c.daily_feed_consumption,
    c.feed_unit,
    c.last_population_update,
    c.last_feed_update,
    u.name as employee_name,
    -- Hitung total update dalam 30 hari terakhir
    (SELECT COUNT(*) FROM livestock_updates lu 
     WHERE lu.customer_id = c.id 
     AND lu.created_at >= NOW() - INTERVAL '30 days') as recent_updates_count
FROM customers c
LEFT JOIN users u ON c.employee_id = u.id;

-- SUCCESS MESSAGE
SELECT '✅ Livestock population & feed tracking added successfully!' as status;