# Panduan Import Data Kunjungan dari CSV

## Langkah-langkah Import

### 1. Persiapan Database
Jalankan script SQL berikut di Supabase SQL Editor untuk menambahkan kolom lokasi:

```sql
-- Add location fields to attendance table for CSV import
ALTER TABLE public.attendance 
ADD COLUMN IF NOT EXISTS latitude float,
ADD COLUMN IF NOT EXISTS longitude float;
```

### 2. Persiapan Data CSV

#### Format CSV yang Diperlukan:
```csv
tanggal,nama,lokasi,catatan,foto,petugas,img_foto
2/5/2025 14:45,Pak Sukadi,"-7.668678,111.287454",Cek kandang eks broiler,https://drive.google.com/...,Purwanto,https://drive.google.com/uc?export=view&id=...
3/5/2025 15:05,Budi,"-7.633924,111.289592",Konsultasi kandang koloni,https://drive.google.com/...,Purwanto,https://drive.google.com/uc?export=view&id=...
```

#### Kolom yang Wajib:
- `tanggal` - Format: DD/MM/YYYY HH:MM (contoh: 2/5/2025 14:45)
- `nama` - Nama pelanggan/lokasi kunjungan
- `petugas` - Nama petugas (harus sudah terdaftar di sistem)

#### Kolom Opsional:
- `lokasi` - Koordinat GPS dalam format: latitude;longitude (contoh: -7.668678;111.287454)
- `catatan` - Catatan kunjungan
- `foto` - Link foto Google Drive (format view)
- `img_foto` - Link foto Google Drive (format direct view)

### 3. Persiapan Data dari Format Asli

Jika data Anda dalam format seperti ini:
```
Tanggal: 2/5/2025 14:45
Nama: Pak Sukadi
Lokasi: -7.668678,111.287454
Catatan: Cek kandang eks broiler
Petugas: Purwanto
```

Konversi ke format CSV:
1. Ubah koma di koordinat menjadi titik koma (;)
2. Pastikan format tanggal konsisten: DD/MM/YYYY HH:MM
3. Nama petugas harus sesuai dengan yang ada di database

### 4. Import ke Aplikasi
1. Login sebagai Admin
2. Buka menu "📋 Riwayat Seluruh User"
3. Pastikan tab "📍 Kunjungan" aktif
4. Klik tombol "📁 Import Kunjungan CSV"
5. Download template jika diperlukan
6. Upload file CSV Anda
7. Preview data akan muncul
8. Klik "Import Data" untuk memproses

### 5. Hasil Import
- Kunjungan akan tercatat dengan tanggal sesuai data CSV
- Pelanggan baru akan otomatis dibuat jika belum ada
- Koordinat GPS akan tersimpan jika tersedia
- Foto bukti akan terhubung ke Google Drive

## Tips dan Catatan

### Format Tanggal
- Gunakan format: DD/MM/YYYY HH:MM
- Contoh valid: 2/5/2025 14:45, 15/12/2024 09:30
- Jika jam tidak ada, akan diset ke 12:00

### Format Koordinat GPS
- Gunakan koma (,) atau titik koma (;) sebagai pemisah
- Format: latitude,longitude atau latitude;longitude
- Contoh: -7.668678,111.287454 atau -7.668678;111.287454
- Jika menggunakan koma, bungkus dengan tanda kutip: "-7.668678,111.287454"

### Nama Petugas
- Harus sesuai persis dengan nama di database karyawan
- Case insensitive (tidak peduli huruf besar/kecil)
- Jika petugas tidak ditemukan, baris akan di-skip

### Link Foto Google Drive
Untuk menggunakan foto dari Google Drive:
1. Upload foto ke Google Drive
2. Klik kanan → Get link → Anyone with the link can view
3. Copy link untuk kolom `foto`
4. Untuk kolom `img_foto`, ubah format:
   - Dari: `https://drive.google.com/file/d/FILE_ID/view`
   - Ke: `https://drive.google.com/uc?export=view&id=FILE_ID`

### Troubleshooting
- **Petugas tidak ditemukan**: Pastikan nama petugas sudah terdaftar di sistem
- **Format tanggal salah**: Gunakan format DD/MM/YYYY HH:MM
- **Koordinat tidak valid**: Gunakan format latitude;longitude dengan titik koma

## Contoh Data Sesuai Format Anda

Berdasarkan data yang Anda berikan:

```csv
tanggal,nama,lokasi,catatan,foto,petugas,img_foto
2/5/2025 14:45,Pak Sukadi,"-7.668678,111.287454",Cek kandang eks broiler,https://drive.google.com/file/d/1xoqJCBmDg9O4ca0JCg5wYbybzZB-sKYH/view,Purwanto,https://drive.google.com/uc?export=view&id=1xoqJCBmDg9O4ca0JCg5wYbybzZB-sKYH
2/5/2025 19:59,Adul Kodir,"-7.639640,111.330534",Test,https://drive.google.com/file/d/12iXoSJB8jyezOXU2XZHsB2zstIJYEcJn/view,Purwanto,https://drive.google.com/uc?export=view&id=12iXoSJB8jyezOXU2XZHsB2zstIJYEcJn
3/5/2025 15:05,Budi,"-7.633924,111.289592",Konsultasi kandang koloni DOC dan Penyakit jamur pada ayam produksi,https://drive.google.com/file/d/1DduarB3YaQpVt40FyFjuwUa6lyIn4pM1/view,Purwanto,https://drive.google.com/uc?export=view&id=1DduarB3YaQpVt40FyFjuwUa6lyIn4pM1
```

Pastikan nama "Purwanto" sudah terdaftar sebagai karyawan di sistem sebelum import.