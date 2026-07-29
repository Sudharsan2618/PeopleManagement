import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import asyncio
from backend.database import get_db

async def run_migration():
    try:
        db = next(get_db())
        
        # Mapping of old statuses to new statuses
        status_map = {
            "New": "TATTI - New",
            "Interested": "TATTI - Interested",
            "Interested Followup": "TATTI - Interested Followup",
            "Interested-Followup": "TATTI - Interested Followup",
            "Qualified": "TATTI - Qualified",
            "Ringing / Not Reachable": "TATTI - Ringing / Not Reachable",
            "Not Interested": "TATTI - Not Interested"
        }
        
        print("Migrating TATTI Course prospects...")
        for old_val, new_val in status_map.items():
            result = db.execute(f"""
                UPDATE prospects 
                SET status = '{new_val}' 
                WHERE prospect_type = 'tatti_course' AND status = '{old_val}'
            """)
            print(f"Updated {result.rowcount} prospects from {old_val} to {new_val}")
            
            result2 = db.execute(f"""
                UPDATE call_logs
                SET outcome = '{new_val}', status_after_call = '{new_val}'
                WHERE prospect_id IN (SELECT id FROM prospects WHERE prospect_type = 'tatti_course')
                AND outcome = '{old_val}'
            """)
            print(f"Updated {result2.rowcount} call logs from {old_val} to {new_val}")
            
        db.commit()
        print("Migration complete!")
        
    except Exception as e:
        print("Error during migration:", e)

if __name__ == "__main__":
    asyncio.run(run_migration())
