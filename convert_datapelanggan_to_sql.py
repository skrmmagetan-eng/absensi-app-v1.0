#!/usr/bin/env python3
"""
Script to convert DataPelanggan.csv to SQL INSERT statements
Usage: python convert_datapelanggan_to_sql.py DataPelanggan.csv > customers_full.sql
"""

import csv
import sys
from datetime import datetime

def clean_text(text):
    """Clean text for SQL insertion"""
    if not text or text.strip() == '':
        return None
    return text.replace("'", "''").strip()

def parse_coordinates(location_str):
    """Parse coordinates from location string"""
    if not location_str or location_str.strip() == '' or 'Location not available' in location_str:
        return None, None
    
    try:
        # Remove quotes and split by comma
        coords = location_str.replace('"', '').replace("'", "").split(',')
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
    return mapping.get(petugas_name, 'wicaksonopurwanto@gmail.com')  # Default to Purwanto

def csv_to_sql(csv_file):
    print("-- Generated SQL INSERT statements for customers from DataPelanggan.csv")
    print("-- Run this in Supabase SQL Editor after duplicate cleanup")
    print()
    print("-- Step 1: Verify employees are available")
    print("SELECT id, name, email, role FROM public.users WHERE role = 'employee' ORDER BY name;")
    print()
    print("-- Step 2: Insert customers (unique by name + address combination)")
    print("INSERT INTO public.customers (name, phone, address, employee_id, latitude, longitude, notes, created_at) VALUES")
    
    unique_customers = {}  # To avoid duplicates
    rows = []
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # Extract data
            nama = clean_text(row.get('Nama', ''))
            alamat = clean_text(row.get('Alamat', ''))
            desa = clean_text(row.get('Desa', ''))
            kecamatan = clean_text(row.get('Kecamatan', ''))
            kota = clean_text(row.get('Kota', ''))
            populasi = clean_text(row.get('Populasi', ''))
            pakan = clean_text(row.get('Pakan', ''))
            lokasi = row.get('Lokasi', '')
            petugas = clean_text(row.get('Petugas', ''))
            
            if not nama or not petugas:
                continue
                
            # Build full address
            address_parts = [alamat, desa, kecamatan, kota]
            full_address = ', '.join([part for part in address_parts if part])
            
            # Create unique key to avoid duplicates
            unique_key = f"{nama.lower()}_{full_address.lower()}"
            
            if unique_key in unique_customers:
                continue  # Skip duplicate
                
            unique_customers[unique_key] = True
            
            # Parse coordinates
            lat, lng = parse_coordinates(lokasi)
            
            # Build notes
            notes_parts = []
            if populasi:
                notes_parts.append(f"Populasi: {populasi}")
            if pakan:
                notes_parts.append(f"Pakan: {pakan}")
            notes = ', '.join(notes_parts) if notes_parts else None
            
            # Get employee email
            employee_email = get_employee_email(petugas)
            
            # Build SQL row
            lat_str = str(lat) if lat is not None else 'NULL'
            lng_str = str(lng) if lng is not None else 'NULL'
            notes_str = f"'{notes}'" if notes else 'NULL'
            
            sql_row = f"('{nama}', NULL, '{full_address}', (SELECT id FROM users WHERE email = '{employee_email}' LIMIT 1), {lat_str}, {lng_str}, {notes_str}, NOW())"
            rows.append(sql_row)
    
    # Print all rows
    print(',\n'.join(rows) + ';')
    
    print()
    print("-- Step 3: Verify inserted customers")
    print("""SELECT 
    c.name as customer_name,
    c.address,
    u.name as employee_name,
    c.latitude,
    c.longitude,
    c.notes,
    c.created_at
FROM public.customers c
JOIN public.users u ON c.employee_id = u.id
ORDER BY u.name, c.name;""")
    
    print()
    print("-- Step 4: Count customers per employee")
    print("""SELECT 
    u.name as employee_name,
    COUNT(c.id) as total_customers
FROM public.users u
LEFT JOIN public.customers c ON u.id = c.employee_id
WHERE u.role = 'employee'
GROUP BY u.id, u.name
ORDER BY u.name;""")
    
    print()
    print(f"-- Total unique customers processed: {len(rows)}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python convert_datapelanggan_to_sql.py DataPelanggan.csv")
        sys.exit(1)
    
    csv_to_sql(sys.argv[1])