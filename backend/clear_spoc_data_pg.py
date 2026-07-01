from database.connection import get_db_connection

def clear_data():
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                print("Clearing SPOC data...")
                cur.execute("DELETE FROM follow_up_tasks")
                cur.execute("DELETE FROM spoc_escalations")
                cur.execute("DELETE FROM spoc_activities")
                cur.execute("DELETE FROM spoc_visit_entries")
                cur.execute("DELETE FROM spoc_reports")
                conn.commit()
                print("All SPOC data successfully removed from the database.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    clear_data()
