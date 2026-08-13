from pathlib import Path
path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
lines = text.splitlines()
for i in range(6088, 6110):
    print(f'{i+1}: {lines[i]!r}')
