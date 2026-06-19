
from database.connection import execute_update_delete, get_db_connection

def drop_constraint():
    query = 'ALTER TABLE follow_up_tasks DROP CONSTRAINT IF EXISTS follow_up_tasks_source_entry_id_fkey'
    
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            print(f'Executing: {query}')
            cur.execute(query)
        conn.commit()
    print('Foreign key constraint dropped successfully.')

if __name__ == '__main__':
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    drop_constraint()
