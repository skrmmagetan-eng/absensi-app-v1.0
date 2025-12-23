# 🚨 ATASI ERROR CONSOLE - Reset Password WhatsApp

## 🔍 **Error yang Terlihat di Screenshot:**

Dari console browser, terlihat beberapa error:
1. ❌ **Database error** - kemungkinan tabel `password_reset_tokens` belum ada
2. ❌ **Module loading error** - masalah import `custom-reset.js`
3. ❌ **Storage error** - masalah akses storage bucket
4. ❌ **Permission error** - RLS policy belum benar

## ✅ **SOLUSI STEP-BY-STEP:**

### **STEP 1: Perbaiki Database (WAJIB)**

1. **Buka Supabase Dashboard** → **SQL Editor**
2. **Copy semua isi file `fix_console_errors.sql`**
3. **Paste dan jalankan** di SQL Editor
4. **Pastikan semua query berhasil** (tidak ada error merah)

### **STEP 2: Restart Aplikasi (WAJIB)**

```bash
# Stop aplikasi dengan Ctrl+C
# Kemudian start lagi
npm run dev
```

**⚠️ PENTING:** Environment variable `VITE_SUPABASE_SERVICE_KEY` hanya ter-load setelah restart!

### **STEP 3: Test Konfigurasi**

1. **Buka browser console** (F12)
2. **Copy isi file `check_reset_config.js`**
3. **Paste dan jalankan** di console
4. **Lihat hasil test** - semua harus ✅

### **STEP 4: Clear Browser Cache**

```
Ctrl + F5 (hard refresh)
atau
Ctrl + Shift + R
```

### **STEP 5: Test Reset Password**

1. **Login sebagai admin**
2. **Buka halaman Kelola Karyawan**
3. **Klik tombol 🔑 Reset Password**
4. **Pastikan muncul modal sukses**

## 🔧 **Troubleshooting Spesifik:**

### **Error: "password_reset_tokens does not exist"**
```sql
-- Jalankan di Supabase SQL Editor
CREATE TABLE password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Error: "Service role key tidak dikonfigurasi"**
1. Pastikan file `.env` berisi:
   ```
   VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
2. Restart aplikasi
3. Test di console: `console.log(import.meta.env.VITE_SUPABASE_SERVICE_KEY)`

### **Error: "Permission denied"**
```sql
-- Jalankan di Supabase SQL Editor
CREATE POLICY "Admin can manage reset tokens" ON password_reset_tokens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );
```

### **Error: Module import failed**
1. **Hard refresh** browser (Ctrl+F5)
2. **Cek network tab** - ada file yang gagal load?
3. **Cek syntax error** di file JavaScript

## 🎯 **Checklist Setelah Perbaikan:**

- [ ] ✅ File `fix_console_errors.sql` berhasil dijalankan
- [ ] ✅ Aplikasi sudah di-restart
- [ ] ✅ `check_reset_config.js` menunjukkan semua ✅
- [ ] ✅ Console browser tidak ada error merah
- [ ] ✅ Tombol Reset Password berfungsi
- [ ] ✅ Modal sukses muncul dengan link WhatsApp

## 📱 **Test Final:**

1. **Pilih karyawan** yang ada nomor teleponnya
2. **Klik Reset Password**
3. **Pastikan muncul modal** dengan:
   - ✅ Token 6 karakter (contoh: ABC123)
   - ✅ Tombol "📱 Kirim via WhatsApp"
   - ✅ Link WhatsApp bisa diklik
4. **Klik link WhatsApp** → harus buka WhatsApp dengan pesan

## 🚨 **Jika Masih Error:**

### **Cek Console Browser:**
```javascript
// Test environment variables
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Service Key:', import.meta.env.VITE_SUPABASE_SERVICE_KEY ? 'ADA' : 'TIDAK ADA');

// Test module import
import('./src/utils/custom-reset.js').then(module => {
    console.log('Custom Reset:', module.customReset ? 'OK' : 'ERROR');
}).catch(err => {
    console.log('Import Error:', err.message);
});
```

### **Cek Database:**
1. **Supabase Dashboard** → **Table Editor**
2. **Pastikan tabel `password_reset_tokens` ada**
3. **Cek RLS policies** di tab Policies

### **Cek Storage:**
1. **Supabase Dashboard** → **Storage**
2. **Pastikan bucket `app-assets` ada**
3. **Cek policies** untuk public access

## 🎯 **Hasil Akhir yang Diharapkan:**

- ✅ **Console browser bersih** (tidak ada error merah)
- ✅ **Reset password berfungsi** 100%
- ✅ **WhatsApp link terbuka** dengan pesan terformat
- ✅ **Karyawan bisa reset password** dengan token

---

**💡 TIP:** Jika masih ada masalah, screenshot console error yang baru dan tunjukkan untuk analisis lebih lanjut.