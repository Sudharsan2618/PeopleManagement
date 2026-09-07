import sys
import os
import openpyxl

sys.path.append(r'c:\Users\thirs\Downloads\ppl management\PeopleManagement\backend')
from database.connection import execute_query

wb = openpyxl.load_workbook(r'c:\Users\thirs\Downloads\ppl management\college_contacts_mobile.xlsx', data_only=True)
ws = wb['FDP 2026-27 Leads Report']

db_colleges = execute_query('SELECT * FROM prospects WHERE prospect_type = \'college_contact\' ORDER BY id', fetch='all')

# Index DB records
db_by_lid_15 = {}
db_by_name = {}
db_by_college_name = {}
for p in db_colleges:
    lid = (p.get('lead_id') or '').strip()
    if lid:
        db_by_lid_15[lid[:15]] = p
    nm = (p.get('name') or '').strip().lower()
    if nm:
        db_by_name[nm] = p
    cn = (p.get('college_name') or '').strip().lower()
    if cn:
        db_by_college_name[cn] = p

print(f"Total DB records: {len(db_colleges)}")
print(f"Total Excel records: {ws.max_row - 1}")

updates = []
inserts = []
unchanged = []

for r in range(2, ws.max_row + 1):
    vals = [ws.cell(row=r, column=c).value for c in range(1, ws.max_column + 1)]
    contact_name = str(vals[0]).strip() if vals[0] else None
    company = str(vals[1]).strip() if vals[1] else None
    mob = str(vals[2]).strip() if vals[2] is not None else None
    alt1 = str(vals[3]).strip() if vals[3] is not None else None
    alt2 = str(vals[4]).strip() if vals[4] is not None else None
    alt3 = str(vals[5]).strip() if vals[5] is not None else None
    email = str(vals[6]).strip() if vals[6] is not None else None
    alt_email = str(vals[7]).strip() if vals[7] is not None else None
    sec_email = str(vals[8]).strip() if vals[8] is not None else None
    lead_source = str(vals[9]).strip() if vals[9] is not None else None
    lead_type = str(vals[10]).strip() if vals[10] is not None else None
    designation = str(vals[11]).strip() if vals[11] is not None else None
    lid = str(vals[12]).strip() if vals[12] else None
    
    # Matching strategy:
    # 1. Exact 15-char Lead ID prefix
    # 2. Company / Account match on college_name
    # 3. Company / Account match on name
    db_p = None
    if lid and lid[:15] in db_by_lid_15:
        db_p = db_by_lid_15[lid[:15]]
    elif company and company.lower() in db_by_name:
        db_p = db_by_name[company.lower()]
    elif company and company.lower() in db_by_college_name:
        db_p = db_by_college_name[company.lower()]
        
    if not db_p:
        inserts.append({
            'row': r,
            'name': contact_name or company,
            'college_name': company,
            'mobile': mob,
            'alt_phone': alt1,
            'alt_phone_2': alt2,
            'alt_phone_3': alt3,
            'email': email,
            'alternative_email': alt_email,
            'secondary_email': sec_email,
            'lead_source': [lead_source] if lead_source else [],
            'lead_type': [lead_type] if lead_type else [],
            'designation': designation,
            'lead_id': lid
        })
    else:
        # Check diffs
        diffs = {}
        # Compare phone fields
        def normalize_str(s):
            if s is None or str(s).strip() == '' or str(s).strip().lower() == 'none':
                return None
            return str(s).strip()
            
        if normalize_str(db_p.get('mobile')) != normalize_str(mob):
            diffs['mobile'] = (db_p.get('mobile'), mob)
        if normalize_str(db_p.get('alt_phone')) != normalize_str(alt1):
            diffs['alt_phone'] = (db_p.get('alt_phone'), alt1)
        if normalize_str(db_p.get('alt_phone_2')) != normalize_str(alt2):
            diffs['alt_phone_2'] = (db_p.get('alt_phone_2'), alt2)
        if normalize_str(db_p.get('alt_phone_3')) != normalize_str(alt3):
            diffs['alt_phone_3'] = (db_p.get('alt_phone_3'), alt3)
            
        # Email fields
        if normalize_str(db_p.get('email')) != normalize_str(email):
            diffs['email'] = (db_p.get('email'), email)
        if normalize_str(db_p.get('secondary_email')) != normalize_str(sec_email):
            diffs['secondary_email'] = (db_p.get('secondary_email'), sec_email)
        if normalize_str(db_p.get('alternative_email')) != normalize_str(alt_email):
            diffs['alternative_email'] = (db_p.get('alternative_email'), alt_email)
            
        if diffs:
            updates.append({
                'row': r,
                'db_id': db_p['id'],
                'college': db_p['name'],
                'diffs': diffs
            })
        else:
            unchanged.append(r)

print(f"\nSimulation Results:")
print(f"Updates needed: {len(updates)}")
print(f"Inserts needed: {len(inserts)}")
print(f"Unchanged: {len(unchanged)}")
print(f"Total accounted for: {len(updates) + len(inserts) + len(unchanged)} / {ws.max_row - 1}")

if inserts:
    print("\nInserts to be created:")
    for ins in inserts:
        print(f"  Row {ins['row']}: Name='{ins['name']}', College='{ins['college_name']}', LeadID='{ins['lead_id']}', Mobile='{ins['mobile']}', Alt1='{ins['alt_phone']}'")

print(f"\nFirst 10 sample updates:")
for u in updates[:10]:
    print(f"  Row {u['row']} (DB ID {u['db_id']} - {u['college']}): {u['diffs']}")
