-- 1. Tabel Kunjungan (Survey)
CREATE TABLE IF NOT EXISTS public.customer_visits (
  id uuid default gen_random_uuid() primary key,
  customer_id uuid references public.customers(id),
  user_id uuid references public.users(id),
  latitude float,
  longitude float,
  notes text,
  photo_url text,
  created_at timestamp with time zone default now()
);

-- RLS
ALTER TABLE public.customer_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View visits" ON public.customer_visits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Create visits" ON public.customer_visits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 2. Fungsi SQL untuk Hitung KPI Otomatis (Canggih & Cepat)
create or replace function get_kpi_summary(start_date timestamp, end_date timestamp)
returns table (
  user_id uuid,
  user_name text,
  visit_count bigint,
  new_customer_count bigint,
  order_count bigint,
  total_sales numeric,
  score numeric -- Skor simple (0-100)
)
language plpgsql
as $$
begin
  return query
  select 
    u.id,
    u.name,
    -- 1. Hitung Absensi (Check-in Kunjungan)
    (select count(*) from attendance a 
     where a.employee_id = u.id and a.check_in_time between start_date and end_date) as visit_count,
     
    -- 2. Hitung Pelanggan Baru (New Acquisition)
    (select count(*) from customers c 
     where c.employee_id = u.id and c.created_at between start_date and end_date) as new_customer_count,
     
    -- 3. Hitung Order & Sales
    (select count(*) from orders o 
     where o.employee_id = u.id and o.created_at between start_date and end_date) as order_count,
    coalesce(
      (select sum(total_amount) from orders o 
       where o.employee_id = u.id and o.created_at between start_date and end_date), 
    0) as total_sales,

    -- Rumus Skor Sederhana: (Visits * 2) + (New Cust * 10) + (Orders * 5)
    least(100, 
      (
        ((select count(*) from attendance a where a.employee_id = u.id and a.check_in_time between start_date and end_date) * 2) +
        ((select count(*) from customers c where c.employee_id = u.id and c.created_at between start_date and end_date) * 10) +
        ((select count(*) from orders o where o.employee_id = u.id and o.created_at between start_date and end_date) * 5)
      )::numeric
    ) as score

  from users u
  where u.role = 'employee';
end;
$$;
