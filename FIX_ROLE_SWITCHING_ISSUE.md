# 🔧 Fix Role Switching Issue

## Masalah
Employee login berubah menjadi admin secara otomatis setelah menggunakan berbagai tombol dan menu.

## Penyebab yang Mungkin
1. **Duplicate users** - Ada beberapa user dengan email sama tapi role berbeda
2. **Security validation bug** - Validasi keamanan mengambil profile user yang salah
3. **State management issue** - State aplikasi ter-corrupt atau ter-cache
4. **Database RLS policy issue** - Policy keamanan database tidak bekerja dengan benar

## Solusi yang Sudah Diterapkan

### 1. Enhanced Security Validation
- ✅ Menambahkan validasi ID user yang lebih ketat
- ✅ Mencegah automatic role switching
- ✅ Force re-login saat role change terdeteksi
- ✅ Logging semua security events

### 2. Role Security Utility
- ✅ Utility class untuk validasi role changes
- ✅ Comprehensive logging untuk debugging
- ✅ Export security log untuk analisis

### 3. Debug Tools
- ✅ Debug page untuk memeriksa status user
- ✅ Database checker untuk detect duplicate users
- ✅ Security log viewer

## Cara Testing & Debugging

### Step 1: Jalankan Database Check
```sql
-- Jalankan di Supabase SQL Editor
-- File: check_duplicate_users.sql

SELECT 
    email,
    COUNT(*) as user_count,
    STRING_AGG(id::text, ', ') as user_ids,
    STRING_AGG(role, ', ') as roles,
    STRING_AGG(name, ', ') as names
FROM users 
GROUP BY email 
HAVING COUNT(*) > 1;
```

### Step 2: Test dengan Debug Tools
1. Login sebagai employee
2. Buka browser console
3. Jalankan script debug:
```javascript
// Copy paste isi file debug_role_switching.js ke console
// Atau load file fix_role_switching_bug.js
```

### Step 3: Monitor Security Events
1. Gunakan aplikasi normal
2. Check console untuk security logs
3. Jika role berubah, akan ada log detail

### Step 4: Access Debug Page
- Tambahkan route ke debug page (sementara)
- Atau akses via console: `window.location.hash = '#debug-security'`

## Quick Fix Commands

### Jika Menemukan Duplicate Users:
```sql
-- HATI-HATI! Backup dulu sebelum delete
-- Hapus user duplicate (bukan yang asli)
DELETE FROM users WHERE id = 'duplicate-user-id-here';
```

### Force Clean Session:
```javascript
// Jalankan di console untuk clean session
sessionStorage.clear();
localStorage.clear();
window.location.reload();
```

### Manual Security Check:
```javascript
// Check current user status
const user = state.getState('user');
const profile = state.getState('profile');
console.log('User:', user);
console.log('Profile:', profile);

// Check database
const dbProfile = await db.getUserProfile(user.id);
console.log('DB Profile:', dbProfile);
```

## Monitoring

### Security Events yang Dilog:
- `PROFILE_ID_MISMATCH` - ID user tidak match
- `ROLE_CHANGE_ATTEMPT` - Attempt untuk ganti role
- `UNAUTHORIZED_ADMIN_ACCESS` - Akses admin tanpa izin
- `ADMIN_ACCESS_GRANTED` - Akses admin yang sah

### Console Commands:
```javascript
// Lihat security log
roleSecurity.getSecurityLog()

// Export security log
roleSecurity.exportLog()

// Manual security check
manualSecurityCheck()
```

## Expected Behavior Setelah Fix

1. **Employee login** - Tetap sebagai employee
2. **Role change detection** - Force logout dan minta login ulang
3. **Admin access** - Hanya bisa diakses oleh admin/manager yang sah
4. **Security logging** - Semua events tercatat dengan detail

## Jika Masalah Masih Ada

1. Check duplicate users di database
2. Export security log untuk analisis
3. Check RLS policies di Supabase
4. Verify user creation process
5. Check if ada script/code yang modify user role

## Files yang Dimodifikasi

- ✅ `src/main.js` - Enhanced security validation
- ✅ `src/utils/role-security.js` - New security utility
- ✅ `src/pages/debug-security.js` - Debug tools
- ✅ `debug_role_switching.js` - Console debug script
- ✅ `fix_role_switching_bug.js` - Quick fix script
- ✅ `check_duplicate_users.sql` - Database diagnostic

## Testing Checklist

- [ ] Login sebagai employee
- [ ] Navigate ke berbagai menu
- [ ] Check console untuk security logs
- [ ] Verify role tidak berubah otomatis
- [ ] Test admin access (should be blocked)
- [ ] Check database untuk duplicate users
- [ ] Export security log jika ada issue