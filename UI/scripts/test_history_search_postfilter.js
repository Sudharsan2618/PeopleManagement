// Similar to previous test but reflects post-expansion filtering behavior
function getLogCourses(log, prospect) {
  const explicitCourse = (log.course_interest || '').trim()
  if (explicitCourse) return explicitCourse.split(',').map(c => c.trim()).filter(Boolean)
  if (!prospect || !prospect.course_interest) return []
  return prospect.course_interest.split(',').map(c => c.trim()).filter(Boolean)
}
function expandLogByCourse(log, prospect) {
  const courses = getLogCourses(log, prospect)
  if (courses.length <= 1) return [Object.assign({}, log, { course_interest: courses[0] || log.course_interest, displayCourse: courses[0] || (log.course_interest || (prospect && prospect.course_interest) || '').trim() || '' })]
  return courses.map((course, idx) => Object.assign({}, log, { id: `${log.id}_course_${idx}`, course_interest: course, displayCourse: course }))
}
function filteredLogsForSearch(filteredCallLogsForStats, prospects, searchQuery) {
  const baseLogs = filteredCallLogsForStats.filter((log) => {
    const prospect = prospects[log.prospect_id]
    // basic match: include if prospect name/mobile/course includes query
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    if (prospect && (prospect.name || '').toLowerCase().includes(q)) return true
    if (prospect && (prospect.mobile || '').toLowerCase().includes(q)) return true
    const courses = getLogCourses(log, prospect)
    if (courses.some(c => c.toLowerCase().includes(q))) return true
    const courseStr = (log.course_interest || (prospect && prospect.course_interest) || '').toLowerCase()
    if (courseStr.includes(q)) return true
    return false
  })
  let expanded = baseLogs.flatMap(l => expandLogByCourse(l, prospects[l.prospect_id]))
  if (searchQuery && searchQuery.trim() !== '') {
    const q = searchQuery.toLowerCase()
    expanded = expanded.filter(row => {
      const prospect = prospects[row.prospect_id]
      const nameMatches = prospect && (prospect.name || '').toLowerCase().includes(q)
      const mobileMatches = prospect && (prospect.mobile || '').toLowerCase().includes(q)
      const courseMatches = ((row.displayCourse || row.course_interest || '')).toLowerCase().includes(q)
      return !!(nameMatches || mobileMatches || courseMatches)
    })
  }
  return expanded
}

const prospects = {1:{id:1,name:'Alice Kumar',mobile:'9999999999',course_interest:'Math 101, Physics 201'}}
const callLogs = [{id:10,prospect_id:1,called_at:new Date().toISOString(),outcome:'New'}]
console.log('Search Math -> should show only Math row')
console.log(filteredLogsForSearch(callLogs,prospects,'Math'))
console.log('Search Physics -> only Physics row')
console.log(filteredLogsForSearch(callLogs,prospects,'Physics'))
console.log('Search Alice -> both rows')
console.log(filteredLogsForSearch(callLogs,prospects,'Alice'))
