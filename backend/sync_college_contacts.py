import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
import os
import json
import openpyxl
import argparse
from datetime import datetime

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database.connection import execute_query, get_db_cursor
from utils.timezone_utils import get_ist_now

EXCEL_PATH = r"c:\Users\thirs\Downloads\ppl management\college_contacts_mobile.xlsx"

def clean_val(val):
    if val is None:
        return None
    s = str(val).strip()
    if s == "" or s.lower() == "none":
        return None
    return s

def run_sync(commit=False):
    print("=" * 80)
    print(f"COLLEGE CONTACTS SYNC - {'COMMIT MODE' if commit else 'DRY-RUN MODE'}")
    print("=" * 80)
    
    # 1. Load Excel file
    if not os.path.exists(EXCEL_PATH):
        print(f"ERROR: Excel file not found: {EXCEL_PATH}")
        return False
        
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    if "FDP 2026-27 Leads Report" not in wb.sheetnames:
        print("ERROR: Sheet 'FDP 2026-27 Leads Report' not found")
        return False
        
    ws = wb["FDP 2026-27 Leads Report"]
    total_source_rows = ws.max_row - 1
    print(f"[1] Source rows in Excel sheet: {total_source_rows}")
    
    # 2. Fetch existing DB records
    existing_db = execute_query(
        "SELECT * FROM prospects WHERE prospect_type = 'college_contact' ORDER BY id",
        fetch="all"
    )
    print(f"[2] Existing DB college_contact records: {len(existing_db)}")
    
    # 3. Create Backup Snapshot before any modification
    scratch_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scratch")
    os.makedirs(scratch_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(scratch_dir, f"college_contacts_backup_{timestamp}.json")
    with open(backup_path, "w", encoding="utf-8") as bf:
        json.dump([dict(r) for r in existing_db], bf, default=str, indent=2)
    print(f"[3] Complete DB backup saved to: {backup_path}")
    
    # 4. Build Lookups by exact lead_id and 15-character prefix
    db_by_full_lid = {}
    db_by_lid_15_list = {}
    for p in existing_db:
        lid = clean_val(p.get("lead_id"))
        if lid:
            db_by_full_lid[lid] = p
            prefix = lid[:15]
            if prefix not in db_by_lid_15_list:
                db_by_lid_15_list[prefix] = []
            db_by_lid_15_list[prefix].append(p)
            
    # 5. Process every Excel row (Strict 1-to-1 match, no accidental merges)
    updates = []
    inserts = []
    unchanged = []
    audit_log = []
    matched_db_ids = set()
    
    for r in range(2, ws.max_row + 1):
        vals = [ws.cell(row=r, column=c).value for c in range(1, ws.max_column + 1)]
        contact_name = clean_val(vals[0])
        company = clean_val(vals[1])
        mob = clean_val(vals[2])
        alt1 = clean_val(vals[3])
        alt2 = clean_val(vals[4])
        alt3 = clean_val(vals[5])
        email = clean_val(vals[6])
        alt_email = clean_val(vals[7])
        sec_email = clean_val(vals[8])
        lead_source = clean_val(vals[9])
        lead_type = clean_val(vals[10])
        designation = clean_val(vals[11])
        lid = clean_val(vals[12])
        
        target_p = None
        # 1. Exact full lead_id
        if lid and lid in db_by_full_lid and db_by_full_lid[lid]["id"] not in matched_db_ids:
            target_p = db_by_full_lid[lid]
        # 2. 15-char lead_id prefix
        elif lid and lid[:15] in db_by_lid_15_list:
            candidates = [p for p in db_by_lid_15_list[lid[:15]] if p["id"] not in matched_db_ids]
            if len(candidates) == 1:
                target_p = candidates[0]
            elif len(candidates) > 1:
                for cand in candidates:
                    cand_name = (clean_val(cand.get("name")) or "").lower()
                    cand_cname = (clean_val(cand.get("college_name")) or "").lower()
                    if (company and company.lower() in [cand_name, cand_cname]) or (contact_name and contact_name.lower() in [cand_name, cand_cname]):
                        target_p = cand
                        break
                if not target_p:
                    target_p = candidates[0]
                    
        if not target_p:
            # Row to insert
            name_val = contact_name or company
            cname_val = company or contact_name
            inserts.append({
                "excel_row": r,
                "name": name_val,
                "college_name": cname_val,
                "mobile": mob,
                "alt_phone": alt1,
                "alt_phone_2": alt2,
                "alt_phone_3": alt3,
                "email": email,
                "alternative_email": alt_email,
                "secondary_email": sec_email,
                "lead_source": [lead_source] if lead_source else [],
                "lead_type": [lead_type] if lead_type else [],
                "designation": designation,
                "lead_id": lid,
                "prospect_type": "college_contact"
            })
            audit_log.append({
                "action": "INSERT",
                "excel_row": r,
                "lead_id": lid,
                "name": name_val,
                "college_name": cname_val,
                "mobile": mob,
                "alt_phone": alt1,
                "alt_phone_2": alt2,
                "email": email
            })
        else:
            matched_db_ids.add(target_p["id"])
            target_name = contact_name or company
            target_cname = company or contact_name
            target_fields = {
                "name": target_name,
                "college_name": target_cname,
                "mobile": mob,
                "alt_phone": alt1,
                "alt_phone_2": alt2,
                "alt_phone_3": alt3,
                "email": email,
                "secondary_email": sec_email,
                "alternative_email": alt_email,
                "designation": designation,
            }
            
            field_diffs = {}
            for field, new_val in target_fields.items():
                old_val = clean_val(target_p.get(field))
                if old_val != new_val:
                    field_diffs[field] = {"old": old_val, "new": new_val}
                    
            if field_diffs:
                updates.append({
                    "excel_row": r,
                    "db_id": target_p["id"],
                    "lead_id": target_p.get("lead_id"),
                    "diffs": field_diffs,
                    "target_fields": target_fields
                })
                audit_log.append({
                    "action": "UPDATE",
                    "excel_row": r,
                    "db_id": target_p["id"],
                    "lead_id": target_p.get("lead_id"),
                    "diffs": field_diffs
                })
            else:
                unchanged.append(r)
                
    print(f"\n[4] Plan Summary:")
    print(f"  - Total source rows : {total_source_rows}")
    print(f"  - Records to update : {len(updates)}")
    print(f"  - Records to insert : {len(inserts)}")
    print(f"  - Records unchanged : {len(unchanged)}")
    print(f"  - Sum accounted for : {len(updates) + len(inserts) + len(unchanged)} / {total_source_rows}")
    
    if len(updates) + len(inserts) + len(unchanged) != total_source_rows:
        print("ERROR: Total accounted for does not equal total source rows! Aborting.")
        return False
        
    audit_path = os.path.join(scratch_dir, f"sync_audit_{timestamp}.json")
    with open(audit_path, "w", encoding="utf-8") as af:
        json.dump(audit_log, af, default=str, indent=2)
    print(f"[5] Detailed audit log saved to: {audit_path}")
    
    if not commit:
        print("\nDry-run completed successfully. No changes made to database.")
        return True
        
    # 6. Execute atomic transaction
    print("\n[6] Committing updates and inserts to database...")
    now = get_ist_now()
    
    with get_db_cursor() as cur:
        # Perform updates
        for u in updates:
            set_clauses = [
                "name = %s",
                "college_name = %s",
                "mobile = %s",
                "alt_phone = %s",
                "alt_phone_2 = %s",
                "alt_phone_3 = %s",
                "email = %s",
                "secondary_email = %s",
                "alternative_email = %s",
                "designation = %s",
                "updated_at = %s"
            ]
            params = [
                u["target_fields"]["name"],
                u["target_fields"]["college_name"],
                u["target_fields"]["mobile"],
                u["target_fields"]["alt_phone"],
                u["target_fields"]["alt_phone_2"],
                u["target_fields"]["alt_phone_3"],
                u["target_fields"]["email"],
                u["target_fields"]["secondary_email"],
                u["target_fields"]["alternative_email"],
                u["target_fields"]["designation"],
                now,
                u["db_id"]
            ]
            query = f"UPDATE prospects SET {', '.join(set_clauses)} WHERE id = %s"
            cur.execute(query, tuple(params))
            
        # Perform inserts
        for ins in inserts:
            query = """
                INSERT INTO prospects (
                    name, college_name, mobile, alt_phone, alt_phone_2, alt_phone_3,
                    email, secondary_email, alternative_email, designation,
                    lead_source, lead_type, prospect_type, lead_id, created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s
                ) RETURNING id
            """
            params = (
                ins["name"],
                ins["college_name"],
                ins["mobile"],
                ins["alt_phone"],
                ins["alt_phone_2"],
                ins["alt_phone_3"],
                ins["email"],
                ins["secondary_email"],
                ins["alternative_email"],
                ins["designation"],
                json.dumps(ins["lead_source"]),
                json.dumps(ins["lead_type"]),
                ins["prospect_type"],
                ins["lead_id"],
                now,
                now
            )
            cur.execute(query, params)
            new_id = cur.fetchone()["id"]
            print(f"  Inserted new prospect ID: {new_id} ({ins['name']} - {ins['college_name']})")
            
    print("\n[7] Database commit successful!")
    
    # 7. Post-sync verification
    new_count = execute_query(
        "SELECT COUNT(*) as count FROM prospects WHERE prospect_type = 'college_contact'",
        fetch="one"
    )["count"]
    print(f"[8] Post-sync college_contact count in DB: {new_count} (was {len(existing_db)})")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Synchronize college contacts from Excel")
    parser.add_argument("--commit", action="store_true", help="Commit changes to DB")
    args = parser.parse_args()
    
    run_sync(commit=args.commit)
