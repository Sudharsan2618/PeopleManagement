import psycopg2
from database.connection import DB_CONFIG

def check_schema():
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'whatsapp_campaigns'")
    for row in cur.fetchall():
        print(f"{row[0]}: {row[1]}")
    cur.close()
    conn.close()

if __name__ == "__main__":
    check_schema()
