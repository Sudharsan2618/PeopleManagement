import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')

conn = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT"),
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    sslmode=os.getenv("DB_SSLMODE", "require")
)

with open('add_crm_migration.sql', 'r') as f:
    sql = f.read()

cur = conn.cursor()
cur.execute(sql)
conn.commit()
cur.close()
conn.close()

print("Migration executed successfully!")
