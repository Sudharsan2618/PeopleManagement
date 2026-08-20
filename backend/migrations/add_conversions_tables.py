import sys
import os
from pathlib import Path

# Add parent directory to path to import database connection
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete, execute_query

def migrate():
    try:
        # 1. Add 'converted' column to prospects if it doesnot exist 
        check_query = """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'prospects' 
            AND column_name = 'converted'
        """
        if not execute_query(check_query, fetch="one"):
            execute_update_delete("ALTER TABLE prospects ADD COLUMN converted BOOLEAN DEFAULT FALSE")
            print("Added 'converted' column to prospects table")
        else:
            print("'converted' column already exists in prospects table")

        # 2. Create converted_enquiries table
        create_converted_enquiries = """
        CREATE TABLE IF NOT EXISTS converted_enquiries (
            id SERIAL PRIMARY KEY,
            original_lead_id VARCHAR(100),
            prospect_id INT REFERENCES prospects(id) ON DELETE SET NULL,
            course_id INT REFERENCES courses(id) ON DELETE SET NULL,
            course_name VARCHAR(150),
            course_module VARCHAR(100),
            telecaller_id INT,
            lead_source JSONB,
            conversion_status VARCHAR(50) DEFAULT 'Converted',
            course_fee NUMERIC(10, 2) DEFAULT 0,
            total_paid NUMERIC(10, 2) DEFAULT 0,
            pending_amount NUMERIC(10, 2) DEFAULT 0,
            payment_status VARCHAR(50) DEFAULT 'Payment Pending',
            converted_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            converted_by INT
        )
        """
        execute_update_delete(create_converted_enquiries)
        print("Created 'converted_enquiries' table")

        # 3. Create payment_history table
        create_payment_history = """
        CREATE TABLE IF NOT EXISTS payment_history (
            id SERIAL PRIMARY KEY,
            converted_enquiry_id INT REFERENCES converted_enquiries(id) ON DELETE CASCADE,
            amount NUMERIC(10, 2) NOT NULL,
            payment_date DATE NOT NULL,
            payment_mode VARCHAR(50),
            transaction_id VARCHAR(100),
            remarks TEXT,
            created_by INT,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
        """
        execute_update_delete(create_payment_history)
        print("Created 'payment_history' table")
    except Exception as e:
        print(f"Error during migration: {e}")
        raise

if __name__ == "__main__":
    migrate()
