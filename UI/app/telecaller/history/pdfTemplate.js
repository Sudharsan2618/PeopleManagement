export function buildHtmlTable(title, rangeText, headers, rows) {
  const esc = (s) => (s == null ? "" : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'))
  const head = headers.map(h => `<th>${esc(h)}</th>`).join('')
  const body = rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    @page { size: letter; margin: 20mm; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #111 }
    h1{font-size:16px;margin:0 0 6px}
    p{margin:0 0 10px}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #222;padding:6px 8px;vertical-align:top;text-align:left}
    th{background:#f3f3f3;font-weight:700}
    td{word-wrap:break-word}
    .nowrap{white-space:nowrap}
  </style></head><body>
  <h1>${esc(title)}</h1>
  <p>${esc(rangeText)}</p>
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}</tbody>
  </table>
  </body></html>`
}
