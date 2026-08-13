from pathlib import Path

path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
lines = text.splitlines(True)
for idx, line in enumerate(lines):
    if 'SelectContent' in line or 'courseOptions' in line or 'Array.from(new Set' in line or 'normalizeCourseInterest' in line:
        print(f'{idx+1}: {repr(line)}')
        if idx+1 < len(lines):
            print(f' next: {repr(lines[idx+1])}')
            print('-----')
