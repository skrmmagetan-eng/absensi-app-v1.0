---
inclusion: always
---

# 🔒 PROTEKSI SISTEM AUTHENTICATION & RESET PASSWORD

## ⚠️ PERINGATAN PENTING
Script authentication dan reset password sudah FINAL dan BERFUNGSI NORMAL.
**JANGAN UBAH KODE BERIKUT TANPA PERSETUJUAN EKSPLISIT DARI USER!**

## 📋 FILE YANG DILINDUNGI

### Core Authentication Files (JANGAN DIUBAH):
- `src/pages/login.js` - Login system yang sudah stabil
- `src/utils/auth-check.js` - Auto-login dan session management
- `src/utils/simple-reset.js` - Reset password via WhatsApp (WORKING)
- `src/utils/role-security.js` - Role validation dan security logging
- `src/lib/supabase.js` - Database connection dan auth helpers

### Database Schema (SUDAH FINAL):
- `fix_reset_tokens_table.sql` - Tabel password reset tokens
- `fix_constraint_error.sql` - Fix untuk constraint errors
- `privacy_rules.sql` - RLS policies untuk security

### User Management (STABIL):
- `src/pages/admin-employees.js` - Employee management dengan reset password
- `src/utils/custom-reset.js` - Alternative reset system (backup)

## 🚫 ATURAN PROTEKSI

1. **SEBELUM MENGUBAH FILE AUTH:**
   - Tanya user terlebih dahulu
   - Jelaskan alasan perubahan
   - Minta konfirmasi eksplisit

2. **YANG BOLEH DIUBAH TANPA KONFIRMASI:**
   - UI/styling yang tidak mempengaruhi logic auth
   - Penambahan logging/debugging
   - Perbaikan typo di komentar

3. **YANG TIDAK BOLEH DIUBAH:**
   - Logic authentication flow
   - Password reset mechanism
   - Token generation dan validation
   - Database queries untuk auth
   - RLS policies
   - Session management

## ✅ FITUR YANG SUDAH BEKERJA

### Login System:
- ✅ Email/password authentication
- ✅ Remember me functionality
- ✅ Role-based navigation
- ✅ Session management
- ✅ Auto-login check

### Password Reset:
- ✅ Token generation (6 digit)
- ✅ WhatsApp message formatting
- ✅ Token expiration (30 minutes)
- ✅ One-time token usage
- ✅ Admin-only reset capability

### Security:
- ✅ Role-based access control
- ✅ Row-level security policies
- ✅ Inactive account blocking
- ✅ Security event logging
- ✅ Unauthorized access prevention

## 🔧 JIKA HARUS UPDATE

Jika ada kebutuhan update aplikasi yang melibatkan bagian auth:

1. **BACKUP TERLEBIH DAHULU:**
   ```bash
   # Backup file auth penting
   cp src/pages/login.js src/pages/login.js.backup
   cp src/utils/simple-reset.js src/utils/simple-reset.js.backup
   cp src/utils/auth-check.js src/utils/auth-check.js.backup
   ```

2. **KONSULTASI DENGAN USER:**
   - Jelaskan perubahan yang diperlukan
   - Tunjukkan dampak terhadap sistem auth
   - Minta persetujuan eksplisit

3. **TESTING WAJIB:**
   - Test login dengan berbagai role
   - Test reset password end-to-end
   - Test session management
   - Test security policies

## 📞 KONTAK DARURAT

Jika sistem auth bermasalah:
1. Restore dari backup
2. Cek console browser untuk error
3. Verifikasi environment variables
4. Cek Supabase dashboard untuk RLS policies

**INGAT: Sistem auth yang rusak = aplikasi tidak bisa digunakan!**