"""
Delete prospects from pages 1-63 (first 945 prospects ordered by updated_at DESC)
"""

from database.connection import execute_query, execute_update_delete

def delete_prospects_pages_1_to_63():
    """Delete the first 945 prospects (pages 1-63, 15 per page) in a single query"""
    
    # Delete the first 945 prospects ordered by updated_at DESC
    delete_query = """
        DELETE FROM prospects
        WHERE id IN (
            SELECT id FROM prospects
            ORDER BY updated_at DESC
            LIMIT 945
        )
    """
    
    result = execute_update_delete(delete_query)
    print(f"Deleted {result} prospects from pages 1-63")
    print(f"Remaining prospects: {execute_query('SELECT COUNT(*) as count FROM prospects', fetch='one')['count']}")

if __name__ == "__main__":
    print("WARNING: This will delete the first 945 prospects (pages 1-63)")
    confirm = input("Type 'yes' to confirm: ")
    
    if confirm.lower() == 'yes':
        delete_prospects_pages_1_to_63()
    else:
        print("Operation cancelled")
