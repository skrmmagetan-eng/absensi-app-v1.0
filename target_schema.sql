-- Tabel untuk Perencanaan Target Sales
CREATE TABLE IF NOT EXISTS public.sales_plans (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.users(id),
  target_name text not null,
  target_amount numeric default 0,
  current_status text default 'planning', -- 'planning', 'on_progress', 'goal', 'failed'
  deadline date,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- RLS (Row Level Security)
ALTER TABLE public.sales_plans ENABLE ROW LEVEL SECURITY;

-- Policy: User bisa melihat dan mengelola target miliknya sendiri
CREATE POLICY "Users can manage their own plans" 
ON public.sales_plans 
FOR ALL 
TO authenticated 
USING (auth.uid() = employee_id);

-- Policy: Admin & Manager bisa melihat SEMUA target
CREATE POLICY "Admins and Managers can view all plans" 
ON public.sales_plans 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);
