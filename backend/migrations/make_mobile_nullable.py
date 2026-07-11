"""
Migration script to make mobile column nullable in prospects table
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import database connection
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete, execute_query

def migrate():
    """Make mobile column nullable in prospects table"""
    
    # Check if mobile column is already nullable
    check_query = """
        SELECT is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'prospects' 
        AND column_name = 'mobile'
    """
    
    result = execute_query(check_query, fetch="one")
    
    if result and result.get('is_nullable') == 'YES':
        print("✅ Column 'mobile' is already nullable in prospects table")
        return
    
    # Make the column nullable
    alter_query = """
        ALTER TABLE prospects 
        ALTER COLUMN mobile DROP NOT NULL
    """
    
    try:
        execute_update_delete(alter_query)
        print("✅ Successfully made 'mobile' column nullable in prospects table")
    except Exception as e:
        print(f"❌ Error making 'mobile' column nullable: {e}")
        raise

if __name__ == "__main__":
    migrate()
