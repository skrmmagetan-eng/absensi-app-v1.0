# 📱 PANDUAN LENGKAP RESET PASSWORD VIA WHATSAPP

## 🎯 OVERVIEW SISTEM
Sistem reset password terintegrasi dengan WhatsApp untuk SKRM Absensi System. User mendapat kode reset via WhatsApp dan bisa reset password langsung di aplikasi.

## 🔧 KOMPONEN SISTEM

### 1. Generator Token (`direct_whatsapp_generator.html`)
- **Fungsi**: Generate token reset dan kirim via WhatsApp
- **Database**: Terintegrasi dengan Supabase
- **Timer**: Token berlaku 30 menit
- **Target**: Karyawan yang terdaftar

### 2. Validasi Token (`src/utils/simple-reset.js`)
- **Fungsi**: Validasi token dan update password
- **Security**: RLS policies untuk akses database
- **Flow**: Token → Validasi → Update Password → Mark Used

### 3. UI Reset (`src/pages/login.js`)
- **Modal**: "Lupa Password?" di halaman login
- **Input**: Token 6 karakter + password baru
- **UX**: Auto-format token, validasi real-time

## 📋 CARA PENGGUNAAN

### Untuk Admin (Generate Token):
1. Buka `direct_whatsapp_generator.html`
2. Pilih karyawan dari dropdown
3. Klik "Generate & Save to Database"
4. Klik "Buka WhatsApp" untuk kirim pesan
5. Token tersimpan otomatis ke database

### Untuk Karyawan (Reset Password):
1. Buka aplikasi absensi
2. Klik "Lupa Password?" di halaman login
3. Masukkan kode 6 karakter dari WhatsApp
4. Buat password baru (minimal 6 karakter)
5. Konfirmasi password
6. Klik "Reset Password"

## 🛠️ SETUP & MAINTENANCE

### Database Setup:
```sql
-- Jalankan DATABASE_FIXES_FINAL.sql untuk:
-- 1. Fix email confirmation
-- 2. Fix RLS policies
-- 3. Setup maintenance queries
```

### Environment Variables:
```env
VITE_SUPABASE_URL=https://nsyndnagwrfzgyifriak.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Maintenance:
- Token expired otomatis dihapus
- Setiap user hanya bisa punya 1 token aktif
- Cleanup manual via SQL jika diperlukan

## 🔍 TROUBLESHOOTING

### Error "HTTP 406" saat validasi token:
- **Penyebab**: RLS policies terlalu ketat
- **Solusi**: Jalankan `DATABASE_FIXES_FINAL.sql`

### Error "Email not confirmed" saat login:
- **Penyebab**: Email belum diverifikasi di Supabase Auth
- **Solusi**: Jalankan bagian email confirmation di `DATABASE_FIXES_FINAL.sql`

### Token "tidak valid atau expired":
- **Penyebab**: Token sudah digunakan atau > 30 menit
- **Solusi**: Generate token baru dengan generator

### Generator gagal save ke database:
- **Penyebab**: Service key salah atau user tidak ditemukan
- **Solusi**: Cek service key di generator, pastikan user ada di database

## 📱 TEMPLATE PESAN WHATSAPP

```
🔐 RESET PASSWORD - SKRM ABSENSI

Halo [NAMA],

Kode reset password Anda:
*[TOKEN]*

📱 Cara reset password:
1. Buka aplikasi absensi
2. Klik "Lupa Password?"
3. Masukkan kode: *[TOKEN]*
4. Buat password baru

⏰ Kode berlaku sampai: [WAKTU]
🔒 Jangan bagikan kode ini ke siapa pun

SKRM Management System
```

## 🎯 FITUR KEAMANAN

- **Token Expiry**: 30 menit otomatis expired
- **Single Use**: Token hanya bisa dipakai 1x
- **User Limit**: 1 token aktif per user
- **RLS Security**: Database access terkontrol
- **Audit Trail**: Log semua aktivitas token

## 📊 MONITORING

### Cek Token Aktif:
```sql
SELECT token, email, expires_at, used 
FROM password_reset_tokens 
WHERE expires_at > NOW() 
ORDER BY created_at DESC;
```

### Cleanup Token Expired:
```sql
DELETE FROM password_reset_tokens 
WHERE expires_at < NOW();
```

## ✅ STATUS SISTEM
- ✅ Generator: Working dengan database integration
- ✅ Validation: HTTP 406 error fixed
- ✅ Login: Email confirmation fixed
- ✅ WhatsApp: Template dan link generation working
- ✅ Security: RLS policies configured properly

## 📞 KONTAK ADMIN
- **WhatsApp**: +62 857-3960-5089 (Shaka Abrisam)
- **Email**: shakadigital.id@gmail.com