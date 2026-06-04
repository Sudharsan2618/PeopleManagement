#!/usr/bin/env python
"""
Migration script to add notification columns to call_logs table
Run this to fix the "column does not exist" error
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.dirname(__file__))

from database.connection import execute_update_delete

def run_migration():
    """Add notification columns to call_logs table"""
    
    queries = [
        # Add columns
        "ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS notification_shown BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS notification_dismissed BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS notification_last_shown_at TIMESTAMP DEFAULT NULL;",
        # Create indexes
        "CREATE INDEX IF NOT EXISTS idx_call_logs_callback_pending ON call_logs(callback_scheduled_at, notification_dismissed) WHERE outcome = 'callback' AND notification_dismissed = FALSE;",
        "CREATE INDEX IF NOT EXISTS idx_call_logs_notification_status ON call_logs(notification_shown, notification_last_shown_at);",
    ]
    
    try:
        print("🔄 Starting migration...\n")
        
        for i, query in enumerate(queries, 1):
            execute_update_delete(query, ())
            print(f"✓ Step {i}/{len(queries)}: {query[:70]}...")
        
        print("\n✅ Migration completed successfully!")
        print("📊 Notification columns added to call_logs table")
        print("🔔 Callback reminder system is now ready!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
