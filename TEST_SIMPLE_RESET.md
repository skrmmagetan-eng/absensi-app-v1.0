# 🔧 TEST SIMPLE RESET - Versi Minimal yang Pasti Berhasil

## ✅ **Perubahan yang Sudah Dilakukan:**

- ✅ **Buat `simple-reset.js`** - Versi minimal tanpa kompleksitas
- ✅ **Update `admin-employees.js`** - Gunakan `simpleReset` 
- ✅ **Update `login.js`** - Gunakan `simpleReset.useToken`
- ✅ **Hindari semua bug** yang ada di versi kompleks

## 🚀 **LANGKAH TEST (Lakukan Sekarang):**

### **STEP 1: Pastikan Database Ready**

Jalankan di **Supabase SQL Editor** (jika belum):
```sql
-- Pastikan kolom phone ada
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update nomor Shaka
UPDATE users SET phone = '085156789012'
WHERE email = 'shakadigital.id@gmail.com';

-- Cek hasil
SELECT name, email, phone FROM users 
WHERE email = 'shakadigital.id@gmail.com';
```

### **STEP 2: Restart Aplikasi**
```bash
# Stop dengan Ctrl+C
npm run dev
```

### **STEP 3: Test Manual di Browser Console**

Buka browser console (F12) dan jalankan:
```javascript
// Copy dan paste script debug_current_error.js
// Atau copy dan paste script simple_reset_fix.js
```

### **STEP 4: Test Reset Password di Aplikasi**

1. **Login sebagai admin**
2. **Klik Reset Password** pada **Shaka Abrisam**
3. **Input nomor telepon** jika diminta: `085156789012`
4. **Pastikan muncul modal sukses**

## 🔍 **Keunggulan Simple Reset:**

### **Lebih Sederhana:**
- ✅ **Tidak ada fallback kompleks** untuk kolom phone
- ✅ **Tidak ada upsert** yang bermasalah
- ✅ **Query database minimal** dan straightforward
- ✅ **Error handling sederhana** dan jelas

### **Lebih Reliable:**
- ✅ **Delete lalu insert** token (tidak pakai upsert)
- ✅ **Query user sederhana** (id, name saja)
- ✅ **Validasi phone number** yang jelas
- ✅ **Console logging** yang informatif

## 🎯 **Test Scenarios:**

### **Test 1: Generate Token**
- Klik Reset Password → Modal sukses muncul
- Token 6 karakter ter-generate
- Console log menunjukkan progress

### **Test 2: WhatsApp Link**
- Link format: `https://wa.me/6285156789012?text=...`
- Klik link → WhatsApp terbuka
- Pesan terformat dengan token

### **Test 3: Use Token (Login Page)**
- Buka halaman login
- Klik "Lupa Password?"
- Masukkan token yang di-generate
- Buat password baru → Berhasil

## 🚨 **Jika Masih Error:**

### **Test Manual di Console:**
```javascript
// Test basic functionality
testSimpleReset("Shaka Abrisam", "085156789012");
```

### **Cek Environment Variables:**
```javascript
console.log('Service Key:', import.meta.env.VITE_SUPABASE_SERVICE_KEY ? 'ADA' : 'TIDAK ADA');
```

### **Cek Database:**
```sql
-- Cek tabel password_reset_tokens
SELECT * FROM password_reset_tokens ORDER BY created_at DESC LIMIT 5;

-- Cek user Shaka
SELECT * FROM users WHERE email = 'shakadigital.id@gmail.com';
```

## 📱 **Expected Result:**

Setelah test berhasil:
- ✅ **Modal sukses** dengan token ABC123
- ✅ **Link WhatsApp** terbuka dengan nomor 6285156789012
- ✅ **Pesan terformat** dengan instruksi reset
- ✅ **Console log bersih** tanpa error
- ✅ **Token tersimpan** di database

## 🔄 **Jika Berhasil:**

1. **Update nomor karyawan lain** dengan nomor real
2. **Test reset password** untuk semua karyawan
3. **Dokumentasikan nomor WhatsApp** yang valid
4. **Train admin** cara menggunakan fitur ini

## 📞 **Format Nomor Telepon:**

- ✅ **085156789012** (format Shaka yang sudah benar)
- ✅ **081234567890** (format standar)
- ✅ **+6285156789012** (dengan kode negara)
- ❌ **0851-5678-9012** (jangan pakai tanda hubung)

---

**🎯 PRIORITAS:** Restart aplikasi dan test dengan Shaka Abrisam menggunakan versi simple yang sudah diperbaiki!