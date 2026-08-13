from pathlib import Path

base = Path(__file__).resolve().parent
path = base / 'app' / 'telecaller' / 'dashboard' / 'page.tsx'
text = path.read_text(encoding='utf-8')
lines = text.splitlines()

# 1) Insert helper after normalizeStatus function
start = None
end = None
for i, line in enumerate(lines):
    if line.strip() == 'const normalizeStatus = (value: string): string => {':
        start = i
        break
if start is None:
    raise SystemExit('normalizeStatus start not found')
for j in range(start + 1, len(lines)):
    if lines[j].strip() == 'return normalized':
        # find closing brace after return normalized
        for k in range(j + 1, len(lines)):
            if lines[k].strip() == '}':
                end = k
                break
        break
if end is None:
    raise SystemExit('normalizeStatus end not found')

helper_lines = [
    'const parseCourseInterestList = (courseInterest: any): string[] => {',
    '  if (!courseInterest) return []',
    '',
    '  if (Array.isArray(courseInterest)) {',
    '    return courseInterest.filter((course) => typeof course === "string" && course.trim() !== "")',
    '  }',
    '',
    '  if (typeof courseInterest === "string") {',
    '    const raw = courseInterest.trim()',
    '    if (!raw || raw.toLowerCase() === "unknown") return []',
    '',
    '    try {',
    '      const parsed = JSON.parse(raw)',
    '      if (Array.isArray(parsed)) {',
    '        return parsed.filter((course) => typeof course === "string" && course.trim() !== "")',
    '      }',
    '    } catch {',
    '      // ignore non-JSON strings',
    '    }',
    '',
    '    return raw',
    '      .split(/[,;|]/)',
    '      .map((course) => course.trim())',
    '      .filter((course) => course !== "")',
    '  }',
    '',
    '  return []',
    '}',
    '',
]

# Avoid duplicate insertion if script rerun
if any(line.strip() == 'const parseCourseInterestList = (courseInterest: any): string[] =>' for line in lines):
    helper_inserted = True
else:
    helper_inserted = False

if not helper_inserted:
    lines = lines[: end + 1] + [''] + helper_lines + lines[end + 1 :]

# 2) Insert courseInterestList and courseStatusDetails in prospect enrich block
insert_idx = None
for i, line in enumerate(lines):
    if line.strip() == 'courseInterest: p.course_interest || "Unknown",':
        insert_idx = i
        break
if insert_idx is None:
    raise SystemExit('courseInterest line not found')

new_lines = [
    '            courseInterest: p.course_interest || "Unknown",',
    '            courseInterestList: parseCourseInterestList(p.course_interest || ""),',
    '            courseStatusDetails: parseCourseInterestList(p.course_interest || "").map((course) => {',
    '              const normalizedCourse = course.trim()',
    '              if (!normalizedCourse) return null',
    '',
    '              const matchingLog = [...prospectLogs]',
    '                .reverse()',
    '                .find((log: any) => {',
    '                  if (!log.course_interest) return false',
    '                  const logCourses = parseCourseInterestList(log.course_interest)',
    '                  return logCourses.some((c) => c.toLowerCase() === normalizedCourse.toLowerCase())',
    '                })',
    '',
    '              const status = matchingLog?.status_after_call || matchingLog?.outcome || "New"',
    '              return { course: normalizedCourse, status }',
    '            }).filter(Boolean),',
]
# avoid duplicate insertion if already present
if insert_idx + 1 < len(lines) and lines[insert_idx + 1].strip().startswith('courseInterestList:'):
    pass
else:
    lines = lines[:insert_idx] + new_lines + lines[insert_idx + 1 :]

# 3) Replace case "status" block with multi-badge rendering
status_start = None
status_end = None
for i, line in enumerate(lines):
    if line.strip() == 'case "status":':
        status_start = i
        break
if status_start is None:
    raise SystemExit('status case start not found')
for j in range(status_start, len(lines)):
    if lines[j].strip() == 'case "totalCalls":':
        status_end = j
        break
if status_end is None:
    raise SystemExit('status case end not found')

replacement = [
    '                          case "status":',
    '                            return (',
    '                              <TableCell key="status">',
    '                                {prospect.courseStatusDetails && prospect.courseStatusDetails.length > 0 ? (',
    '                                  <div className="flex flex-wrap gap-1">',
    '                                    {prospect.courseStatusDetails.map((detail: any) => {',
    '                                      const statusKey = normalizeStatus(detail.status) || "new"',
    '                                      const config = statusConfig[statusKey] || {',
    '                                        label: detail.status || "New",',
    '                                        color: "bg-gray-100 text-gray-800",',
    '                                      }',
    '                                      return (',
    '                                        <Badge key={`${detail.course}-${statusKey}`} variant="outline" className={cn(config.color)}>',
    '                                          {detail.course}: {config.label}',
    '                                        </Badge>',
    '                                      )',
    '                                    })}',
    '                                  </div>',
    '                                ) : (',
    '                                  <Badge variant="outline" className={cn(sc.color)}>',
    '                                    {sc.label}',
    '                                  </Badge>',
    '                                )}',
    '                              </TableCell>',
    '                            )',
    '                          case "totalCalls":',
]
lines = lines[:status_start] + replacement + lines[status_end + 1 :]

path.write_text("\n".join(lines) + "\n", encoding='utf-8')
print('patched', path)
