from pathlib import Path

path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
lines = text.splitlines(True)
for i, line in enumerate(lines, 1):
    if 'Array.from' in line or 'Object.values(prospects)' in line or 'courseOptions' in line or 'SelectContent' in line or 'SelectItem value="all"' in line:
        print(f'{i}: {repr(line)}')
        if i+1 <= len(lines):
            print(f' next: {repr(lines[i])}')
            print('---')
