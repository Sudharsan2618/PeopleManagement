from pathlib import Path
import re
path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
lines = text.splitlines()
for i, line in enumerate(lines):
    if 'courseOptions' in line or 'Array.from(new Set(Object.values(prospects)' in line or 'SelectContent' in line and 6000 < i < 6200:
        print(f'{i+1}: {line!r}')

print('--- exact occurrences ---')
for m in re.finditer(r'courseOptions\.map\(course => \(|Array\.from\(new Set\(Object\.values\(prospects\)', text):
    start = text.count('\n', 0, m.start())
    print('line', start+1, repr(text[m.start():m.end()]))

for s in ['))</SelectContent>', '))}', '{courseOptions.map(course => (', '.sort()']:
    if s in text:
        print('contains', s, 'count', text.count(s))
