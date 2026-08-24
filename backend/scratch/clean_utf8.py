import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg2.connect(
    host="dpg-ctlpcvrqf0us7389o680-a.singapore-postgres.render.com",
    port=5432,
    database="peopleManagement",
    user="admin",
    password="kbOZpYYBZLfoeQRlBFajBfxi8A2JwPwk"
)
cur = conn.cursor()

# Check a few prospects' course_interest raw values
cur.execute("""
    SELECT id, lead_id, name, course_interest, prospect_type
    FROM prospects
    WHERE course_interest IS NOT NULL
      AND course_interest LIKE '%,%'
    LIMIT 20
""")
rows = cur.fetchall()
print("=== Prospects with comma in course_interest ===")
for r in rows:
    print(f"ID={r[0]} Lead={r[1]} Name={r[2][:20]} Type={r[4]}")
    print(f"  course_interest raw: {repr(r[3])}")
    print()

# Also check the specific prospect visible in the screenshot
cur.execute("""
    SELECT id, lead_id, name, course_interest, prospect_type
    FROM prospects
    WHERE name ILIKE '%KAMALESH%'
    LIMIT 5
""")
rows2 = cur.fetchall()
print("\n=== KAMALESH prospect ===")
for r in rows2:
    print(f"ID={r[0]} Lead={r[1]} Name={r[2]}")
    print(f"  course_interest raw: {repr(r[3])}")

conn.close()
