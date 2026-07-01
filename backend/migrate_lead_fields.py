#!/usr/bin/env python
"""
Migration script to add lead_source, lead_type, and outcome columns to prospects table.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from database.connection import execute_update_delete

def run_migration():
    """Add lead_source, lead_type, and outcome columns to prospects table"""
    
    queries = [
        # Add columns
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS lead_source JSONB DEFAULT '[]'::jsonb;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS lead_type JSONB DEFAULT '[]'::jsonb;",
        "ALTER TABLE prospects ADD COLUMN IF NOT EXISTS outcome VARCHAR(100) DEFAULT 'New';",
    ]
    
    try:
        print("[MIGRATION] Starting migration...")
        
        for i, query in enumerate(queries, 1):
            execute_update_delete(query, ())
            print(f"Step {i}/{len(queries)}: {query[:70]}...")
        
        print("[MIGRATION] Migration completed successfully!")
        print("New lead fields added to prospects table")
        return True
        
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
