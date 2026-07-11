import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from database.connection import execute_query

result = execute_query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'prospects' AND column_name LIKE 'alt_phone%'",
    fetch='all'
)
print("Alt phone columns in prospects table:")
for row in result:
    print(f"  - {row['column_name']}")
