"""
Migration script to add alternative_email and college_name fields to prospects table
Adds: alternative_email, college_name
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import database connection
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete, execute_query

def migrate():
    """Add new columns to prospects table"""
    
    # List of columns to add with their definitions
    columns_to_add = [
        ("alternative_email", "VARCHAR(255)"),
        ("college_name", "VARCHAR(255)")
    ]
    
    for column_name, column_type in columns_to_add:
        # Check if column already exists
        check_query = """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'prospects' 
            AND column_name = %s
        """
        
        existing_column = execute_query(check_query, (column_name,), fetch="one")
        
        if existing_column:
            print(f"✅ Column '{column_name}' already exists in prospects table")
            continue
        
        # Add the column
        alter_query = f"""
            ALTER TABLE prospects 
            ADD COLUMN {column_name} {column_type}
        """
        
        try:
            execute_update_delete(alter_query)
            print(f"✅ Successfully added '{column_name}' column to prospects table")
        except Exception as e:
            print(f"❌ Error adding column '{column_name}': {e}")
            raise

if __name__ == "__main__":
    migrate()
