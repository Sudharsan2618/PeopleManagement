import traceback
from database.connection import init_pool, close_pool
from routes.admin_routes import get_admin_reports

def run():
    try:
        init_pool()
        res = get_admin_reports(telecaller_id=2, start_date='2026-06-04', end_date='2026-06-10', prospect_type='student_admission')
        print("Success!")
    except Exception as e:
        print("FAILED!")
        traceback.print_exc()
    finally:
        close_pool()

if __name__ == '__main__':
    run()
