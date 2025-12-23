# 📱 LANGKAH SELANJUTNYA - Setelah Edit Nomor Telepon

## ✅ **Status Saat Ini:**
- ✅ Nomor telepon real untuk shakadigital.id sudah diedit: **085156789012**
- 🔄 Perlu tambah kolom phone ke database
- 🔄 Perlu update nomor telepon karyawan lainnya

## 🚀 **LANGKAH WAJIB (Lakukan Berurutan):**

### **STEP 1: Tambah Kolom Phone ke Database**

**Buka Supabase Dashboard → SQL Editor, jalankan:**
```sql
-- Tambah kolom phone
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

-- Update Shaka Abrisam dengan nomor real
UPDATE users SET phone = '085156789012'
WHERE email = 'shakadigital.id@gmail.com';
```

### **STEP 2: Update Nomor Telepon Karyawan Lainnya**

**Opsi A: Gunakan Nomor Dummy (Untuk Testing)**
```sql
UPDATE users SET phone = '081234567890' WHERE email = 'achmadverry20@gmail.com';
UPDATE users SET phone = '081234567891' WHERE email = 'anggaskharisma@gmail.com';
UPDATE users SET phone = '081234567892' WHERE email = 'dwikydiaspriambodo@gmail.com';
UPDATE users SET phone = '081234567893' WHERE email = 'mazis977@gmail.com';
UPDATE users SET phone = '081234567894' WHERE email = 'wicaksonopurwanto@gmail.com';
```

**Opsi B: Minta Nomor Real dari Karyawan**
- Tanyakan nomor WhatsApp aktif masing-masing karyawan
- Update satu per satu dengan nomor real mereka

### **STEP 3: Restart Aplikasi**
```bash
# Stop aplikasi dengan Ctrl+C
npm run dev
```

### **STEP 4: Test Reset Password**

1. **Login sebagai admin**
2. **Buka halaman Kelola Karyawan**
3. **Klik tombol 🔑 Reset Password** pada Shaka Abrisam
4. **Pastikan muncul modal sukses** dengan link WhatsApp
5. **Klik "📱 Kirim via WhatsApp"** → harus buka WhatsApp dengan pesan

## 📋 **Cek Apakah Sudah Berhasil:**

### **Cek Database:**
```sql
-- Cek kolom phone sudah ada
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'phone';

-- Cek data karyawan
SELECT name, email, phone, role FROM users 
WHERE role IN ('employee', 'manager') 
ORDER BY name;
```

### **Cek Aplikasi:**
1. **Console browser** tidak ada error merah
2. **Reset password** berfungsi tanpa error
3. **Modal sukses** muncul dengan link WhatsApp
4. **Link WhatsApp** bisa dibuka

## 🎯 **Format Nomor Telepon yang Benar:**

- ✅ **085156789012** (format yang Anda gunakan)
- ✅ **081234567890** (format standar Indonesia)
- ✅ **+6285156789012** (dengan kode negara)
- ❌ **0851-5678-9012** (jangan pakai tanda hubung)
- ❌ **0851 5678 9012** (jangan pakai spasi)

## 📱 **Test WhatsApp Link:**

Setelah reset password berhasil, link WhatsApp akan berbentuk:
```
https://wa.me/6285156789012?text=🔐%20RESET%20PASSWORD%20-%20SKRM%20ABSENSI...
```

Link ini akan:
- ✅ Buka WhatsApp di HP/Desktop
- ✅ Otomatis isi nomor 6285156789012
- ✅ Pesan sudah terformat dengan token reset

## 🚨 **Jika Ada Masalah:**

### **Error: "Column phone does not exist"**
- ✅ Jalankan `ALTER TABLE users ADD COLUMN phone TEXT;`
- ✅ Restart aplikasi

### **Error: "Nomor telepon tidak tersedia"**
- ✅ Pastikan kolom phone terisi di database
- ✅ Cek dengan query: `SELECT phone FROM users WHERE email = 'shakadigital.id@gmail.com';`

### **WhatsApp tidak terbuka**
- ✅ Pastikan WhatsApp terinstall
- ✅ Coba buka link manual di browser
- ✅ Cek format nomor telepon

## 📞 **Untuk Mendapatkan Nomor Real Karyawan:**

1. **Tanyakan langsung** ke masing-masing karyawan
2. **Pastikan nomor WhatsApp aktif** (bisa terima pesan)
3. **Update di database** dengan format 08xxxxxxxxxx
4. **Test reset password** untuk memastikan berfungsi

---

**🎯 PRIORITAS SEKARANG:** Jalankan STEP 1 dan STEP 3, lalu test dengan nomor Shaka Abrisam yang sudah real!