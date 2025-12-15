-- =====================================================
-- PASSWORD RESET SCRIPT FOR SUPABASE
-- =====================================================
-- Note: Password cannot be updated directly via SQL in Supabase
-- You must use one of these methods:

-- =====================================================
-- METHOD 1: Using Supabase Dashboard (EASIEST)
-- =====================================================
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Find the user by email
-- 3. Click the "..." menu → "Reset Password"
-- 4. Copy the reset link and send to user OR set password manually

-- =====================================================
-- METHOD 2: Generate Password Reset Email
-- =====================================================
-- This requires your app's reset password flow to be set up
-- Run this in Supabase SQL Editor:

-- For Admin (skrmmagetan@gmail.com)
-- NOTE: This will send a reset email if SMTP is configured
-- SELECT auth.send_reset_password_email('skrmmagetan@gmail.com');

-- For Manager
-- SELECT auth.send_reset_password_email('manager@skrm.com');

-- For Employee 1 (Aji Nugroho)
-- SELECT auth.send_reset_password_email('affiliocare@gmail.com');

-- For Employee 2 (Samsul Huda)
-- SELECT auth.send_reset_password_email('shakadana05@gmail.com');

-- =====================================================
-- METHOD 3: Manual Dashboard Password Update
-- =====================================================
-- If you want to set specific passwords:
-- 
-- 1. Dashboard → Authentication → Users
-- 2. Click user row → "Send Magic Link" OR
-- 3. Click "..." → Click "Update user" → Enter new password directly
--
-- Suggested Passwords:
-- - Admin (skrmmagetan@gmail.com): skrm2025
-- - Manager (manager@skrm.com): manager123
-- - Employees: 123456 (default)

-- =====================================================
-- METHOD 4: Using Supabase CLI (Advanced)
-- =====================================================
-- If you have Supabase CLI and service role key:
-- 
-- supabase auth update-user ee5ddd1a-a5de-4c74-8a1b-aab726a750a5 --password "skrm2025"
-- supabase auth update-user 1b7c6bea-44fb-433b-bd53-02f5f6d80bd8 --password "manager123"

-- =====================================================
-- VERIFICATION: Check Users Exist
-- =====================================================
SELECT 
    id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users
WHERE email IN (
    'skrmmagetan@gmail.com',
    'manager@skrm.com',
    'affiliocare@gmail.com',
    'shakadana05@gmail.com'
)
ORDER BY email;

-- =====================================================
-- QUICK REFERENCE: Expected Passwords
-- =====================================================
-- Email                      | Password
-- ---------------------------|------------
-- skrmmagetan@gmail.com      | skrm2025
-- manager@skrm.com           | manager123 (or 123456)
-- affiliocare@gmail.com      | 123456
-- shakadana05@gmail.com      | 123456
