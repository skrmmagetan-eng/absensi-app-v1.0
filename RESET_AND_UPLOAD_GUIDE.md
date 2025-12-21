# Panduan Reset Data dan Upload Pelanggan

## Langkah 1: Reset Semua Data (Kecuali User Tertentu)

### 1.1 Jalankan Script Reset
Buka Supabase SQL Editor dan jalankan file `reset_all_data_keep_users.sql`

Script ini akan:
- ✅ Hapus semua data: kunjungan, absensi, pesanan, target, produk
- ✅ Hapus semua pelanggan
- ✅ Hapus semua user KECUALI:
  - Admin: skrmmagetan@gmail.com
  - Manager: manager@skrm.com  
  - Purwanto: wicaksonopurwanto@gmail.com
  - Angga Septian Kharisma: anggaskharisma@gmail.com
  - Miftakhul Azis: mazis977@gmail.com
  - Achmad Verry Trisnanto: achmadverry20@gmail.com
  - Dwiky Dias Priambodo: dwikydiaspriambodo@gmail.com
- ✅ Update nama dan role user yang dipertahankan

### 1.2 Verifikasi User
Setelah reset, cek user yang tersisa:
```sql
SELECT id, email, name, role, status FROM public.users ORDER BY role, name;
```

## Langkah 2: Upload Data Pelanggan

### Opsi A: Upload Langsung via SQL (Recommended)

#### 2.1 Edit File SQL
Edit file `insert_customers_bulk.sql` dengan data pelanggan Anda yang sebenarnya.

#### 2.2 Jalankan Script
Jalankan script di Supabase SQL Editor untuk insert data pelanggan.

### Opsi B: Upload via CSV + Python Script

#### 2.1 Siapkan File CSV
Gunakan template `template_pelanggan.csv` dan isi dengan data pelanggan Anda:

```csv
nama,telepon,alamat,petugas,latitude,longitude,catatan
Pak Sukadi,081234567890,Jl. Raya No. 1 Ponorogo,wicaksonopurwanto@gmail.com,-7.668678,111.287454,Peternak broiler
```

#### 2.2 Convert CSV ke SQL
```bash
python csv_to_sql_customers.py template_pelanggan.csv > customers_insert.sql
```

#### 2.3 Jalankan SQL yang Dihasilkan
Copy paste hasil file `customers_insert.sql` ke Supabase SQL Editor.

### Opsi C: Upload via Aplikasi Web (Import CSV)

#### 2.1 Login sebagai Admin
Login ke aplikasi dengan akun admin: skrmmagetan@gmail.com

#### 2.2 Buat Fitur Import Pelanggan
Saat ini belum ada fitur import pelanggan di aplikasi. Jika diperlukan, saya bisa buatkan.

## Langkah 3: Verifikasi Data

### 3.1 Cek Jumlah Data
```sql
-- Cek jumlah user
SELECT role, COUNT(*) FROM public.users GROUP BY role;

-- Cek jumlah pelanggan per petugas
SELECT 
    u.name as petugas,
    COUNT(c.id) as jumlah_pelanggan
FROM public.users u
LEFT JOIN public.customers c ON u.id = c.employee_id
WHERE u.role = 'employee'
GROUP BY u.id, u.name
ORDER BY u.name;
```

### 3.2 Cek Data Pelanggan
```sql
SELECT 
    c.name as customer_name,
    c.phone,
    c.address,
    u.name as employee_name,
    c.latitude,
    c.longitude,
    c.notes
FROM public.customers c
JOIN public.users u ON c.employee_id = u.id
ORDER BY u.name, c.name;
```

## Format Data Pelanggan

### Kolom yang Diperlukan:
- **nama** (wajib): Nama pelanggan
- **telepon** (opsional): Nomor telepon
- **alamat** (opsional): Alamat lengkap
- **petugas** (wajib): Email petugas yang bertanggung jawab
- **latitude** (opsional): Koordinat GPS latitude
- **longitude** (opsional): Koordinat GPS longitude  
- **catatan** (opsional): Catatan tambahan

### Email Petugas yang Valid:
- wicaksonopurwanto@gmail.com (Purwanto)
- anggaskharisma@gmail.com (Angga Septian Kharisma)
- mazis977@gmail.com (Miftakhul Azis)
- achmadverry20@gmail.com (Achmad Verry Trisnanto)
- dwikydiaspriambodo@gmail.com (Dwiky Dias Priambodo)

## Troubleshooting

### Error: Foreign Key Constraint
Jika ada error foreign key saat reset, jalankan script dalam urutan yang benar (hapus child tables dulu).

### Error: User Not Found
Pastikan email petugas di data pelanggan sesuai dengan email user yang ada di database.

### Error: Invalid Coordinates
Pastikan format koordinat menggunakan titik (.) sebagai decimal separator, bukan koma.

## Setelah Upload

Setelah data berhasil diupload:
1. ✅ Login ke aplikasi dan cek data pelanggan
2. ✅ Test fitur kunjungan dengan data pelanggan baru
3. ✅ Test import CSV kunjungan dengan data pelanggan yang sudah ada