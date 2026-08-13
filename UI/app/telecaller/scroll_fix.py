from pathlib import Path

path = Path('history/page.tsx')
text = path.read_text(encoding='utf-8')
old = '          <div className="rounded-lg border overflow-hidden" style={{ maxHeight: \'600px\' }}>\n\n            <div className="overflow-x-auto h-full">\n\n\n\n              <Table>'
new = '          <div className="rounded-lg border overflow-x-auto" style={{ maxHeight: \'600px\' }}>\n\n            <div className="overflow-x-auto h-full">\n\n\n\n              <Table className="min-w-max">'

if old not in text:
    print('old snippet not found')
    start = text.find('rounded-lg border')
    print(repr(text[start:start+200]))
else:
    text = text.replace(old, new, 1)
    path.write_text(text, encoding='utf-8')
    print('patched')
