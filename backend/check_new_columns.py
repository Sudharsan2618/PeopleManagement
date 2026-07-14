import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database.connection import execute_query

# Check if new columns exist
columns_to_check = ['alternative_email', 'college_name']
print("Checking new columns in prospects table:")
for col in columns_to_check:
    result = execute_query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'prospects' AND column_name = %s",
        (col,),
        fetch='one'
    )
    if result:
        print(f"  ✅ {col} exists")
    else:
        print(f"  ❌ {col} does NOT exist")
