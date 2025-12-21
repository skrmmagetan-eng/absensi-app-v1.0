# SKRM Absensi App v1.0

Aplikasi manajemen absensi dan kunjungan untuk SKRM dengan fitur:

## Fitur Utama
- ✅ Sistem login dan autentikasi
- ✅ Dashboard admin dan karyawan
- ✅ Manajemen karyawan dengan import CSV
- ✅ Tracking kunjungan dengan GPS
- ✅ Import data kunjungan dari CSV
- ✅ Manajemen pelanggan
- ✅ Sistem pesanan dan katalog
- ✅ KPI dan reporting

## Teknologi
- Frontend: Vanilla JavaScript + Vite
- Backend: Supabase (PostgreSQL + Auth)
- Deployment: Vercel
- PWA Support

## URL Aplikasi
- Production: https://absensi-app-v1-0.vercel.app

## Setup Database
Jalankan file SQL berikut di Supabase SQL Editor:
1. `add_employee_fields.sql` - Tambah field karyawan
2. `add_attendance_location.sql` - Tambah field lokasi kunjungan

## Import Data
- **Karyawan**: Gunakan template `template_karyawan.csv`
- **Kunjungan**: Gunakan template `template_kunjungan.csv`

Lihat panduan lengkap di:
- `IMPORT_CSV_GUIDE.md` - Import data karyawan
- `IMPORT_VISITS_GUIDE.md` - Import data kunjungan