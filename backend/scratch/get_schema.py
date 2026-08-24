import asyncio
import os
import sys
from pprint import pprint

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.connection import execute_query

def main():
    try:
        # Get schema for prospects
        res = execute_query("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'prospects';
        """)
        print("--- PROSPECTS SCHEMA ---")
        for row in res:
            print(f"{row['column_name']}: {row['data_type']}")
            
        print("\n--- COURSES SCHEMA ---")
        res2 = execute_query("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'courses';
        """)
        for row in res2:
            print(f"{row['column_name']}: {row['data_type']}")
            
        print("\n--- STATUS TYPES ---")
        # Just grab a sample of distinct statuses
        res3 = execute_query("""
        SELECT DISTINCT status FROM prospects;
        """)
        for row in res3:
            print(row['status'])

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
