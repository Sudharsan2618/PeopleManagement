from pathlib import Path

path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
needle = '''                <SelectContent>


                  <SelectItem value="all">All Courses</SelectItem>


                  {Array.from(new Set(Object.values(prospects)
                    .flatMap((p) => {
                      if (typeof p.course_interest !== "string" || !p.course_interest) return []
                      return normalizeCourseInterest(p.course_interest).split(",").map((c: string) => c.trim()).filter(Boolean)
                    }))


                    .sort()


                    .map(course => (


                      <SelectItem key={course} value={course}>{course}</SelectItem>


                    ))}


                </SelectContent>'''
replacement = '''                <SelectContent>


                  <SelectItem value="all">All Courses</SelectItem>


                  {courseOptions.map((course) => (


                    <SelectItem key={course} value={course}>{course}</SelectItem>


                  ))}


                </SelectContent>'''

if needle not in text:
    raise SystemExit('needle not found')

path.write_text(text.replace(needle, replacement, 1), encoding='utf-8')
print('replaced')
