#!/usr/bin/env python3
"""
Script to convert Kunjungan.csv to SQL INSERT statements for visit/attendance records
Usage: python convert_kunjungan_to_sql.py Kunjungan.csv > insert_visits_full.sql
"""

import csv
import sys
from datetime import datetime

def clean_text(text):
    """Clean text for SQL insertion"""
    if not text or text.strip() == '':
        return None
    return text.replace("'", "''").strip()

def parse_date(date_str):
    """Parse date from various formats"""
    if not date_str or date_str.strip() == '':
        return 'NOW()'
    
    try:
        date_str = date_str.strip()
        
        # Try different date formats
        formats = [
            '%d/%m/%Y %H:%M',
            '%d/%m/%Y %H:%M:%S',
            '%m/%d/%Y %H:%M',
            '%m/%d/%Y %H:%M:%S',
            '%d/%m/%Y',
            '%m/%d/%Y'
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return f"'{dt.strftime('%Y-%m-%d %H:%M:%S')}'"
            except ValueError:
                continue
                
        return 'NOW()'
        
    except Exception:
        return 'NOW()'

def parse_coordinates(location_str):
    """Parse coordinates from location string"""
    if not location_str or location_str.strip() == '' or 'Location not available' in location_str:
        return None, None
    
    try:
        # Remove quotes and split by comma or semicolon
        coords = location_str.replace('"', '').replace("'", "").replace(';', ',').split(',')
        if len(coords) == 2:
            lat = float(coords[0].strip())
            lng = float(coords[1].strip())
            return lat, lng
    except:
        pass
    
    return None, None

def get_employee_email(petugas_name):
    """Map petugas name to email"""
    mapping = {
        'Purwanto': 'wicaksonopurwanto@gmail.com',
        'Angga': 'anggaskharisma@gmail.com', 
        'Miftakhul': 'mazis977@gmail.com',
        'Verry': 'achmadverry20@gmail.com'
    }
    return mapping.get(petugas_name, 'wicaksonopurwanto@gmail.com')

def extract_photo_id(photo_url):
    """Extract Google Drive file ID from URL"""
    if not photo_url or 'drive.google.com' not in photo_url:
        return None
    
    try:
        # Extract ID from various Google Drive URL formats
        if '/d/' in photo_url:
            file_id = photo_url.split('/d/')[1].split('/')[0]
        elif 'id=' in photo_url:
            file_id = photo_url.split('id=')[1].split('&')[0]
        else:
            return None
        
        # Return the direct view URL
        return f"https://drive.google.com/uc?export=view&id={file_id}"
    except:
        return None

def csv_to_sql(csv_file):
    print("-- Generated SQL INSERT statements for visits from Kunjungan.csv")
    print("-- Visit dates are preserved from the original CSV data")
    print("-- Run this in Supabase SQL Editor after customers are imported")
    print()
    print("-- Step 1: Verify employees and customers are available")
    print("SELECT COUNT(*) as employee_count FROM public.users WHERE role = 'employee';")
    print("SELECT COUNT(*) as customer_count FROM public.customers;")
    print()
    print("-- Step 2: Insert visits (attendance records)")
    print("-- Note: Customers are matched by name. If multiple customers have same name, first match is used.")
    print("INSERT INTO public.attendance (employee_id, customer_id, check_in_time, latitude, longitude, notes, photo_url) VALUES")
    
    rows = []
    skipped = []
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for idx, row in enumerate(reader, 1):
            # Extract data
            tanggal = row.get('Tanggal', '')
            nama = clean_text(row.get('Nama', ''))
            lokasi = row.get('Lokasi', '')
            catatan = clean_text(row.get('Catatan', ''))
            foto = row.get('Foto', '')
            img_foto = row.get('IMG Foto', '')
            petugas = clean_text(row.get('Petugas', ''))
            
            if not nama or not petugas:
                skipped.append(f"Row {idx}: Missing name or petugas")
                continue
            
            # Parse visit date/time
            check_in_time = parse_date(tanggal)
            
            # Parse coordinates
            lat, lng = parse_coordinates(lokasi)
            
            # Get photo URL (prefer IMG Foto, fallback to Foto)
            photo_url = extract_photo_id(img_foto) or extract_photo_id(foto)
            
            # Get employee email
            employee_email = get_employee_email(petugas)
            
            # Build SQL row
            lat_str = str(lat) if lat is not None else 'NULL'
            lng_str = str(lng) if lng is not None else 'NULL'
            notes_str = f"'{catatan}'" if catatan else 'NULL'
            photo_str = f"'{photo_url}'" if photo_url else 'NULL'
            
            # Match customer by name (case-insensitive)
            sql_row = f"""((SELECT id FROM users WHERE email = '{employee_email}' LIMIT 1), (SELECT id FROM customers WHERE LOWER(name) = LOWER('{nama}') LIMIT 1), {check_in_time}, {lat_str}, {lng_str}, {notes_str}, {photo_str})"""
            
            rows.append(sql_row)
    
    # Print all rows
    print(',\n'.join(rows) + ';')
    
    print()
    print("-- Step 3: Verify inserted visits")
    print("""SELECT 
    a.check_in_time,
    u.name as employee_name,
    c.name as customer_name,
    a.notes,
    a.latitude,
    a.longitude,
    CASE WHEN a.photo_url IS NOT NULL THEN 'Yes' ELSE 'No' END as has_photo
FROM public.attendance a
JOIN public.users u ON a.employee_id = u.id
LEFT JOIN public.customers c ON a.customer_id = c.id
ORDER BY a.check_in_time DESC
LIMIT 50;""")
    
    print()
    print("-- Step 4: Count visits per employee")
    print("""SELECT 
    u.name as employee_name,
    COUNT(a.id) as total_visits,
    COUNT(a.photo_url) as visits_with_photo,
    MIN(a.check_in_time) as first_visit,
    MAX(a.check_in_time) as last_visit
FROM public.users u
LEFT JOIN public.attendance a ON u.id = a.employee_id
WHERE u.role = 'employee'
GROUP BY u.id, u.name
ORDER BY u.name;""")
    
    print()
    print("-- Step 5: Visit timeline by date")
    print("""SELECT 
    DATE(a.check_in_time) as visit_date,
    COUNT(*) as visits_count,
    COUNT(DISTINCT a.employee_id) as employees_active,
    COUNT(DISTINCT a.customer_id) as customers_visited
FROM public.attendance a
GROUP BY DATE(a.check_in_time)
ORDER BY visit_date DESC
LIMIT 30;""")
    
    print()
    print("-- Step 6: Check for visits without matching customers")
    print("""SELECT 
    a.check_in_time,
    u.name as employee_name,
    a.notes
FROM public.attendance a
JOIN public.users u ON a.employee_id = u.id
WHERE a.customer_id IS NULL
ORDER BY a.check_in_time DESC
LIMIT 20;""")
    
    print()
    print(f"-- Total visits processed: {len(rows)}")
    if skipped:
        print(f"-- Skipped rows: {len(skipped)}")
        for skip in skipped[:10]:  # Show first 10 skipped
            print(f"-- {skip}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python convert_kunjungan_to_sql.py Kunjungan.csv")
        sys.exit(1)
    
    csv_to_sql(sys.argv[1])
