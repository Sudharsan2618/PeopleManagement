"""
Script to remove all prospect assignments from Priya Nair
This will unassign all leads from Priya Nair without deleting prospect records or call history
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import database connection
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete, execute_query

def remove_priya_assignments():
    """Remove all prospect assignments from Priya Nair"""
    
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
            print("Available telecallers:")
            all_users = execute_query("SELECT id, name FROM users WHERE role = 'telecaller'", (), fetch="all")
            for user in all_users:
                print(f"  - ID: {user['id']}, Name: {user['name']}")
            return
    
    telecaller_id = telecaller['id']
    telecaller_name = telecaller['name']
    print(f"Found telecaller: {telecaller_name} (ID: {telecaller_id})")
    
    # Check current assignments
    check_assignments_query = """
        SELECT COUNT(*) as count 
        FROM prospect_assignments 
        WHERE telecaller_id = %s
    """
    assignment_count = execute_query(check_assignments_query, (telecaller_id,), fetch="one")
    print(f"Current assignments: {assignment_count['count']}")
    
    # Check prospects with assigned_to
    check_prospects_query = """
        SELECT COUNT(*) as count 
        FROM prospects 
        WHERE assigned_to = %s
    """
    prospect_count = execute_query(check_prospects_query, (telecaller_id,), fetch="one")
    print(f"Prospects with assigned_to: {prospect_count['count']}")
    
    if assignment_count['count'] == 0 and prospect_count['count'] == 0:
        print("✅ No assignments found for this telecaller")
        return
    
    # Remove assignments from prospect_assignments table
    delete_assignments_query = """
        DELETE FROM prospect_assignments 
        WHERE telecaller_id = %s
    """
    
    try:
        deleted_assignments = execute_update_delete(delete_assignments_query, (telecaller_id,))
        print(f"✅ Deleted {deleted_assignments} assignment records from prospect_assignments table")
    except Exception as e:
        print(f"❌ Error deleting assignments: {e}")
        raise
    
    # Update prospects table to set assigned_to = NULL
    update_prospects_query = """
        UPDATE prospects 
        SET assigned_to = NULL 
        WHERE assigned_to = %s
    """
    
    try:
        updated_prospects = execute_update_delete(update_prospects_query, (telecaller_id,))
        print(f"✅ Updated {updated_prospects} prospect records to set assigned_to = NULL")
    except Exception as e:
        print(f"❌ Error updating prospects: {e}")
        raise
    
    print(f"\n✅ Successfully removed all assignments from {telecaller_name}")
    print("All prospects are now unassigned and available for reassignment")
    print("No prospect data or call history was deleted")

if __name__ == "__main__":
    remove_priya_assignments()
