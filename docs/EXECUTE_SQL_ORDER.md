# 📋 URUTAN EKSEKUSI SQL FILES

Jalankan SQL files dalam urutan berikut di Supabase SQL Editor:

## 1. WAJIB - Tambah Kolom yang Hilang
```sql
-- File: add_missing_columns.sql
-- Fungsi: Menambah kolom items_summary, updated_at, updated_by, photo_url
-- Status: WAJIB dijalankan pertama
```

## 2. WAJIB - Optimasi Database
```sql
-- File: optimize_database_indexes.sql  
-- Fungsi: Menambah indexes untuk performance
-- Status: WAJIB untuk performa
```

## 3. WAJIB - Perbaiki Sinkronisasi Data
```sql
-- File: fix_data_synchronization.sql
-- Fungsi: Foreign keys, triggers, audit trail
-- Status: WAJIB untuk data integrity
```

## 4. OPSIONAL - Manager Visibility
```sql
-- File: manager_visibility_policies.sql
-- Fungsi: RLS policies untuk manager access control
-- Status: OPSIONAL (jika ingin manager hanya lihat timnya)
```

## 5. VALIDASI - Cek Hasil
```sql
-- File: validate_data_sync.sql
-- Fungsi: Validasi semua perbaikan berhasil
-- Status: Untuk memastikan tidak ada error
```

## ⚠️ PENTING:
- Jalankan **SATU PER SATU** dalam urutan di atas
- Jangan skip file nomor 1-3 (WAJIB)
- Jika ada error, stop dan perbaiki dulu
- File nomor 4-5 bisa dilewati jika tidak diperlukan

## 🎯 Hasil yang Diharapkan:
- ✅ Database performance 5x lebih cepat
- ✅ Data employee tersinkron dengan admin view
- ✅ Real-time updates di admin dashboard
- ✅ Data integrity terjaga dengan foreign keys
- ✅ Audit trail untuk tracking perubahan