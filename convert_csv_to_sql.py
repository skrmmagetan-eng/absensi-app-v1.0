#!/usr/bin/env python3
"""
Script untuk mengkonversi CSV ke SQL INSERT statements
Untuk import data Customers dan Visits ke database Supabase
"""

import csv
import sys
from datetime import datetime

def convert_customers_csv_to_sql(csv_file, output_file):
    """Konversi CSV customers ke SQL INSERT statements"""
    
    sql_statements = []
    sql_statements.append("-- Generated SQL INSERT statements for customers")
    sql_statements.append("-- Run this in Supabase SQL Editor")
    sql_statements.append("")
    sql_statements.append("-- Step 1: Verify employees are available")
    sql_statements.append("SELECT id, name, email, role FROM public.users WHERE role = 'employee' ORDER BY name;")
    sql_statements.append("")
    sql_statements.append("-- Step 2: Insert customers")
    sql_statements.append("INSERT INTO public.customers (name, phone, address, employee_id, latitude, longitude, notes, created_at) VALUES")
    
    insert_values = []
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                # Escape single quotes in text fields
                name = row.get('name', '').replace("'", "''")
                phone = row.get('phone', '').replace("'", "''") if row.get('phone') else 'NULL'
                address = row.get('address', '').replace("'", "''")
                employee_email = row.get('employee_email', '').replace("'", "''")
                notes = row.get('notes', '').replace("'", "''")
                created_at = row.get('created_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                
                # Handle coordinates
                latitude = row.get('latitude', 'NULL')
                longitude = row.get('longitude', 'NULL')
                
                if latitude and latitude.strip() and latitude != 'NULL':
                    try:
                        float(latitude)
                    except:
                        latitude = 'NULL'
                else:
                    latitude = 'NULL'
                    
                if longitude and longitude.strip() and longitude != 'NULL':
                    try:
                        float(longitude)
                    except:
                        longitude = 'NULL'
                else:
                    longitude = 'NULL'
                
                # Handle phone
                if phone == '' or phone == 'NULL':
                    phone = 'NULL'
                else:
                    phone = f"'{phone}'"
                
                # Create INSERT value
                insert_value = f"('{name}', {phone}, '{address}', (SELECT id FROM users WHERE email = '{employee_email}' LIMIT 1), {latitude}, {longitude}, '{notes}', '{created_at}')"
                insert_values.append(insert_value)
        
        # Join all values with commas
        sql_statements.append(',\n'.join(insert_values) + ';')
        sql_statements.append("")
        sql_statements.append("-- Step 3: Verify import")
        sql_statements.append("SELECT COUNT(*) as total_customers FROM public.customers;")
        sql_statements.append("SELECT name, address, notes FROM public.customers ORDER BY created_at DESC LIMIT 10;")
        
        # Write to output file
        with open(output_file, 'w', encoding='utf-8') as out_file:
            out_file.write('\n'.join(sql_statements))
            
        print(f"✅ Customers CSV berhasil dikonversi ke {output_file}")
        print(f"📊 Total records: {len(insert_values)}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

def convert_visits_csv_to_sql(csv_file, output_file):
    """Konversi CSV visits ke SQL INSERT statements"""
    
    sql_statements = []
    sql_statements.append("-- Generated SQL INSERT statements for visits")
    sql_statements.append("-- Run this in Supabase SQL Editor after customers are imported")
    sql_statements.append("")
    sql_statements.append("-- Step 1: Verify employees and customers are available")
    sql_statements.append("SELECT COUNT(*) as employee_count FROM public.users WHERE role = 'employee';")
    sql_statements.append("SELECT COUNT(*) as customer_count FROM public.customers;")
    sql_statements.append("")
    sql_statements.append("-- Step 2: Insert visits (attendance records)")
    sql_statements.append("INSERT INTO public.attendance (employee_id, customer_id, check_in_time, latitude, longitude, notes, photo_url) VALUES")
    
    insert_values = []
    
    try:
        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                # Escape single quotes in text fields
                employee_email = row.get('employee_email', '').replace("'", "''")
                customer_name = row.get('customer_name', '').replace("'", "''")
                check_in_time = row.get('check_in_time', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                notes = row.get('notes', '').replace("'", "''")
                photo_url = row.get('photo_url', '').replace("'", "''") if row.get('photo_url') else ''
                
                # Handle coordinates
                latitude = row.get('latitude', 'NULL')
                longitude = row.get('longitude', 'NULL')
                
                if latitude and latitude.strip() and latitude != 'NULL':
                    try:
                        float(latitude)
                    except:
                        latitude = 'NULL'
                else:
                    latitude = 'NULL'
                    
                if longitude and longitude.strip() and longitude != 'NULL':
                    try:
                        float(longitude)
                    except:
                        longitude = 'NULL'
                else:
                    longitude = 'NULL'
                
                # Handle photo_url
                if photo_url == '':
                    photo_url = 'NULL'
                else:
                    photo_url = f"'{photo_url}'"
                
                # Create INSERT value
                insert_value = f"((SELECT id FROM users WHERE email = '{employee_email}' LIMIT 1), (SELECT id FROM customers WHERE LOWER(name) = LOWER('{customer_name}') LIMIT 1), '{check_in_time}', {latitude}, {longitude}, '{notes}', {photo_url})"
                insert_values.append(insert_value)
        
        # Join all values with commas
        sql_statements.append(',\n'.join(insert_values) + ';')
        sql_statements.append("")
        sql_statements.append("-- Step 3: Verify import")
        sql_statements.append("SELECT COUNT(*) as total_visits FROM public.attendance;")
        sql_statements.append("SELECT u.name as employee, c.name as customer, a.check_in_time, a.notes FROM public.attendance a")
        sql_statements.append("JOIN public.users u ON a.employee_id = u.id")
        sql_statements.append("JOIN public.customers c ON a.customer_id = c.id")
        sql_statements.append("ORDER BY a.check_in_time DESC LIMIT 10;")
        
        # Write to output file
        with open(output_file, 'w', encoding='utf-8') as out_file:
            out_file.write('\n'.join(sql_statements))
            
        print(f"✅ Visits CSV berhasil dikonversi ke {output_file}")
        print(f"📊 Total records: {len(insert_values)}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    print("🔄 CSV to SQL Converter untuk Database SKRM")
    print("=" * 50)
    
    if len(sys.argv) < 4:
        print("Usage:")
        print("  python convert_csv_to_sql.py customers input.csv output.sql")
        print("  python convert_csv_to_sql.py visits input.csv output.sql")
        print("")
        print("Contoh:")
        print("  python convert_csv_to_sql.py customers data_customers.csv import_customers.sql")
        print("  python convert_csv_to_sql.py visits data_visits.csv import_visits.sql")
        return
    
    table_type = sys.argv[1].lower()
    input_file = sys.argv[2]
    output_file = sys.argv[3]
    
    if table_type == 'customers':
        convert_customers_csv_to_sql(input_file, output_file)
    elif table_type == 'visits':
        convert_visits_csv_to_sql(input_file, output_file)
    else:
        print("❌ Table type harus 'customers' atau 'visits'")

if __name__ == "__main__":
    main()