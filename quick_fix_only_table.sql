-- =====================================================
-- QUICK FIX - HANYA BUAT TABEL TANPA POLICIES
-- Jalankan ini jika masih ada error dengan policies
-- =====================================================

-- 1. Cek tabel ada atau tidak
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'password_reset_tokens'
) AS table_exists;

-- 2. Buat tabel jika belum ada
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Buat indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- 4. Disable RLS sementara (untuk testing)
ALTER TABLE password_reset_tokens DISABLE ROW LEVEL SECURITY;

-- 5. Cek hasil
SELECT 
    table_name,
    COUNT(*) as row_count
FROM password_reset_tokens, 
     (SELECT 'password_reset_tokens' as table_name) t
GROUP BY table_name
UNION ALL
SELECT 
    'users' as table_name,
    COUNT(*) as row_count  
FROM users;

-- SUCCESS MESSAGE
SELECT 'SUCCESS: Tabel password_reset_tokens berhasil dibuat! RLS disabled untuk testing.' as status;