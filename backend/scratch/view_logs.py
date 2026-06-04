import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    database=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD")
)
cur = conn.cursor()

cur.execute("""
    SELECT cl.id, cl.prospect_id, p.name, cl.outcome, cl.callback_scheduled_at, cl.called_at
    FROM call_logs cl
    LEFT JOIN prospects p ON p.id = cl.prospect_id
    WHERE cl.telecaller_id = 9
    ORDER BY cl.called_at DESC
""")
logs = cur.fetchall()
print("All call logs for telecaller 9:")
for l in logs:
    print(l)

cur.close()
conn.close()
