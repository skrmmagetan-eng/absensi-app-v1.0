-- =====================================================
-- FIX CONSOLE ERRORS - JALANKAN DI SUPABASE SQL EDITOR
-- =====================================================

-- 1. Cek apakah tabel password_reset_tokens ada
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'password_reset_tokens'
) AS table_exists;

-- 2. Jika tabel tidak ada, buat tabel password_reset_tokens
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

-- 4. Enable RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies jika ada (untuk menghindari konflik)
DROP POLICY IF EXISTS "Admin can manage reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Users can view own reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Admin can create reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Allow token usage updates" ON password_reset_tokens;

-- 6. Buat RLS policies yang benar
-- Policy untuk admin mengelola semua token
CREATE POLICY "Admin can manage reset tokens" ON password_reset_tokens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Policy untuk user melihat token sendiri
CREATE POLICY "Users can view own reset tokens" ON password_reset_tokens
    FOR SELECT USING (user_id = auth.uid());

-- Policy untuk insert token (admin only)
CREATE POLICY "Admin can create reset tokens" ON password_reset_tokens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );

-- Policy untuk update token (mark as used)
CREATE POLICY "Allow token usage updates" ON password_reset_tokens
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role IN ('admin', 'manager') OR users.id = password_reset_tokens.user_id)
        )
    );

-- 7. Cek storage bucket app-assets
SELECT name, public FROM storage.buckets WHERE name = 'app-assets';

-- 8. Jika bucket tidak ada, buat bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('app-assets', 'app-assets', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 9. Drop existing storage policies jika ada
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- 10. Buat RLS policy untuk storage (tanpa IF NOT EXISTS)
CREATE POLICY "Public Access" ON storage.objects 
    FOR SELECT USING (bucket_id = 'app-assets');

CREATE POLICY "Authenticated users can upload" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'app-assets' AND auth.role() = 'authenticated');

-- 11. Cek hasil
SELECT 
    'password_reset_tokens' as table_name,
    COUNT(*) as row_count
FROM password_reset_tokens
UNION ALL
SELECT 
    'users' as table_name,
    COUNT(*) as row_count  
FROM users
UNION ALL
SELECT 
    'storage.buckets' as table_name,
    COUNT(*) as row_count
FROM storage.buckets WHERE name = 'app-assets';

COMMENT ON TABLE password_reset_tokens IS 'Table untuk menyimpan token reset password via WhatsApp/SMS';