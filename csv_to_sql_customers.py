#!/usr/bin/env python3
"""
Script to convert customers CSV to SQL INSERT statements
Usage: python csv_to_sql_customers.py input.csv > output.sql
"""

import csv
import sys
from datetime import datetime

def csv_to_sql(csv_file):
    print("-- Generated SQL INSERT statements for customers")
    print("-- Run this in Supabase SQL Editor")
    print()
    
    with open(csv_file, 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        print("INSERT INTO public.customers (name, phone, address, employee_id, latitude, longitude, notes, created_at) VALUES")
        
        rows = []
        for row in reader:
            name = row['nama'].replace("'", "''")  # Escape single quotes
            phone = row['telepon']
            address = row['alamat'].replace("'", "''")
            petugas_email = row['petugas']
            latitude = row['latitude'] if row['latitude'] else 'NULL'
            longitude = row['longitude'] if row['longitude'] else 'NULL'
            notes = row['catatan'].replace("'", "''") if row['catatan'] else ''
            
            sql_row = f"('{name}', '{phone}', '{address}', (SELECT id FROM users WHERE email = '{petugas_email}' AND role = 'employee' LIMIT 1), {latitude}, {longitude}, '{notes}', NOW())"
            rows.append(sql_row)
        
        print(',\n'.join(rows) + ';')
        
        print()
        print("-- Verify inserted customers")
        print("""SELECT 
    c.name as customer_name,
    c.phone,
    c.address,
    u.name as employee_name,
    c.latitude,
    c.longitude,
    c.notes,
    c.created_at
FROM public.customers c
JOIN public.users u ON c.employee_id = u.id
ORDER BY u.name, c.name;""")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python csv_to_sql_customers.py input.csv")
        sys.exit(1)
    
    csv_to_sql(sys.argv[1])