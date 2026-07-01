import urllib.request
import urllib.error

url = 'http://localhost:8000/admin/reports?telecaller_id=2&start_date=2026-06-04&end_date=2026-06-10'
try:
    with urllib.request.urlopen(url) as response:
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code}")
    print(e.read().decode())
except Exception as e:
    print(f"Error: {e}")
