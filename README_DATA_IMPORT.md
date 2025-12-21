# 📊 Data Import Guide - SKRM Attendance App

## 🎯 Overview
Panduan lengkap untuk mengimport data real customers dan visits ke aplikasi absensi SKRM.

---

## 📁 File Structure

### 🗂️ **Production Files (GUNAKAN INI)**
```
📁 DATA IMPORT FILES
├── 📄 README_DATA_IMPORT.md          # Panduan ini
├── 📄 01_prepare_database.sql        # Persiapan database
├── 📄 02_import_customers.sql        # Import 646 customers
├── 📄 03_import_visits.sql           # Import 2,531 visits
└── 📄 04_verify_import.sql           # Verifikasi hasil import
```

### 🗂️ **Source Data Files**
```
📁 SOURCE DATA
├── 📄 DataPelanggan.csv              # Data 677 customers
├── 📄 Kunjungan.csv                  # Data 2,531+ visits
├── 📄 convert_customers.py           # Script konversi customers
└── 📄 convert_visits.py              # Script konversi visits
```

---

## 🚀 Quick Start - 4 Steps

### Step 1: Prepare Database
```sql
-- File: 01_prepare_database.sql
-- Menambahkan kolom yang diperlukan ke tabel attendance
```

### Step 2: Import Customers
```sql
-- File: 02_import_customers.sql
-- Import 646 unique customers dengan data real
```

### Step 3: Import Visits
```sql
-- File: 03_import_visits.sql
-- Import 2,531 visit records dengan GPS & photos
```

### Step 4: Verify Results
```sql
-- File: 04_verify_import.sql
-- Verifikasi semua data berhasil diimport
```

---

## 📊 Expected Results

| Metric | Value |
|--------|-------|
| **Total Customers** | 646 |
| **Total Visits** | 2,531+ |
| **Date Range** | May 2025 - Dec 2025 |
| **Employees** | 4 (Purwanto, Angga, Miftakhul, Verry) |
| **GPS Coverage** | ~95% visits |
| **Photo Coverage** | ~98% visits |

---

## 🔧 Technical Details

### Customer Data Features:
- ✅ Real customer names & addresses
- ✅ GPS coordinates for locations
- ✅ Employee assignments
- ✅ Registration dates preserved
- ✅ Population & feed type in notes

### Visit Data Features:
- ✅ Real visit timestamps
- ✅ Customer linkage by name matching
- ✅ GPS coordinates for visit locations
- ✅ Google Drive photo integration
- ✅ Visit purpose & observations

---

## ⚠️ Important Notes

### Prerequisites:
- ✅ Supabase project setup
- ✅ Users table with 4 employees
- ✅ Customers table exists
- ✅ Attendance table exists

### Execution Order:
**MUST follow this sequence:**
1. 01_prepare_database.sql
2. 02_import_customers.sql
3. 03_import_visits.sql
4. 04_verify_import.sql

### Data Relationships:
```
Users (employees) → Customers → Visits (attendance)
     ↓                ↓            ↓
  4 employees    646 customers  2,531 visits
```

---

## 🎉 Success Indicators

After completing all steps, you should see:

### In Supabase Dashboard:
- ✅ 646 rows in `customers` table
- ✅ 2,531+ rows in `attendance` table
- ✅ All foreign keys properly linked

### In Application:
- ✅ Customer list populated
- ✅ Visit history visible
- ✅ Photos loading from Google Drive
- ✅ GPS coordinates on maps
- ✅ Employee assignments correct

---

## 🆘 Troubleshooting

### Common Issues:

**Error: "column does not exist"**
- Solution: Run `01_prepare_database.sql` first

**Error: "foreign key violation"**
- Solution: Import customers before visits

**Visits not linked to customers**
- Cause: Name mismatch between CSV files
- Check: Run verification queries in Step 4

**Photos not loading**
- Cause: Google Drive permissions
- Note: Photos require public access

---

## 📞 Support

Jika ada masalah:
1. Periksa urutan eksekusi file
2. Jalankan verification queries
3. Check Supabase logs untuk error details

---

## ✅ Ready to Start?

Jalankan file-file SQL sesuai urutan:
1. `01_prepare_database.sql`
2. `02_import_customers.sql` 
3. `03_import_visits.sql`
4. `04_verify_import.sql`

**Database akan terisi dengan data production yang lengkap!** 🚀