-- =====================================================
-- DATABASE FIXES FINAL - SKRM Absensi System
-- Gabungan semua fix SQL yang diperlukan
-- =====================================================

-- ===================
-- 1. FIX EMAIL CONFIRMATION
-- ===================
-- Cek user yang belum confirmed
SELECT 
    id,
    email,
    email_confirmed_at,
    created_at,
    CASE 
        WHEN email_confirmed_at IS NULL THEN '❌ Not Confirmed'
        ELSE '✅ Confirmed'
    END as status
FROM auth.users 
WHERE email IN (
    'shakadigital.id@gmail.com',
    'achmadverry20@gmail.com',
    'anggaskharisma@gmail.com',
    'dwikydiaspriambodo@gmail.com',
    'mazis977@gmail.com',
    'wicaksonopurwanto@gmail.com'
)
ORDER BY created_at DESC;

-- Confirm email untuk semua user
UPDATE auth.users 
SET 
    email_confirmed_at = NOW(),
    updated_at = NOW()
WHERE email_confirmed_at IS NULL
AND email IN (
    'shakadigital.id@gmail.com',
    'achmadverry20@gmail.com',
    'anggaskharisma@gmail.com',
    'dwikydiaspriambodo@gmail.com',
    'mazis977@gmail.com',
    'wicaksonopurwanto@gmail.com'
);

-- ===================
-- 2. FIX HTTP 406 ERROR (RLS POLICIES)
-- ===================
-- Drop semua existing policies yang bermasalah
DROP POLICY IF EXISTS "Admin can manage reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Users can view own reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Admin can create reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Allow token usage updates" ON password_reset_tokens;
DROP POLICY IF EXISTS "Allow token validation" ON password_reset_tokens;
DROP POLICY IF EXISTS "Allow token updates" ON password_reset_tokens;
DROP POLICY IF EXISTS "Allow token creation" ON password_reset_tokens;
DROP POLICY IF EXISTS "Allow token usage" ON password_reset_tokens;
DROP POLICY IF EXISTS "Allow token cleanup" ON password_reset_tokens;

-- Buat policy yang benar untuk token validation
CREATE POLICY "Allow token validation" ON password_reset_tokens
    FOR SELECT USING (true);

CREATE POLICY "Allow token creation" ON password_reset_tokens
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow token usage" ON password_reset_tokens
    FOR UPDATE USING (true);

CREATE POLICY "Allow token cleanup" ON password_reset_tokens
    FOR DELETE USING (true);

-- Pastikan RLS enabled
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- ===================
-- 3. MAINTENANCE QUERIES
-- ===================
-- Cleanup expired tokens
DELETE FROM password_reset_tokens 
WHERE expires_at < NOW() - INTERVAL '1 hour';

-- Cek token yang ada
SELECT 
    token,
    email,
    used,
    expires_at,
    created_at,
    CASE 
        WHEN expires_at > NOW() THEN '✅ Valid'
        ELSE '❌ Expired'
    END as status
FROM password_reset_tokens 
ORDER BY created_at DESC 
LIMIT 10;

-- Cek policies yang aktif
SELECT 
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'password_reset_tokens';

-- ===================
-- 4. VERIFICATION
-- ===================
-- Test query yang sama seperti di aplikasi
SELECT * FROM password_reset_tokens
WHERE token = 'TEST01' 
AND used = false 
AND expires_at > NOW();

-- SUCCESS MESSAGE
SELECT 'SUCCESS: Semua database fixes berhasil diterapkan!' as status;