import sys
import os

sys.path.append(r'c:\Users\thirs\Downloads\ppl management\PeopleManagement\backend')
from database.connection import execute_query

constraints = execute_query("""
    SELECT conname, contype, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE conrelid = 'prospects'::regclass
""", fetch="all")

print("Constraints on prospects table:")
for c in constraints:
    print(f"  {c['conname']} ({c['contype']}): {c['pg_get_constraintdef']}")
