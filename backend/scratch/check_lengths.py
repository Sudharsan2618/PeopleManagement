import sys
import os
import openpyxl

sys.path.append(r'c:\Users\thirs\Downloads\ppl management\PeopleManagement\backend')
from database.connection import execute_query

# Check database column types for prospects
cols = execute_query("""
    SELECT column_name, data_type, character_maximum_length
    FROM information_schema.columns
    WHERE table_name = 'prospects'
    ORDER BY ordinal_position
""", fetch="all")

print("VARCHAR columns <= 30 chars in prospects:")
for c in cols:
    if c['character_maximum_length'] and c['character_maximum_length'] <= 50:
        print(f"  {c['column_name']}: {c['data_type']}({c['character_maximum_length']})")

wb = openpyxl.load_workbook(r'c:\Users\thirs\Downloads\ppl management\college_contacts_mobile.xlsx', data_only=True)
ws = wb['FDP 2026-27 Leads Report']
print("\nChecking Excel values against column limits:")
for r in range(2, ws.max_row + 1):
    vals = [ws.cell(row=r, column=c).value for c in range(1, 14)]
    # 0: name, 1: company, 2: mob, 3: alt1, 4: alt2, 5: alt3, 6: email, 7: alt_email, 8: sec_email, 9: source, 10: type, 11: designation, 12: lead_id
    checks = [
        ('mobile', vals[2], 20),
        ('alt_phone', vals[3], 20),
        ('alt_phone_2', vals[4], 20),
        ('alt_phone_3', vals[5], 20),
        ('lead_id', vals[12], 20),
        ('designation', vals[11], 50)
    ]
    for col_name, val, max_len in checks:
        if val and len(str(val).strip()) > max_len:
            print(f"Row {r}: {col_name} exceeds {max_len} (len {len(str(val).strip())}): '{val}'")
