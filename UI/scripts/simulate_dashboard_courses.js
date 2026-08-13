// Simulate dashboard course options merging for the problematic prospect string
const apiProspects = [
  { id: 1, course_interest: 'Wedding Photography & vide editing-July 2026Logistics & Supply Chain Management' },
  { id: 2, course_interest: 'Data Science, AI' }
]
const apiCourses = [{name:'AI'},{name:'Data Science'},{name:'Logistics & Supply Chain Management'}]

const prospectCourseSet = new Set()
const concatPattern = /[a-z0-9][A-Z]/
apiProspects.forEach((p)=>{
  if (p.course_interest && p.course_interest !== 'Unknown'){
    let raw = (p.course_interest||'').trim()
    if (concatPattern.test(raw)) raw = raw.replace(/([0-9])([A-Z])/g, '$1, $2').replace(/([a-z])([A-Z])/g, '$1, $2')
    raw.split(',').map(c=>c.trim()).filter(Boolean).forEach(course=>prospectCourseSet.add(course))
  }
})
const courseNames = apiCourses.map(c=>c.name)
const mergedCourses = Array.from(new Set([...courseNames, ...Array.from(prospectCourseSet)])).sort()
console.log(mergedCourses)
