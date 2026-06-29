import re

with open('UI/app/admin/reports/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Hide "Visit Done / Decision Pending" tab for CC
tab_trigger = '<TabsTrigger value="fieldvisits">Visit Done / Decision Pending</TabsTrigger>'
new_tab_trigger = '{activeTabType === "student_admission" && <TabsTrigger value="fieldvisits">Visit Done / Decision Pending</TabsTrigger>}'
content = content.replace(tab_trigger, new_tab_trigger)

tab_content = '<TabsContent value="fieldvisits" className="space-y-6 mt-6">'
new_tab_content = '{activeTabType === "student_admission" && (\n        <TabsContent value="fieldvisits" className="space-y-6 mt-6">'
content = content.replace(tab_content, new_tab_content)

# We need to close the parentheses around the TabsContent.
# Search for the closing TabsContent for fieldvisits
fieldvisits_end = '</TabsContent>\n      </Tabs>'
new_fieldvisits_end = '</TabsContent>\n      )}\n      </Tabs>'
content = content.replace(fieldvisits_end, new_fieldvisits_end)

# 2. Update the KPI Cards
# They start at <!-- Summary Stats --> (Actually: {/* Summary Stats */} )
# and end right before {/* Charts */}
kpi_match = re.search(r'\{\/\* Summary Stats \*\/}.*?\{\/\* Charts \*\/\}', content, re.DOTALL)
if kpi_match:
    kpis = kpi_match.group(0)
    # The original has 4 cards. We will make a conditional block
    
    new_kpis = """{/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activeTabType === 'student_admission' ? (
              <>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"><Phone className="h-5 w-5 text-blue-600" /></div><div><div className="text-2xl font-bold">{summary.totalCalls}</div><p className="text-xs text-muted-foreground">Total Calls</p></div></div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-indigo-600" /></div><div><div className="text-2xl font-bold">{visitDoneProspects.length}</div><p className="text-xs text-muted-foreground">Visit Done / Decision Pending</p></div></div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div><div><div className="text-2xl font-bold">{categoryCounts['Admission Done ✓'] || 0}</div><p className="text-xs text-muted-foreground">Admission Done</p></div></div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center"><PhoneCall className="h-5 w-5 text-orange-600" /></div><div><div className="text-2xl font-bold">{categoryCounts['Warm'] || 0}</div><p className="text-xs text-muted-foreground">Warm</p></div></div></CardContent></Card>
              </>
            ) : (
              <>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"><Phone className="h-5 w-5 text-blue-600" /></div><div><div className="text-2xl font-bold">{summary.totalCalls}</div><p className="text-xs text-muted-foreground">Total Calls</p></div></div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-orange-600" /></div><div><div className="text-2xl font-bold">{categoryCounts['Proposal Sent'] || 0}</div><p className="text-xs text-muted-foreground">Proposal Sent</p></div></div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div><div><div className="text-2xl font-bold">{categoryCounts['Qualified'] || 0}</div><p className="text-xs text-muted-foreground">Qualified</p></div></div></CardContent></Card>
                <Card><CardContent className="pt-4"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center"><PhoneCall className="h-5 w-5 text-red-600" /></div><div><div className="text-2xl font-bold">{categoryCounts['Not Interested'] || 0}</div><p className="text-xs text-muted-foreground">Not Interested</p></div></div></CardContent></Card>
              </>
            )}
          </div>

          {/* Charts */}"""
    content = content[:kpi_match.start()] + new_kpis + content[kpi_match.end():]

# We should also ensure the import for FileText, Building2, etc. if we used them in the rewrite. 
# But I just used Phone, CheckCircle2, PhoneCall to keep it simple and native.

with open('UI/app/admin/reports/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("page.tsx updated with correct CC KPIs!")
