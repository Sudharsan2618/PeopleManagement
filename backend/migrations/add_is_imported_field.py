"""
Migration script to add is_imported field to prospects table
This marks prospects that were imported from lead sheets as read-only for telecallers
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import database connection
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete, execute_query

def migrate():
    """Add is_imported column to prospects table"""
    
    # Check if column already exists
    check_query = """
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'prospects' 
        AND column_name = 'is_imported'
    """
    
    existing_column = execute_query(check_query, fetch="one")
    
    if existing_column:
        print("✅ Column 'is_imported' already exists in prospects table")
        return
    
    # Add the column
    alter_query = """
        ALTER TABLE prospects 
        ADD COLUMN is_imported BOOLEAN DEFAULT FALSE
    """
    
    try:
        execute_update_delete(alter_query)
        print("✅ Successfully added 'is_imported' column to prospects table")
        
        # Set existing prospects to is_imported = False by default
        update_query = """
            UPDATE prospects 
            SET is_imported = FALSE 
            WHERE is_imported IS NULL
        """
        execute_update_delete(update_query)
        print("✅ Set default value for existing prospects")
        
    except Exception as e:
        print(f"❌ Error adding column: {e}")
        raise

if __name__ == "__main__":
    migrate()
