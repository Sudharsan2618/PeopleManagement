import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST"),
    "port": os.getenv("DB_PORT"),
    "database": os.getenv("DB_NAME"),
    "user": os.getenv("DB_USER"),
    "password": os.getenv("DB_PASSWORD")
}

def check_schema():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    tables = ['prospects', 'call_logs']
    for table in tables:
        print(f"\n--- Schema for {table} ---")
        cur.execute(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}'")
        for row in cur.fetchall():
            print(f"{row['column_name']}: {row['data_type']}")
            
    cur.close()
    conn.close()

if __name__ == "__main__":
    check_schema()
