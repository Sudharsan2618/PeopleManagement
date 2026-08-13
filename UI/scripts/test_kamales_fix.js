// Test the normalization and expansion for the problematic string
function normalize(s){
  return s.replace(/([0-9])([A-Z])/g, "$1, $2").replace(/([a-z])([A-Z])/g, "$1, $2")
}
function splitCourses(raw){
  const r = (raw||"").trim()
  if(!r) return []
  const norm = normalize(r)
  return norm.split(',').map(s=>s.trim()).filter(Boolean)
}

const example = 'Wedding Photography & vide editing-July 2026Logistics & Supply Chain Management'
console.log('raw:', example)
console.log('normalized:', normalize(example))
console.log('split:', splitCourses(example))
