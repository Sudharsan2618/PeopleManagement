import sys, os
sys.path.insert(0, r'c:\Users\thirs\Downloads\ppl management\PeopleManagement\backend')
from database.connection import init_pool, get_connection, put_connection
from psycopg2.extras import RealDictCursor
init_pool()
conn = get_connection()
try:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("""
            SELECT id, name, course_interest 
            FROM prospects 
            WHERE name ILIKE '%KAMALESH%'
            LIMIT 50
        """)
        rows = cur.fetchall()
        for r in rows:
            if 'KANDHA' in r['name'].upper() or len(rows) < 10:
                print(f"Name: {r['name']}, Course: {repr(r['course_interest'])}")
finally:
    put_connection(conn)
