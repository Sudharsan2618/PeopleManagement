import re

with open('UI/app/admin/reports/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add activeTabType state
state_match = re.search(r'const \[reportType, setReportType\] = useState\("overview"\)', content)
if state_match:
    content = content[:state_match.start()] + 'const [activeTabType, setActiveTabType] = useState<"student_admission" | "college_contact">("student_admission")\n  ' + content[state_match.start():]

# 2. Update API calls in useEffect
fetch_match = re.search(r'adminApi\.getReports\(selectedTelecallerId \?\? undefined, startDate, endDate\)', content)
if fetch_match:
    content = content.replace('adminApi.getReports(selectedTelecallerId ?? undefined, startDate, endDate)', 'adminApi.getReports(selectedTelecallerId ?? undefined, startDate, endDate, activeTabType)')

# 3. Add activeTabType to useEffect dependencies
dep_match = re.search(r'\}, \[selectedTelecallerId, startDate, endDate\]\)', content)
if dep_match:
    content = content.replace('}, [selectedTelecallerId, startDate, endDate])', '}, [selectedTelecallerId, startDate, endDate, activeTabType])')

# 4. Add prospectType to callLogsApi.getAll
call_match = re.search(r'callLogsApi\.getAll\(startDate, endDate, selectedTelecallerId \?\? undefined\)', content)
if call_match:
    content = content.replace('callLogsApi.getAll(startDate, endDate, selectedTelecallerId ?? undefined)', 'callLogsApi.getAll(startDate, endDate, selectedTelecallerId ?? undefined, activeTabType)')

# 5. Add toggle buttons to UI
header_match = re.search(r'<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">', content)
if header_match:
    toggle_html = """
      <div className="flex gap-2">
        <Button variant={activeTabType === "student_admission" ? "default" : "outline"} onClick={() => setActiveTabType("student_admission")}
          className={activeTabType === "student_admission" ? "bg-blue-600 hover:bg-blue-700 flex-1" : "flex-1"}>
          Student Admission
        </Button>
        <Button variant={activeTabType === "college_contact" ? "default" : "outline"} onClick={() => setActiveTabType("college_contact")}
          className={activeTabType === "college_contact" ? "bg-violet-600 hover:bg-violet-700 flex-1" : "flex-1"}>
          College Contact
        </Button>
      </div>
"""
    content = content[:header_match.start()] + toggle_html + content[header_match.start():]

# 6. Make REPORT_OUTCOME dynamic based on activeTabType
# We can just change the constant mapping arrays right inside the component, or define them globally and use them based on activeTabType.
content = content.replace('const REPORT_OUTCOME_ORDER = ', 'const SA_OUTCOME_ORDER = ')
content = content.replace('const REPORT_OUTCOME_COLORS: Record<string, string> = {', 'const SA_OUTCOME_COLORS: Record<string, string> = {')

# Define CC constants right below SA constants
cc_constants = """
const CC_OUTCOME_ORDER = ['New', 'Interested', 'Interested Followup', 'Proposal To Be Sent', 'Proposal Sent', 'Training Date Followup', 'Qualified', 'Ringing / Not Reachable', 'Not Interested']
const CC_OUTCOME_COLORS: Record<string, string> = {
  'New': '#3b82f6',
  'Interested': '#8b5cf6',
  'Interested Followup': '#a855f7',
  'Proposal To Be Sent': '#f59e0b',
  'Proposal Sent': '#f97316',
  'Training Date Followup': '#eab308',
  'Qualified': '#10b981',
  'Ringing / Not Reachable': '#64748b',
  'Not Interested': '#ef4444'
}
"""
content = content.replace('}\n\nconst CALL_HISTORY_STATUS_LABELS', '}\n' + cc_constants + '\nconst CALL_HISTORY_STATUS_LABELS')

# Update usage in the component
content = content.replace('REPORT_OUTCOME_ORDER', '(activeTabType === "student_admission" ? SA_OUTCOME_ORDER : CC_OUTCOME_ORDER)')
content = content.replace('REPORT_OUTCOME_COLORS', '(activeTabType === "student_admission" ? SA_OUTCOME_COLORS : CC_OUTCOME_COLORS)')

# Write back
with open('UI/app/admin/reports/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("page.tsx patched successfully!")
