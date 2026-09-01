import sys
import os
from pathlib import Path

# Add parent directory to path to import database connection
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.connection import execute_update_delete, execute_query

def migrate():
    try:
        create_prospect_activities = """
        CREATE TABLE IF NOT EXISTS prospect_activities (
            id SERIAL PRIMARY KEY,
            prospect_id INT REFERENCES prospects(id) ON DELETE CASCADE,
            activity_type VARCHAR(50) NOT NULL, -- 'field_update', 'status_change', 'call', 'email', 'whatsapp', 'created'
            field_name VARCHAR(100),
            old_value TEXT,
            new_value TEXT,
            description TEXT NOT NULL,
            performed_by INT REFERENCES users(id) ON DELETE SET NULL,
            performed_by_name VARCHAR(150),
            meta JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_prospect_activities_prospect_id ON prospect_activities(prospect_id, created_at DESC);
        """
        execute_update_delete(create_prospect_activities)
        print("Created 'prospect_activities' table and index successfully.")
    except Exception as e:
        print(f"Error during migration: {e}")
        raise

if __name__ == "__main__":
    migrate()
