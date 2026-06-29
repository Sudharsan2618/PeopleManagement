"""
Migration script to add new fields to prospects table
Adds: alt_phone, secondary_email, city, address, postal_code, designation, company, comments, follow_up_date, is_imported
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
        ("alt_phone", "VARCHAR(20)"),
        ("secondary_email", "VARCHAR(255)"),
        ("city", "VARCHAR(100)"),
        ("address", "TEXT"),
        ("postal_code", "VARCHAR(20)"),
        ("designation", "VARCHAR(150)"),
        ("company", "VARCHAR(200)"),
        ("comments", "VARCHAR(1000)"),
        ("follow_up_date", "VARCHAR(50)"),
        ("is_imported", "BOOLEAN DEFAULT FALSE")
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
