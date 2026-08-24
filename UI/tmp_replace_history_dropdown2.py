from pathlib import Path

path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
lines = text.splitlines(True)
start = None
for i, line in enumerate(lines):
    if 'Array.from(new Set(Object.values(prospects)' in line:
        start = i
        break
if start is None:
    raise SystemExit('start line not found')
end = None
for i in range(start, len(lines)):
    if '</SelectContent>' in lines[i]:
        end = i
        break
if end is None:
    raise SystemExit('end line not found')
print('start', start+1, 'end', end+1)
old_block = ''.join(lines[start:end+1])
print('old block:\n', old_block)
new_block = [
    '                <SelectContent>\n',
    '\n',
    '\n',
    '                  <SelectItem value="all">All Courses</SelectItem>\n',
    '\n',
    '\n',
    '                  {courseOptions.map((course) => (\n',
    '\n',
    '\n',
    '                    <SelectItem key={course} value={course}>{course}</SelectItem>\n',
    '\n',
    '\n',
    '                  ))}\n',
    '\n',
    '\n',
    '                </SelectContent>\n'
]
lines[start:end+1] = new_block
path.write_text(''.join(lines), encoding='utf-8')
print('replaced')
