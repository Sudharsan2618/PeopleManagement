"""
Migration script to add website field to prospects table
Adds: website
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import database connection
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete, execute_query

def migrate():
    """Add website column to prospects table"""
    
    # Check if column already exists
    check_query = """
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'prospects' 
        AND column_name = %s
    """
    
    existing_column = execute_query(check_query, ("website",), fetch="one")
    
    if existing_column:
        print("✅ Column 'website' already exists in prospects table")
        return
    
    # Add the column
    alter_query = """
        ALTER TABLE prospects 
        ADD COLUMN website VARCHAR(500)
    """
    
    try:
        execute_update_delete(alter_query)
        print("✅ Successfully added 'website' column to prospects table")
    except Exception as e:
        print(f"❌ Error adding column 'website': {e}")
        raise

if __name__ == "__main__":
    migrate()
