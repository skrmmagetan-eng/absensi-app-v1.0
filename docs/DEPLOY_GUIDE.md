# 🚀 Panduan Deploy Aplikasi SKRM ke Vercel

Aplikasi ini dibangun menggunakan **Vite**, yang sangat kompatibel dengan Vercel.

## Persiapan Sebelum Deploy
Pastikan Anda memiliki data kredensial Supabase Anda:
1. `VITE_SUPABASE_URL`
2. `VITE_SUPABASE_ANON_KEY`

---

## Opsi 1: Deploy via Vercel CLI (Tercepat dari Terminal)

Jika Anda ingin deploy langsung dari komputer ini tanpa setup GitHub:

1. **Install Vercel CLI** (jika belum):
   ```bash
   npm install -g vercel
   ```

2. **Login ke Vercel**:
   ```bash
   npx vercel login
   ```
   (Ikuti instruksi browser untuk login).

3. **Mulai Deploy**:
   Jalankan perintah ini di dalam folder `SKRM`:
   ```bash
   npx vercel
   ```
   
   **Jawab pertanyaan configurasi seperti ini:**
   - Set up and deploy? **Y**
   - Which scope? **(Pilih akun Anda)**
   - Link to existing project? **N**
   - Project name? **absensi-app-v1-0** (atau bebas)
   - In which directory? **./** (Langsung Enter)
   - Want to modify these settings? **N** (Default Vite settings sudah benar)

4. **Tunggu Proses Build & Upload**.
   Setelah selesai, Anda akan mendapatkan link `Production: https://absensi-app-v1-0...vercel.app`.

5. **⚠️ PENTING: Set Environment Variables**
   Aplikasi **TIDAK AKAN JALAN** jika Anda belum memasukkan setup Supabase.
   
   - Buka Link `Inspect` yang muncul di terminal (Dashboard Vercel).
   - Masuk ke menu **Settings** > **Environment Variables**.
   - Tambahkan key berikut (Salin dari file `.env` Anda atau Supabase Dashboard):
     - Key: `VITE_SUPABASE_URL` | Value: `https://xyz...supabase.co`
     - Key: `VITE_SUPABASE_ANON_KEY` | Value: `eyJ...`
   - **Simpan**.
   - Lakukan **Redeploy** (atau jalankan `npx vercel --prod` di terminal) agar settingan efek.

---

## Opsi 2: Deploy via GitHub (Untuk Jangka Panjang)

1. Repository GitHub sudah tersedia di: https://github.com/skrmmagetan-eng/absensi-app-v1.0
2. Buka [Vercel Dashboard](https://vercel.com/dashboard).
3. Klik **Add New Project**.
4. Import repository GitHub `skrmmagetan-eng/absensi-app-v1.0`.
5. Framework Preset akan otomatis terdeteksi sebagai **Vite**.
6. Di bagian **Environment Variables**:
   - Masukkan `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`.
7. Klik **Deploy**.

---

## Tips Tambahan
- **Single Page Application (SPA)**: Karena ini SPA, Vercel biasanya sudah otomatis menangani routing. Namun jika Anda mengalami error 404 saat refresh halaman selain Home, file `vercel.json` sudah tersedia di root project dengan konfigurasi yang sesuai.
- **Database Rules**: Pastikan Anda sudah menjalankan script SQL `privacy_rules.sql` di Supabase agar data aman saat diakses publik.

Selamat Mengudara! 🌍