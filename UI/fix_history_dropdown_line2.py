from pathlib import Path

path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
lines = text.splitlines(True)
print('len', len(lines))
for idx in range(6090, 6102):
    print(idx+1, repr(lines[idx]))

if lines[6098].strip() != '))</SelectContent>':
    raise SystemExit(f'unexpected line 6099: {repr(lines[6098])}')

lines[6098] = '                  ))}\n'
lines.insert(6099, '\n                </SelectContent>\n')
path.write_text(''.join(lines), encoding='utf-8')
print('patched')
