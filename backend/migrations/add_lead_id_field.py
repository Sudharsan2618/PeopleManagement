"""
Migration script to add lead_id field to prospects table
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import database connection
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete, execute_query

def migrate():
    """Add lead_id column to prospects table"""
    
    # Check if column already exists
    check_query = """
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'prospects' 
        AND column_name = 'lead_id'
    """
    
    existing_column = execute_query(check_query, fetch="one")
    
    if existing_column:
        print("SUCCESS: Column 'lead_id' already exists in prospects table")
        return
    
    # Add the column
    alter_query = """
        ALTER TABLE prospects 
        ADD COLUMN lead_id VARCHAR(100) NULL
    """
    
    try:
        execute_update_delete(alter_query)
        print("SUCCESS: Successfully added 'lead_id' column to prospects table")
        
    except Exception as e:
        print(f"ERROR: Error adding column: {e}")
        raise

if __name__ == "__main__":
    migrate()
