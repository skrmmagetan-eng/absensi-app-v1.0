# 🔧 SOLUSI ERROR: Policy Already Exists

## ❌ **Error yang Terjadi:**
```
ERROR: 42710: policy "Admin can manage reset tokens" for table "password_reset_tokens" already exists
```

## ✅ **SOLUSI CEPAT:**

### **OPSI 1: Gunakan Script Final (RECOMMENDED)**

Jalankan **`fix_reset_final.sql`** di Supabase SQL Editor. Script ini:
- ✅ Drop existing policies dulu
- ✅ Buat ulang semua policies
- ✅ Aman dijalankan berulang kali

### **OPSI 2: Manual Drop Policies Dulu**

Jika masih error, jalankan satu per satu:

```sql
-- 1. Drop semua existing policies
DROP POLICY IF EXISTS "Admin can manage reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Users can view own reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Admin can create reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Allow token usage updates" ON password_reset_tokens;
```

Kemudian jalankan script untuk buat policies baru.

### **OPSI 3: Quick Fix Tanpa Policies (UNTUK TESTING)**

Jika masih ada masalah dengan policies, gunakan **`quick_fix_only_table.sql`**:
- ✅ Hanya buat tabel tanpa RLS policies
- ✅ Disable RLS sementara untuk testing
- ✅ Reset password tetap bisa berfungsi

## 🎯 **Langkah Selanjutnya Setelah Database OK:**

### **1. Restart Aplikasi**
```bash
# Stop dengan Ctrl+C
npm run dev
```

### **2. Test Konfigurasi**
Buka browser console dan jalankan:
```javascript
// Copy isi file check_reset_config.js dan paste di console
```

### **3. Test Reset Password**
1. Login sebagai admin
2. Buka halaman Kelola Karyawan
3. Klik tombol 🔑 Reset Password
4. Pastikan muncul modal sukses

## 🔍 **Cek Apakah Sudah Berhasil:**

### **Cek Tabel di Supabase Dashboard:**
1. **Table Editor** → Cari `password_reset_tokens`
2. Pastikan tabel ada dengan kolom: id, user_id, email, token, expires_at, used, used_at, created_at

### **Cek di Browser Console:**
```javascript
// Test environment variable
console.log('Service Key:', import.meta.env.VITE_SUPABASE_SERVICE_KEY ? 'ADA' : 'TIDAK ADA');

// Test module import
import('./src/utils/custom-reset.js').then(module => {
    console.log('Custom Reset Module:', module.customReset ? 'OK' : 'ERROR');
}).catch(err => console.log('Import Error:', err));
```

## 🚨 **Jika Masih Ada Masalah:**

### **Error: "Service role key tidak dikonfigurasi"**
- Pastikan file `.env` berisi `VITE_SUPABASE_SERVICE_KEY`
- Restart aplikasi setelah update `.env`

### **Error: "User tidak ditemukan"**
- Pastikan email karyawan terdaftar di tabel `users`
- Cek data karyawan di halaman admin

### **Error: "Nomor telepon tidak tersedia"**
- Update data karyawan, isi field nomor telepon
- Format: 08xxx atau +62xxx

## ✅ **Indikator Sukses:**

Setelah semua langkah di atas:
- ✅ Console browser tidak ada error merah
- ✅ Tombol Reset Password berfungsi
- ✅ Modal sukses muncul dengan link WhatsApp
- ✅ Link WhatsApp bisa dibuka dengan pesan terformat
- ✅ Karyawan bisa reset password dengan token

---

**🎯 PRIORITAS:** Jalankan `fix_reset_final.sql` dulu, lalu restart aplikasi, baru test reset password!