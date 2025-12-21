# Panduan Import Data Karyawan dari CSV

## Langkah-langkah Import

### 1. Persiapan Database
Jalankan script SQL berikut di Supabase SQL Editor untuk menambahkan kolom tambahan:

```sql
-- Add additional fields to users table for CSV import
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS location text;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS notes text;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS sales_amount numeric DEFAULT 0;
```

### 2. Persiapan Data CSV

#### Format CSV yang Diperlukan:
```csv
nama,email,lokasi,catatan,foto,penjualan,link_foto
Adi Saputra,adi@example.com,Jakarta,Sales terbaik,foto1.jpg,5000000,https://drive.google.com/file/d/1234/view
Budi Santoso,budi@example.com,Bandung,Manager area,foto2.jpg,3000000,https://drive.google.com/file/d/5678/view
```

#### Kolom yang Wajib:
- `nama` - Nama lengkap karyawan
- `email` - Email unik untuk login

#### Kolom Opsional:
- `lokasi` - Lokasi kerja karyawan
- `catatan` - Catatan tambahan
- `foto` - Nama file foto (tidak digunakan saat ini)
- `penjualan` - Jumlah penjualan (angka)
- `link_foto` - URL foto profil (Google Drive, dll)

### 3. Export dari Google Sheets
1. Buka Google Sheets dengan data karyawan
2. File → Download → Comma Separated Values (.csv)
3. Simpan file CSV

### 4. Import ke Aplikasi
1. Login sebagai Admin
2. Buka menu "👥 Manajemen Karyawan"
3. Klik tombol "📁 Import CSV"
4. Download template jika diperlukan
5. Upload file CSV Anda
6. Preview data akan muncul
7. Klik "Import Data" untuk memproses

### 5. Hasil Import
- Password default: `123456` untuk semua karyawan baru
- Role default: `employee`
- Status default: `active`
- Karyawan dapat login dan mengubah password mereka

## Tips dan Catatan

### Format Link Foto Google Drive
Untuk menggunakan foto dari Google Drive:
1. Upload foto ke Google Drive
2. Klik kanan → Get link → Anyone with the link can view
3. Copy link dan paste ke kolom `link_foto`

### Troubleshooting
- **Email sudah ada**: Skip baris tersebut, tidak akan menimpa data existing
- **Format email salah**: Baris akan di-skip dengan error message
- **Kolom wajib kosong**: Baris akan di-skip

### Keamanan
- Semua karyawan baru mendapat password default `123456`
- Minta karyawan segera mengubah password setelah login pertama
- Admin dapat reset password kapan saja melalui tombol 🔑

## Contoh Data dari Spreadsheet SKRM

Berdasarkan data spreadsheet Anda, format yang sesuai:

```csv
nama,email,lokasi,catatan,penjualan,link_foto
Adi Saputra Subali,adi.saputra@skrm.com,Ponorogo,Karyawan terbaik,7896456,https://drive.google.com/file/d/1abc123/view
Aji Nugroho,aji.nugroho@skrm.com,Ponorogo,Sales senior,7837364,https://drive.google.com/file/d/1def456/view
```

Sesuaikan email dengan domain perusahaan Anda dan pastikan semua link foto dapat diakses publik.