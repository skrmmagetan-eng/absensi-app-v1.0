# 📧 Panduan Setup Email Reset Password - Supabase

## Masalah: Email Reset Password Tidak Terkirim

Jika tombol reset password menunjukkan "sukses" tapi email tidak masuk, ikuti langkah troubleshooting berikut:

## 🔧 Langkah Troubleshooting

### 1. **Cek Konfigurasi Email Template di Supabase**

1. Buka **Supabase Dashboard** → Project Anda
2. Pilih **Authentication** → **Email Templates**
3. Pastikan template **"Reset Password"** sudah dikonfigurasi:
   - ✅ **Subject**: `Reset Your Password`
   - ✅ **Body**: Harus berisi `{{ .ConfirmationURL }}` atau `{{ .Token }}`

### 2. **Konfigurasi SMTP (Recommended)**

**Default Supabase Email** memiliki batasan dan sering masuk spam. Setup SMTP custom:

1. **Authentication** → **Settings** → **SMTP Settings**
2. Gunakan provider seperti:
   - **Gmail SMTP**
   - **SendGrid**
   - **Mailgun**
   - **AWS SES**

#### Contoh Gmail SMTP:
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
SMTP User: your-email@gmail.com
SMTP Pass: your-app-password (bukan password biasa!)
```

### 3. **Cek Email Template Content**

Template harus berisi link reset yang valid:

```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, please ignore this email.</p>
<p>This link will expire in 1 hour.</p>
```

### 4. **Verifikasi Domain & DNS**

Jika menggunakan custom domain:
1. Setup **SPF Record**
2. Setup **DKIM**
3. Setup **DMARC**

### 5. **Test Email Delivery**

1. Cek **Authentication** → **Users**
2. Pilih user → **Send Reset Password Email**
3. Monitor **Logs** untuk error messages

## 🚨 Common Issues & Solutions

### Issue 1: "Email not confirmed"
**Solution**: User harus konfirmasi email signup dulu

### Issue 2: Email masuk spam
**Solution**: 
- Setup SMTP custom
- Tambahkan SPF/DKIM records
- Gunakan domain yang reputable

### Issue 3: "Invalid email"
**Solution**: Pastikan email terdaftar di tabel `auth.users`

### Issue 4: Template tidak ada
**Solution**: 
1. Buka **Email Templates**
2. Enable **"Reset Password"** template
3. Customize subject & body

## 🔍 Debug Steps

### 1. Cek Console Browser
```javascript
// Buka Developer Tools → Console
// Lihat error messages saat klik reset
```

### 2. Cek Supabase Logs
1. **Supabase Dashboard** → **Logs**
2. Filter by **Authentication**
3. Cari error messages

### 3. Test Manual Reset
1. **Authentication** → **Users**
2. Klik user → **Reset Password**
3. Cek apakah email terkirim

## ✅ Quick Fix Checklist

- [ ] SMTP dikonfigurasi dengan benar
- [ ] Email template "Reset Password" aktif
- [ ] Template berisi `{{ .ConfirmationURL }}`
- [ ] Domain/DNS records setup (jika custom domain)
- [ ] Test dengan email lain
- [ ] Cek folder spam
- [ ] Verifikasi user email sudah confirmed

## 🛠️ Alternative Solutions

### 1. Manual Reset via Dashboard
1. **Authentication** → **Users**
2. Pilih user → **Reset Password**
3. Copy temporary password
4. Berikan ke user secara manual

### 2. Custom Reset Function
Buat fungsi custom yang:
1. Generate reset token
2. Simpan di database
3. Kirim via WhatsApp/SMS
4. Validasi token saat reset

## 📞 Support

Jika masih bermasalah:
1. Cek Supabase Documentation
2. Contact Supabase Support
3. Gunakan alternative email provider