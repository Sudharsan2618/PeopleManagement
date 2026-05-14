import sys
import os

# Add parent directory to path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import get_connection, execute_query, execute_update_delete
from utils.phone_utils import clean_phone_number
import logging

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("migration")

def migrate_prospect_numbers():
    """
    Scans the prospects table and normalizes all mobile numbers to 10 digits.
    Handles UNIQUE constraint conflicts by reporting duplicates.
    """
    log.info("🚀 Starting Phone Number Normalization Migration...")
    
    # 1. Fetch all prospects
    prospects = execute_query("SELECT id, name, mobile FROM prospects", fetch="all")
    log.info(f"📋 Found {len(prospects)} prospects to check.")
    
    updated_count = 0
    conflict_count = 0
    skipped_count = 0
    
    conn = get_connection()
    cur = conn.cursor()
    
    try:
        for p in prospects:
            original = p['mobile']
            cleaned = clean_phone_number(original)
            
            if original == cleaned:
                skipped_count += 1
                continue
            
            if not cleaned:
                log.warning(f"⚠️  Skipping invalid number for ID {p['id']} ({p['name']}): '{original}'")
                skipped_count += 1
                continue

            try:
                # 2. Update the number
                cur.execute(
                    "UPDATE prospects SET mobile = %s, updated_at = NOW() WHERE id = %s",
                    (cleaned, p['id'])
                )
                updated_count += 1
                if updated_count % 50 == 0:
                    log.info(f"✅ Processed {updated_count} updates...")
            
            except Exception as e:
                # This usually happens if the cleaned number already exists in another record
                if "unique constraint" in str(e).lower():
                    log.error(f"❌ Conflict: Cannot update ID {p['id']} to '{cleaned}' because it already exists. (Original: '{original}')")
                    conflict_count += 1
                else:
                    log.error(f"❌ Error updating ID {p['id']}: {str(e)}")
                conn.rollback() # Rollback the failed update
                continue
            else:
                conn.commit() # Commit each successful update

        log.info("\n" + "="*40)
        log.info("🏁 MIGRATION COMPLETE")
        log.info(f"✅ Successfully Updated: {updated_count}")
        log.info(f"⏭️  Already Correct:    {skipped_count}")
        log.info(f"⚠️  Conflicts/Errors:   {conflict_count}")
        log.info("="*40)
        
        if conflict_count > 0:
            log.info("💡 Note: Conflicts happen when two prospects have the same number in different formats (e.g. +91 vs plain). Please review these manually.")

    except Exception as e:
        log.error(f"💥 Critical Migration Failure: {str(e)}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    migrate_prospect_numbers()
