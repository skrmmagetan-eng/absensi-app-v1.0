# Panduan Import Data CSV ke Database

## Langkah-langkah Import Data

### 1. Persiapan File CSV

**Format CSV untuk Customers:**
```csv
name,phone,address,employee_email,latitude,longitude,notes,created_at
```

**Format CSV untuk Visits:**
```csv
employee_email,customer_name,check_in_time,latitude,longitude,notes,photo_url
```

### 2. Konversi CSV ke SQL

Gunakan script Python yang sudah disediakan:

```bash
# Untuk data customers
python convert_csv_to_sql.py customers data_customers.csv import_customers.sql

# Untuk data visits
python convert_csv_to_sql.py visits data_visits.csv import_visits.sql
```

### 3. Jalankan SQL di Supabase

1. Buka Supabase Dashboard
2. Masuk ke SQL Editor
3. Copy-paste isi file SQL yang dihasilkan
4. Jalankan query

### 4. Verifikasi Data

Setelah import, jalankan query verifikasi:

```sql
-- Cek total customers
SELECT COUNT(*) as total_customers FROM public.customers;

-- Cek customers terbaru
SELECT name, address, notes FROM public.customers 
ORDER BY created_at DESC LIMIT 10;

-- Cek total visits
SELECT COUNT(*) as total_visits FROM public.attendance;

-- Cek visits terbaru
SELECT u.name as employee, c.name as customer, a.check_in_time, a.notes 
FROM public.attendance a
JOIN public.users u ON a.employee_id = u.id
JOIN public.customers c ON a.customer_id = c.id
ORDER BY a.check_in_time DESC LIMIT 10;
```

## Tips Penting

### Format Data CSV

1. **Nama Customer**: Harus unik atau minimal kombinasi nama + alamat
2. **Email Employee**: Harus sesuai dengan yang ada di database
3. **Koordinat**: Format desimal (contoh: -7.640000, 111.280000)
4. **Tanggal**: Format YYYY-MM-DD HH:MM:SS
5. **Text dengan koma**: Gunakan tanda kutip ganda

### Employee Email yang Tersedia

- `wicaksonopurwanto@gmail.com`
- `anggaskharisma@gmail.com`
- `shakadigital.id@gmail.com`
- `achmadverry20@gmail.com`
- `dwikydiaspriambodo@gmail.com`
- `mazis977@gmail.com`

### Contoh Data CSV

**customers.csv:**
```csv
name,phone,address,employee_email,latitude,longitude,notes,created_at
"Pak Joko",081234567890,"Jl. Raya No. 123, Desa Maju, Magetan",wicaksonopurwanto@gmail.com,-7.640000,111.280000,"Populasi: 100, Pakan: Comfeed",2025-12-23 10:00:00
"Bu Siti",082345678901,"Jl. Mawar No. 456, Desa Sejahtera, Magetan",anggaskharisma@gmail.com,-7.650000,111.290000,"Populasi: 75, Pakan: Pokhpand",2025-12-23 11:00:00
```

**visits.csv:**
```csv
employee_email,customer_name,check_in_time,latitude,longitude,notes,photo_url
wicaksonopurwanto@gmail.com,"Pak Joko",2025-12-23 14:30:00,-7.640000,111.280000,"Kontrol kesehatan ayam",https://example.com/photo1.jpg
anggaskharisma@gmail.com,"Bu Siti",2025-12-23 15:45:00,-7.650000,111.290000,"Konsultasi pakan",
```

## Troubleshooting

### Error: Employee tidak ditemukan
- Pastikan email employee benar dan ada di database
- Cek dengan query: `SELECT email FROM users WHERE role = 'employee';`

### Error: Customer tidak ditemukan (untuk visits)
- Pastikan customer sudah diimport terlebih dahulu
- Nama customer harus persis sama dengan yang ada di database

### Error: Format koordinat
- Gunakan format desimal, bukan derajat-menit-detik
- Contoh yang benar: -7.640000, 111.280000
- Jika tidak ada koordinat, kosongkan atau isi dengan NULL

### Error: Format tanggal
- Gunakan format: YYYY-MM-DD HH:MM:SS
- Contoh: 2025-12-23 14:30:00

## Urutan Import

1. **Import Customers dulu** - karena visits membutuhkan customer_id
2. **Import Visits** - setelah customers berhasil diimport
3. **Verifikasi data** - pastikan semua data terimport dengan benar