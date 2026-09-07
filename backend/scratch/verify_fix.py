import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from services.prospect_service import ProspectService

prospects = ProspectService.get_prospects_by_assignee(9)
test_ids = [956, 11835, 11884, 15824]
for p in prospects:
    if p['id'] in test_ids:
        print(f"ID {p['id']} - {p['name']}: status={p['status']!r}, course_statuses={p['course_statuses']}")
