from pathlib import Path
path = Path('app/telecaller/history/page.tsx')
text = path.read_text(encoding='utf-8')
start = 6085
end = 6105
print(''.join(f'{i+1}: {repr(text.splitlines(True)[i])}' for i in range(start, end)))
# Additionally print raw substring around the block
idx = text.find('{courseOptions.map(course => (')
print('idx', idx)
print(repr(text[idx:idx+120]))
