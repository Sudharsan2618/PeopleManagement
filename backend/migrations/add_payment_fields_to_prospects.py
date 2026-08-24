"""
Migration script to add payment and course fields to prospects table
Adds: course_fee, amount_paid, payment_status, payment_mode, transaction_id, batch, start_month, year
"""

import sys
from pathlib import Path

# Add parent directory to path to import database connection
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete, execute_query

def migrate():
    """Add new columns to prospects table for tracking payments and courses"""
    
    # List of columns to add with their definitions
    columns_to_add = [
        ("course_fee", "NUMERIC(10, 2) DEFAULT 0"),
        ("amount_paid", "NUMERIC(10, 2) DEFAULT 0"),
        ("payment_status", "VARCHAR(50) DEFAULT 'Not Paid'"),
        ("payment_mode", "VARCHAR(100)"),
        ("transaction_id", "VARCHAR(100)"),
        ("batch", "VARCHAR(100)"),
        ("start_month", "VARCHAR(50)"),
        ("year", "VARCHAR(50)")
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
            print(f"INFO: Column '{column_name}' already exists in prospects table")
            continue
        
        # Add the column
        alter_query = f"""
            ALTER TABLE prospects 
            ADD COLUMN {column_name} {column_type}
        """
        
        try:
            execute_update_delete(alter_query)
            print(f"SUCCESS: Successfully added '{column_name}' column to prospects table")
        except Exception as e:
            print(f"ERROR: Error adding column '{column_name}': {e}")
            raise

if __name__ == "__main__":
    migrate()
