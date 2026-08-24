from pathlib import Path

path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
lines = text.splitlines()
start = None
end = None
for idx, line in enumerate(lines):
    if start is None and line.strip() == 'const filteredLogs = useMemo(() => {':
        start = idx
    if start is not None and end is None and line.strip() == 'const paginatedLogs = useMemo(() => {':
        end = idx
        break
if start is None or end is None:
    raise RuntimeError(f'start={start} end={end} not found')
replacement = '''  const getLogCourses = (log: CallLog, prospect?: Prospect) => {
    const explicitCourse = (log.course_interest || "").trim()
    if (explicitCourse) {
      return explicitCourse.split(",").map((c: string) => c.trim()).filter(Boolean)
    }
    if (!prospect?.course_interest) return []
    return prospect.course_interest.split(",").map((c: string) => c.trim()).filter(Boolean)
  }

  const expandLogByCourse = (log: CallLog, prospect?: Prospect) => {
    const courses = getLogCourses(log, prospect)
    if (courses.length <= 1) {
      return [
        {
          ...log,
          displayCourse: courses[0] || (log.course_interest || prospect?.course_interest || "").trim() || "",
        } as CallLog & { displayCourse: string }
      ]
    }
    return courses.map((course: string, idx: number) => ({
      ...log,
      id: f"{log.id}_course_{idx}",
      course_interest: course,
      displayCourse: course,
    }) as CallLog & { displayCourse: string })
  }


  // Filter logs


  const filteredLogs = useMemo(() => {
    const baseLogs = filteredCallLogsForStats.filter((log) => {
      const prospect = prospects[log.prospect_id]

      // Search
      const matchesSearch =
        searchQuery === "" ||
        (prospect &&
          (prospect.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            prospect.mobile?.includes(searchQuery)))

      // Outcome Filter
      if (outcomeFilter !== "all") {
        if (outcomeFilter === "College Contact") {
          const leadOutcomes = [
            "New",
            "Interested",
            "Interested Followup",
            "Proposal To Be Sent",
            "Proposal Sent",
            "Training Date Followup",
            "Qualified",
            "Ringing / Not Reachable",
            "Not Interested",
            "College Contact"
          ]
          if (!leadOutcomes.includes(log.outcome)) return false
        } else if (log.outcome !== outcomeFilter) {
          return false
        }
      }

      // Date filter
      let matchesDate = true
      if (dateFilter !== "all") {
        const logDate = new Date(log.called_at)
        const now = new Date()
        const todayStr = now.toLocaleDateString("en-CA")
        const logDateStr = logDate.toLocaleDateString("en-CA")
        if (dateFilter === "today") {
          matchesDate = logDateStr === todayStr
        } else if (dateFilter === "week") {
          const weekAgo = new Date(now)
          weekAgo.setDate(weekAgo.getDate() - 7)
          matchesDate = logDate >= weekAgo
        } else if (dateFilter === "month") {
          const monthAgo = new Date(now)
          monthAgo.setMonth(monthAgo.getMonth() - 1)
          matchesDate = logDate >= monthAgo
        } else if (dateFilter === "custom" && customDateRange.from && customDateRange.to) {
          const fromDate = new Date(customDateRange.from)
          const toDate = new Date(customDateRange.to)
          toDate.setHours(23, 59, 59, 999)
          matchesDate = logDate >= fromDate && logDate <= toDate
        }
      }

      return matchesSearch && matchesDate
    })

    const expandedLogs = baseLogs.flatMap((log) => expandLogByCourse(log, prospects[log.prospect_id]))
    if (courseFilter === "all") return expandedLogs
    return expandedLogs.filter((log) => {
      const courseName = ((log as any).displayCourse || log.course_interest || "").trim()
      return courseName === courseFilter
    })
  }, [filteredCallLogsForStats, prospects, searchQuery, outcomeFilter, dateFilter, courseFilter, customDateRange])



  const filteredStatsLogs = useMemo(() => {
    const expandedStatsLogs = filteredCallLogsForStats.flatMap((log) =>
      expandLogByCourse(log, prospects[log.prospect_id])
    )
    if (courseFilter === "all") return expandedStatsLogs
    return expandedStatsLogs.filter((log) => {
      const courseName = ((log as any).displayCourse || log.course_interest || "").trim()
      return courseName === courseFilter
    })
  }, [filteredCallLogsForStats, courseFilter, prospects])
'''
new_lines = replacement.splitlines()
lines = lines[:start] + new_lines + lines[end:]
path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('patched', start, end)
