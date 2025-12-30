# 🔐 PANDUAN RESET PASSWORD SISTEM ABSENSI

## 📋 OVERVIEW
Sistem reset password menggunakan kode 6 digit yang dikirim melalui WhatsApp. Proses ini aman, cepat, dan mudah digunakan oleh admin dan karyawan.

---

## 📱 CARA KERJA RESET PASSWORD

### 🔧 **UNTUK ADMIN**

#### 1. **Akses Halaman Manajemen Karyawan**
- Login sebagai Admin/Manager
- Navigasi ke **👥 Manajemen Karyawan**
- Lihat daftar semua karyawan

#### 2. **Inisiasi Reset Password**
- Cari karyawan yang membutuhkan reset password
- Klik tombol **🔑** (Reset Password) di kolom Aksi
- Sistem akan menampilkan konfirmasi:
  ```
  🔐 RESET PASSWORD VIA WHATSAPP
  
  Kirim kode reset password ke:
  📱 08123456789
  👤 Nama Karyawan
  📧 email@karyawan.com
  
  Kode akan berlaku selama 30 menit.
  
  Lanjutkan?
  ```

#### 3. **Generate Kode Reset**
- Klik **OK** untuk melanjutkan
- Sistem akan:
  - Generate kode 6 digit (contoh: `ABC123`)
  - Menyimpan kode ke database dengan expiry 30 menit
  - Membuat pesan WhatsApp otomatis

#### 4. **Kirim via WhatsApp**
- Modal sukses akan muncul dengan opsi:
  - **📱 Kirim via WhatsApp** - Buka WhatsApp langsung
  - **📋 Copy Pesan SMS** - Copy pesan untuk dikirim manual
  - **🔑 Copy Kode Saja** - Copy kode reset saja

#### 5. **Pesan WhatsApp Otomatis**
```
🔐 RESET PASSWORD - SKRM ABSENSI

Halo [Nama Karyawan],

Kode reset password Anda:
*ABC123*

📱 Cara reset password:
1. Buka aplikasi absensi
2. Klik "Lupa Password?"
3. Masukkan kode: *ABC123*
4. Buat password baru

⏰ Kode berlaku sampai: 14:30
🔒 Jangan bagikan kode ini ke siapa pun

SKRM Management System
```

---

### 👤 **UNTUK KARYAWAN**

#### 1. **Akses Halaman Reset**
- Buka aplikasi absensi
- Di halaman login, klik **"Lupa Password?"**
- Modal reset password akan muncul

#### 2. **Input Kode Reset**
- Masukkan kode 6 digit yang diterima via WhatsApp
- Kode otomatis berubah ke huruf besar
- Contoh: ketik `abc123` → otomatis jadi `ABC123`

#### 3. **Buat Password Baru**
- Masukkan password baru (minimal 6 karakter)
- Konfirmasi password baru
- Klik **"Reset Password"**

#### 4. **Login dengan Password Baru**
- Setelah berhasil reset, login dengan:
  - Email yang sama
  - Password baru yang sudah dibuat

---

## 🔒 KEAMANAN SISTEM

### **Token Security**
- ✅ Kode 6 digit random (A-Z, 0-9)
- ✅ Berlaku hanya 30 menit
- ✅ One-time use (sekali pakai)
- ✅ Auto-delete setelah digunakan
- ✅ Stored encrypted di database

### **Access Control**
- ✅ Hanya admin yang bisa generate kode
- ✅ RLS (Row Level Security) di database
- ✅ Logging semua aktivitas reset
- ✅ Validasi nomor telepon

### **Data Protection**
- ✅ Tidak ada password disimpan di log
- ✅ Token expired otomatis dihapus
- ✅ Audit trail lengkap
- ✅ Encrypted communication

---

## 🛠️ TROUBLESHOOTING

### **Problem: Kode Tidak Diterima**
**Solusi:**
1. Pastikan nomor telepon karyawan benar
2. Cek format nomor (08xxx atau +62xxx)
3. Pastikan WhatsApp aktif di nomor tersebut
4. Generate ulang kode jika perlu

### **Problem: Kode Expired**
**Solusi:**
1. Kode berlaku 30 menit
2. Generate kode baru jika sudah expired
3. Instruksikan karyawan segera gunakan kode

### **Problem: Kode Tidak Valid**
**Solusi:**
1. Pastikan kode diketik dengan benar
2. Kode case-sensitive (huruf besar semua)
3. Pastikan kode belum pernah digunakan
4. Generate kode baru jika masih error

### **Problem: Database Error**
**Solusi:**
1. Pastikan tabel `password_reset_tokens` sudah dibuat
2. Jalankan script SQL setup jika belum
3. Cek RLS policies di Supabase
4. Verifikasi service role key di .env

---

## 📊 MONITORING & ANALYTICS

### **Admin Dashboard**
- Total reset requests per bulan
- Success rate reset password
- Most frequent reset users
- Average response time

### **Security Logs**
- Semua aktivitas reset tercatat
- IP address dan timestamp
- User agent dan device info
- Failed attempts tracking

---

## 🔧 KONFIGURASI TEKNIS

### **Environment Variables**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_KEY=your-service-key
```

### **Database Tables**
```sql
-- Tabel untuk menyimpan token reset
password_reset_tokens (
  id, user_id, email, token, 
  expires_at, used, created_at, used_at
)
```

### **API Endpoints**
- `simpleReset.initiateReset()` - Generate kode
- `simpleReset.useToken()` - Validasi & reset
- WhatsApp API: `https://wa.me/{phone}?text={message}`

---

## 📞 SUPPORT & BANTUAN

### **Untuk Admin**
- Baca file `auth-protection.md` untuk aturan keamanan
- Jangan ubah kode auth tanpa persetujuan
- Backup database sebelum update sistem

### **Untuk Karyawan**
- Hubungi admin jika tidak terima kode
- Jangan bagikan kode reset ke orang lain
- Gunakan password yang kuat (min 6 karakter)

### **Emergency Contact**
- Admin IT: [Nomor Admin]
- Email Support: [Email Support]
- WhatsApp Admin: [WhatsApp Admin]

---

## 📈 BEST PRACTICES

### **Untuk Admin**
1. ✅ Verifikasi identitas karyawan sebelum reset
2. ✅ Instruksikan karyawan ganti password berkala
3. ✅ Monitor aktivitas reset yang mencurigakan
4. ✅ Backup data sebelum maintenance

### **Untuk Karyawan**
1. ✅ Simpan password di tempat aman
2. ✅ Jangan gunakan password yang mudah ditebak
3. ✅ Logout setelah selesai menggunakan aplikasi
4. ✅ Laporkan aktivitas mencurigakan ke admin

---

## 🔄 UPDATE LOG

| Tanggal | Versi | Perubahan |
|---------|-------|-----------|
| 2024-12-30 | 1.0 | Initial documentation |
| | | WhatsApp integration |
| | | 6-digit token system |
| | | 30-minute expiry |

---

**📝 Catatan:** Dokumentasi ini akan diupdate seiring dengan perkembangan sistem. Pastikan selalu menggunakan versi terbaru.