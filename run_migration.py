import sys
import os

# Add backend dir to path so we can import database
sys.path.append(os.path.abspath('backend'))

from database.connection import get_db_connection

def run_migration():
    try:
        with open('add_alt_phone_3_migration.sql', 'r') as f:
            sql = f.read()
            
        with get_db_connection() as conn:
            cur = conn.cursor()
            cur.execute(sql)
            conn.commit()
            cur.close()
        print("Migration executed successfully!")
    except Exception as e:
        print(f"Error executing migration: {e}")

if __name__ == "__main__":
    run_migration()
