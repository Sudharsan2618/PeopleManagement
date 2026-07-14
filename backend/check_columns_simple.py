import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database.connection import execute_query

# Check if alt_phone columns exist
columns_to_check = ['alt_phone', 'alt_phone_2', 'alt_phone_3']
print("Checking alt phone columns in prospects table:")
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
