# 🔧 SOLUSI: ON CONFLICT Constraint Error

## ❌ **Error yang Terjadi:**
```
Gagal menyimpan token: Database error: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

## 🔍 **Penyebab Masalah:**
Kode menggunakan `upsert` dengan `onConflict: 'user_id'`, tetapi tabel `password_reset_tokens` tidak memiliki unique constraint pada kolom `user_id`.

## ✅ **SOLUSI SUDAH DITERAPKAN:**

### **1. Update Kode JavaScript** ✅
Saya sudah mengubah `custom-reset.js` untuk:
- ✅ **Hapus token lama** untuk user yang sama
- ✅ **Insert token baru** tanpa menggunakan upsert
- ✅ **Tidak bergantung** pada unique constraint

### **2. Perbaikan Database** 
Jalankan **`fix_constraint_error.sql`** untuk:
- ✅ **Drop dan buat ulang** tabel dengan constraint yang benar
- ✅ **Tambah unique constraint** pada `user_id`
- ✅ **Buat ulang policies** yang diperlukan

## 🚀 **LANGKAH PERBAIKAN:**

### **OPSI 1: Gunakan Kode yang Sudah Diperbaiki (QUICK FIX)**

1. **Restart aplikasi** (kode sudah diperbaiki):
   ```bash
   npm run dev
   ```

2. **Test reset password** langsung
   - Login sebagai admin
   - Coba reset password Shaka Abrisam
   - Seharusnya berhasil tanpa error constraint

### **OPSI 2: Perbaiki Database Constraint (PERMANENT FIX)**

1. **Jalankan `fix_constraint_error.sql`** di Supabase SQL Editor
2. **Restart aplikasi**
3. **Test reset password**

## 🔍 **Cara Kerja Solusi Baru:**

### **Sebelum (Bermasalah):**
```javascript
// Menggunakan upsert dengan onConflict
.upsert({...}, { onConflict: 'user_id' })
```

### **Sesudah (Diperbaiki):**
```javascript
// 1. Hapus token lama untuk user ini
await db.supabase
  .from('password_reset_tokens')
  .delete()
  .eq('user_id', userId);

// 2. Insert token baru
await db.supabase
  .from('password_reset_tokens')
  .insert({...});
```

## 🎯 **Test Apakah Sudah Berhasil:**

### **1. Test Reset Password:**
1. **Login sebagai admin**
2. **Klik Reset Password** pada Shaka Abrisam
3. **Pastikan muncul modal sukses** (bukan error)
4. **Cek console browser** - tidak ada error merah

### **2. Cek Database:**
```sql
-- Cek apakah token berhasil disimpan
SELECT * FROM password_reset_tokens 
WHERE email = 'shakadigital.id@gmail.com'
ORDER BY created_at DESC;
```

### **3. Test WhatsApp Link:**
- **Klik "📱 Kirim via WhatsApp"**
- **Link harus terbuka** dengan nomor 6285156789012
- **Pesan sudah terformat** dengan token reset

## 🚨 **Jika Masih Ada Error:**

### **Error: "password_reset_tokens does not exist"**
```sql
-- Jalankan untuk buat tabel
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

### **Error: "Permission denied"**
- ✅ Pastikan login sebagai admin
- ✅ Jalankan policies di `fix_constraint_error.sql`

### **Error: "Service role key tidak dikonfigurasi"**
- ✅ Pastikan file `.env` berisi `VITE_SUPABASE_SERVICE_KEY`
- ✅ Restart aplikasi setelah update `.env`

## 📱 **Langkah Selanjutnya Setelah Berhasil:**

1. **Test dengan karyawan lain** yang sudah ada nomor teleponnya
2. **Minta nomor WhatsApp real** dari karyawan lainnya
3. **Update database** dengan nomor real mereka
4. **Test reset password** untuk semua karyawan

## ✅ **Indikator Sukses:**

- ✅ **Console browser bersih** (tidak ada error merah)
- ✅ **Modal sukses muncul** dengan token 6 karakter
- ✅ **Link WhatsApp terbuka** dengan nomor yang benar
- ✅ **Pesan terformat** dengan instruksi reset password
- ✅ **Token tersimpan** di database dengan benar

---

**🎯 PRIORITAS:** Restart aplikasi dulu (kode sudah diperbaiki), lalu test reset password dengan Shaka Abrisam!