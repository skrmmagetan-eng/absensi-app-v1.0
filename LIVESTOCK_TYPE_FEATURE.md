# Fitur Jenis Ternak Pelanggan

## Overview
Penambahan field "Jenis/Tipe Ternak" pada form pendaftaran pelanggan untuk segmentasi dan targeting yang lebih spesifik dalam industri peternakan.

## Perubahan yang Dilakukan

### 1. Database Schema
- **File**: `add_livestock_type_column.sql`
- **Perubahan**: Menambah kolom `livestock_type` pada tabel `customers`
- **Type**: TEXT (nullable)
- **Index**: Ditambahkan untuk performa pencarian

### 2. Form Pendaftaran Pelanggan
- **Field Baru**: Dropdown "Jenis/Tipe Ternak" (wajib diisi)
- **Opsi Tersedia**:
  - 🐔 Ayam Broiler (Pedaging)
  - 🐓 Ayam Layer (Petelur)
  - 🐥 Ayam Grower/Pullet
  - 🐤 Ayam Kampung
  - 🦆 Bebek
  - 🐄 Sapi Potong
  - 🐮 Sapi Perah
  - 🐐 Kambing
  - 🐑 Domba
  - 🐷 Babi
  - 🐟 Ikan (Budidaya)
  - 🦐 Udang
  - 🦜 Lainnya (dengan input manual)

### 3. Tampilan Daftar Pelanggan
- **Avatar Dinamis**: Emoji sesuai jenis ternak
- **Info Tambahan**: Menampilkan jenis ternak di bawah nama
- **Visual Enhancement**: Setiap jenis ternak memiliki emoji yang sesuai

### 4. Fitur Pencarian
- **Enhanced Search**: Pencarian berdasarkan nama, alamat, DAN jenis ternak
- **Placeholder Update**: "Cari pelanggan (nama, alamat, atau jenis ternak)..."

### 5. Detail Pelanggan
- **Modal Enhancement**: Menampilkan jenis ternak dengan emoji
- **Layout Update**: Section khusus untuk informasi ternak
- **Edit Button**: Tombol "Edit Data Ternak" untuk update saat kunjungan

### 6. Edit Jenis Ternak Saat Kunjungan
- **Field Update Modal**: Modal khusus untuk update jenis ternak
- **Smart Matching**: Otomatis mencocokkan data existing dengan dropdown
- **Fallback Handling**: Jika tidak cocok, set ke "Lainnya" dengan nilai custom
- **Visual Indicator**: Pelanggan tanpa data ternak ditandai "⚠️ Perlu diupdate"
- **Real-time Update**: Langsung update tampilan setelah save

## Manfaat Bisnis

### 1. Segmentasi Pelanggan
- Kategorisasi berdasarkan jenis ternak
- Targeting produk yang lebih spesifik
- Analisis pasar per segmen

### 2. Personalisasi Layanan
- Rekomendasi produk sesuai jenis ternak
- Jadwal kunjungan yang disesuaikan
- Konsultasi yang lebih tepat sasaran

### 3. Pelaporan & Analytics
- Statistik distribusi jenis ternak
- Tren pasar per kategori
- ROI per segmen pelanggan

### 4. User Experience
- Visual yang lebih menarik dengan emoji
- Pencarian yang lebih akurat
- Informasi yang lebih lengkap

## Implementasi Teknis

### Database Migration
```sql
-- Jalankan di Supabase SQL Editor
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS livestock_type TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_livestock_type 
ON customers(livestock_type);
```

### Frontend Changes
1. **Form Validation**: Jenis ternak wajib dipilih
2. **Conditional Field**: Input manual untuk "Lainnya"
3. **Dynamic Avatar**: Emoji berdasarkan jenis ternak
4. **Enhanced Filter**: Pencarian multi-field

### Data Structure
```javascript
const customerData = {
  employee_id: user.id,
  name: "PT. Peternakan Maju",
  livestock_type: "ayam-broiler", // New field
  phone: "08123456789",
  email: "email@customer.com",
  address: "Jl. Peternakan No. 123",
  latitude: -6.2088,
  longitude: 106.8456,
  notes: "Catatan tambahan"
};
```

## Cara Penggunaan

### 1. Tambah Pelanggan Baru
1. Buka halaman "Tambah Pelanggan"
2. Isi data dasar (nama, kontak)
3. **Pilih jenis ternak** dari dropdown
4. Jika pilih "Lainnya", isi field manual
5. Lengkapi alamat dan lokasi
6. Simpan data

### 2. Pencarian Pelanggan
- Ketik nama pelanggan, alamat, atau jenis ternak
- Contoh: "ayam", "broiler", "sapi perah"
- Hasil akan difilter secara real-time

### 3. Lihat Detail
- Klik "Lihat Detail" pada pelanggan
- Informasi jenis ternak ditampilkan dengan emoji
- Data lengkap untuk referensi kunjungan

## Roadmap Future Enhancement

### 1. Analytics Dashboard
- Grafik distribusi jenis ternak
- Tren pertumbuhan per kategori
- Performa sales per segmen

### 2. Product Recommendation
- Katalog produk per jenis ternak
- Rekomendasi otomatis saat kunjungan
- Cross-selling opportunities

### 3. Reporting Enhancement
- Export data dengan segmentasi
- Laporan khusus per jenis ternak
- Analisis ROI per kategori

### 4. Mobile Optimization
- Quick filter berdasarkan jenis ternak
- Shortcut untuk segmen populer
- Offline sync untuk data ternak

## Testing Checklist

- [ ] Form validation jenis ternak
- [ ] Conditional field "Lainnya"
- [ ] Database save livestock_type
- [ ] Display emoji yang benar
- [ ] Search functionality
- [ ] Modal detail enhancement
- [ ] Backward compatibility
- [ ] Mobile responsiveness

## Notes
- Field ini wajib untuk pelanggan baru
- Pelanggan lama akan menampilkan "Jenis ternak belum diisi"
- Emoji dapat disesuaikan dengan preferensi regional
- Data dapat digunakan untuk analytics dan reporting