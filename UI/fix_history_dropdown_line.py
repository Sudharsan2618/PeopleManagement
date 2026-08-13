from pathlib import Path
path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
lines = text.splitlines(True)
# Lines are 0-indexed; line 6099 in editor corresponds to index 6098
if len(lines) < 6099:
    raise SystemExit(f'file too short: {len(lines)} lines')
print('before:', repr(lines[6098]))
lines[6098] = '                  ))}\n'
if lines[6099] != '\n':
    raise SystemExit(f'unexpected next line: {repr(lines[6099])}')
lines.insert(6099, '\n                </SelectContent>\n')
path.write_text(''.join(lines), encoding='utf-8')
print('updated line 6099')
