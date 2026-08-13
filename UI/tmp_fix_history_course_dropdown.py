from pathlib import Path
import re

path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
start_marker = '                  {Array.from(new Set(Object.values(prospects)'
end_marker = '                    ))}'
start = text.find(start_marker)
if start == -1:
    raise SystemExit('start_marker not found')
end = text.find(end_marker, start)
if end == -1:
    raise SystemExit('end_marker not found')
end += len(end_marker)
old_block = text[start:end]
print('old_block snippet:')
print(old_block[:400])
print('...')
replacement = '                  {courseOptions.map((course) => (\n' \
              '                    <SelectItem key={course} value={course}>{course}</SelectItem>\n' \
              '                  ))}'
text = text[:start] + replacement + text[end:]
path.write_text(text, encoding='utf-8')
print('replaced')
