# 🔧 PERBAIKAN SQL SYNTAX ERROR

## ❌ **Error yang Terjadi:**
```
ERROR: 42601: syntax error at or near "NOT" 
LINE 82: CREATE POLICY IF NOT EXISTS "Public Access"
```

## ✅ **SOLUSI - Gunakan Script yang Sudah Diperbaiki:**

### **LANGKAH 1: Gunakan File `fix_reset_simple.sql`**

File ini sudah diperbaiki dan tidak ada syntax error. Jalankan di **Supabase SQL Editor**:

1. **Buka Supabase Dashboard** → **SQL Editor**
2. **Copy semua isi file `fix_reset_simple.sql`**
3. **Paste dan Run** di SQL Editor

### **LANGKAH 2: Jika Masih Error, Jalankan Manual Step-by-Step**

**Step 1: Cek tabel ada atau tidak**
```sql
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'password_reset_tokens'
);
```

**Step 2: Jika hasil `false`, buat tabel**
```sql
CREATE TABLE password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Step 3: Enable RLS**
```sql
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
```

**Step 4: Buat policy untuk admin**
```sql
CREATE POLICY "Admin can manage reset tokens" ON password_reset_tokens
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );
```

**Step 5: Policy untuk user melihat token sendiri**
```sql
CREATE POLICY "Users can view own reset tokens" ON password_reset_tokens
    FOR SELECT USING (user_id = auth.uid());
```

**Step 6: Policy untuk insert token**
```sql
CREATE POLICY "Admin can create reset tokens" ON password_reset_tokens
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'manager')
        )
    );
```

**Step 7: Policy untuk update token**
```sql
CREATE POLICY "Allow token usage updates" ON password_reset_tokens
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND (users.role IN ('admin', 'manager') OR users.id = password_reset_tokens.user_id)
        )
    );
```

**Step 8: Cek hasil**
```sql
SELECT 
    'password_reset_tokens' as table_name,
    COUNT(*) as row_count
FROM password_reset_tokens
UNION ALL
SELECT 
    'users' as table_name,
    COUNT(*) as row_count  
FROM users;
```

### **LANGKAH 3: Setelah Database OK**

1. **Restart aplikasi:**
   ```bash
   # Stop dengan Ctrl+C, lalu start lagi
   npm run dev
   ```

2. **Test di browser console:**
   ```javascript
   // Copy dan jalankan isi file check_reset_config.js
   ```

3. **Test reset password:**
   - Login sebagai admin
   - Klik Reset Password pada karyawan
   - Pastikan muncul modal sukses

## 🎯 **Hasil yang Diharapkan:**

Setelah langkah-langkah di atas:
- ✅ Tabel `password_reset_tokens` berhasil dibuat
- ✅ RLS policies aktif
- ✅ Console browser tidak ada error
- ✅ Reset password via WhatsApp berfungsi

## 🚨 **Jika Masih Ada Error:**

1. **Screenshot error message** yang baru
2. **Cek di Supabase Dashboard** → **Table Editor** → pastikan tabel `password_reset_tokens` ada
3. **Cek policies** di tab Authentication → Policies

---

**💡 Penyebab error sebelumnya:** Supabase tidak mendukung `IF NOT EXISTS` untuk storage policies. File `fix_reset_simple.sql` sudah menghindari masalah ini.