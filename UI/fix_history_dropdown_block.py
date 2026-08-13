from pathlib import Path

path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
old = (
    '                <SelectContent>\n\n\n'
    '                  <SelectItem value="all">All Courses</SelectItem>\n\n\n'
    '                  {Array.from(new Set(Object.values(prospects)\n'
    '                    .flatMap((p) => {\n'
    '                      if (typeof p.course_interest !== "string" || !p.course_interest) return []\n'
    '                      return normalizeCourseInterest(p.course_interest).split(",").map((c: string) => c.trim()).filter(Boolean)\n'
    '                    }))\n\n\n'
    '                    .sort()\n\n\n'
    '                    .map(course => (\n\n\n'
    '                      <SelectItem key={course} value={course}>{course}</SelectItem>\n\n\n'
    '                    ))}\n\n\n'
    '                </SelectContent>\n'
)

replacement = (
    '                <SelectContent>\n\n'
    '                  <SelectItem value="all">All Courses</SelectItem>\n\n'
    '                  {courseOptions.map((course) => (\n\n'
    '                    <SelectItem key={course} value={course}>{course}</SelectItem>\n\n'
    '                  ))}\n\n'
    '                </SelectContent>\n'
)

if old not in text:
    print('old block not found')
    idx = text.find('Course</SelectItem>')
    print('course item idx', idx)
    print(text[idx-100:idx+100])
    raise SystemExit(1)

text = text.replace(old, replacement, 1)
path.write_text(text, encoding='utf-8')
print('replacement done')
