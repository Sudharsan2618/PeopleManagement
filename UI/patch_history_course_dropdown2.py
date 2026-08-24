from pathlib import Path

path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
old = (
'                  {Array.from(new Set(Object.values(prospects)\n'
'                    .flatMap((p) => {\n'
'                      if (typeof p.course_interest !== "string" || !p.course_interest) return []\n'
'                      return normalizeCourseInterest(p.course_interest).split(",").map((c: string) => c.trim()).filter(Boolean)\n'
'                    }))\n'
'\n\n'
'                    .sort()\n'
'\n\n'
'                    .map(course => (\n'
)
new = '                  {courseOptions.map((course) => (\n'

if old not in text:
    start = text.find('Array.from(new Set(Object.values(prospects)')
    print('old block not found')
    print('start idx', start)
    if start != -1:
        print(repr(text[start:start+300]))
    raise SystemExit(1)

path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('patched')
