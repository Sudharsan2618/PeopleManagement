from pathlib import Path
path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
old = '''                <SelectContent>


                  <SelectItem value="all">All Courses</SelectItem>


                  {Array.from(new Set(Object.values(prospects)
                    .flatMap((p) => {
                      if (typeof p.course_interest !== "string" || !p.course_interest) return []
                      return normalizeCourseInterest(p.course_interest).split(",").map((c: string) => c.trim()).filter(Boolean)
                    })))


                    .sort()


                    .map(course => (


                      <SelectItem key={course} value={course}>{course}</SelectItem>


                    ))}


                </SelectContent>
'''
new = '''                <SelectContent>


                  <SelectItem value="all">All Courses</SelectItem>


                  {courseOptions.map((course) => (


                    <SelectItem key={course} value={course}>{course}</SelectItem>


                  ))}


                </SelectContent>
'''
if old not in text:
    print('old block not found')
    i = text.find('Array.from(new Set(Object.values(prospects)')
    print('idx', i)
    if i != -1:
        print(text[i:i+500])
    raise SystemExit(1)
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('patched')
