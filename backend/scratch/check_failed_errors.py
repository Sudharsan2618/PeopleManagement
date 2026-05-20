from database.connection import execute_query
import json

# Get failed messages from the database
failed_msgs = execute_query("""
    SELECT m.id, m.prospect_id, p.name, p.mobile, m.status, m.payload
    FROM whatsapp_messages m
    JOIN prospects p ON m.prospect_id = p.id
    WHERE m.status = 'failed'
    ORDER BY m.id DESC
    LIMIT 20
""")

print("FAILED MESSAGES INFO:")
for m in failed_msgs:
    print(f"Msg ID: {m['id']}, Prospect: {m['name']} ({m['mobile']})")
    print(f"  Status: {m['status']}")
    print(f"  Payload: {m['payload']}")
    print("-" * 50)
