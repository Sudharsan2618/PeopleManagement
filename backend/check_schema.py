from database.connection import get_connection

try:
    db = get_connection()
    cursor = db.cursor()
    cursor.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name='call_logs' 
        ORDER BY ordinal_position
    """)
    print("call_logs table columns:")
    for row in cursor.fetchall():
        print(f"  {row[0]}: {row[1]}")
    cursor.close()
    db.close()
except Exception as e:
    print(f"Error: {e}")
