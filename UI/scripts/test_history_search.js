// Simulate filteredLogs logic from history page
function getLogCourses(log, prospect) {
  const explicitCourse = (log.course_interest || '').trim()
  if (explicitCourse) return explicitCourse.split(',').map(c => c.trim()).filter(Boolean)
  if (!prospect || !prospect.course_interest) return []
  return prospect.course_interest.split(',').map(c => c.trim()).filter(Boolean)
}

function expandLogByCourse(log, prospect) {
  const courses = getLogCourses(log, prospect)
  if (courses.length <= 1) {
    return [Object.assign({}, log, { course_interest: courses[0] || log.course_interest, displayCourse: courses[0] || (log.course_interest || (prospect && prospect.course_interest) || '').trim() || '' })]
  }
  return courses.map((course, idx) => Object.assign({}, log, { id: `${log.id}_course_${idx}`, course_interest: course, displayCourse: course }))
}

function filteredLogsForSearch(filteredCallLogsForStats, prospects, searchQuery, outcomeFilter, dateFilter, courseFilter, customDateRange) {
  const baseLogs = filteredCallLogsForStats.filter((log) => {
    const prospect = prospects[log.prospect_id]
    // Search
    const matchesSearch = (() => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      if (prospect) {
        if ((prospect.name || '').toLowerCase().includes(q)) return true
        if ((prospect.mobile || '').toLowerCase().includes(q)) return true
      }
      const courses = getLogCourses(log, prospect)
      if (courses.some(c => c.toLowerCase().includes(q))) return true
      const courseStr = (log.course_interest || (prospect && prospect.course_interest) || '').toLowerCase()
      if (courseStr.includes(q)) return true
      return false
    })()
    // Skipping outcome/date/courseFilter for this test
    return matchesSearch
  })
  return baseLogs.flatMap(log => expandLogByCourse(log, prospects[log.prospect_id]))
}

// Sample data: prospect with two courses
const prospects = {
  1: { id: 1, name: 'Alice Kumar', mobile: '9999999999', course_interest: 'Math 101, Physics 201' }
}

const callLogs = [
  { id: 10, prospect_id: 1, called_at: new Date().toISOString(), outcome: 'New' }
]

console.log('--- No search (empty) ---')
console.log(filteredLogsForSearch(callLogs, prospects, ''))
console.log('--- Search "Math" ---')
console.log(filteredLogsForSearch(callLogs, prospects, 'Math'))
console.log('--- Search "Physics" ---')
console.log(filteredLogsForSearch(callLogs, prospects, 'Physics'))
console.log('--- Search "Alice" ---')
console.log(filteredLogsForSearch(callLogs, prospects, 'Alice'))
