-- =====================================================
-- FIX CONSTRAINT ERROR - ON CONFLICT SPECIFICATION
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- 1. Cek apakah tabel password_reset_tokens ada
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'password_reset_tokens'
) AS table_exists;

-- 2. Cek constraint yang ada saat ini
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'password_reset_tokens'::regclass;

-- 3. Drop tabel jika ada masalah dengan constraint
DROP TABLE IF EXISTS password_reset_tokens CASCADE;

-- 4. Buat ulang tabel dengan constraint yang benar
CREATE TABLE password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Tambah unique constraint untuk user_id (satu user hanya bisa punya satu token aktif)
    UNIQUE(user_id)
);

-- 5. Buat indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- 6. Enable RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies
DROP POLICY IF EXISTS "Admin can manage reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Users can view own reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Admin can create reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Allow token usage updates" ON password_reset_tokens;

-- 8. Buat policies
CREATE POLICY "Admin can manage reset tokens" ON password_reset_tokens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Users can view own reset tokens" ON password_reset_tokens
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admin can create reset tokens" ON password_reset_tokens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Allow token usage updates" ON password_reset_tokens
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role IN ('admin', 'manager') OR users.id = password_reset_tokens.user_id)
        )
    );

-- 9. Test insert untuk memastikan constraint bekerja
-- Uncomment untuk test
-- INSERT INTO password_reset_tokens (user_id, email, token, expires_at) 
-- VALUES (auth.uid(), 'test@example.com', 'TEST01', NOW() + INTERVAL '30 minutes');

-- 10. Cek hasil
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'password_reset_tokens'
ORDER BY constraint_type;

-- SUCCESS MESSAGE
SELECT 'SUCCESS: Tabel password_reset_tokens berhasil dibuat dengan constraint yang benar!' as status;