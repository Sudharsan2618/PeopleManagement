"""
Script to remove all call logs and callbacks from Priya Nair
This will set all call-related statistics to zero
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import database connection
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete, execute_query

def remove_priya_call_logs():
    """Remove all call logs and callbacks from Priya Nair"""
    
    # First, find Priya Nair's telecaller ID
    find_telecaller_query = """
        SELECT id, name 
        FROM users 
        WHERE name ILIKE %s
    """
    
    telecaller = execute_query(find_telecaller_query, ('%Priya%Nair%',), fetch="one")
    
    if not telecaller:
        print("❌ Could not find Priya Nair in the users table")
        print("Searching for any telecaller with 'Priya' in the name...")
        
        # Try broader search
        broader_search = """
            SELECT id, name 
            FROM users 
            WHERE name ILIKE %s
        """
        telecaller = execute_query(broader_search, ('%Priya%',), fetch="one")
        
        if not telecaller:
            print("❌ No telecaller found with 'Priya' in the name")
            return
    
    telecaller_id = telecaller['id']
    telecaller_name = telecaller['name']
    print(f"Found telecaller: {telecaller_name} (ID: {telecaller_id})")
    
    # Check current call logs
    check_call_logs_query = """
        SELECT COUNT(*) as count 
        FROM call_logs 
        WHERE telecaller_id = %s
    """
    call_log_count = execute_query(check_call_logs_query, (telecaller_id,), fetch="one")
    print(f"Current call logs: {call_log_count['count']}")
    
    if call_log_count['count'] == 0:
        print("✅ No call logs found for this telecaller")
        return
    
    # Delete all call logs
    delete_call_logs_query = """
        DELETE FROM call_logs 
        WHERE telecaller_id = %s
    """
    
    try:
        deleted_logs = execute_update_delete(delete_call_logs_query, (telecaller_id,))
        print(f"✅ Deleted {deleted_logs} call log records")
    except Exception as e:
        print(f"❌ Error deleting call logs: {e}")
        raise
    
    print(f"\n✅ Successfully removed all call logs from {telecaller_name}")
    print("All call statistics are now zero")
    print("No prospect data was deleted, only call history")

if __name__ == "__main__":
    remove_priya_call_logs()
