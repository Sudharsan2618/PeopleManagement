
from database.connection import execute_update_delete, get_db_connection

def clear_data():
    queries = [
        'DELETE FROM follow_up_tasks',
        'DELETE FROM spoc_visit_entries',
        'DELETE FROM spoc_activities',
        'DELETE FROM spoc_escalations',
        'DELETE FROM spoc_reports'
    ]
    
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            for q in queries:
                print(f'Executing: {q}')
                cur.execute(q)
        conn.commit()
    print('All SPOC reports and follow-up data cleared successfully.')

if __name__ == '__main__':
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    clear_data()
