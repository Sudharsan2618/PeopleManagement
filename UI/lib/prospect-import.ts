// Shared, production-grade parsing for prospect CSV/Excel imports.
//
// Replaces the hardcoded `row.a || row.b || ...` chains that were duplicated
// across the admin and spoc import pages with a single dictionary-driven mapper
// plus robust Indian-mobile normalization. Used by
// `components/prospects/prospect-import.tsx`.

export type CanonicalField =
  | "name" | "mobile" | "email" | "parent_name" | "department" | "location"
  | "source" | "course" | "lead_type" | "lead_id" | "status" | "address"
  | "postal_code" | "company" | "designation" | "alt_phone" | "alt_phone_2"
  | "alt_phone_3" | "secondary_email" | "alternative_email" | "college_name"
  | "comments" | "follow_up_date" | "tags"

// Normalized header synonyms per field. Keys are matched by exact equality after
// `normalizeHeader` (lowercased, punctuation/underscores -> spaces, `__c` and
// BOM stripped, whitespace collapsed). Add new spreadsheet variants here — this
// is the single place mapping is defined.
export const FIELD_SYNONYMS: Record<CanonicalField, string[]> = {
  name: ["name", "student name", "student", "full name", "lead name", "customer name", "candidate name", "contact name", "first name", "fname", "applicant name"],
  mobile: ["mobile", "mobile number", "mobile no", "mobileno", "number", "phone", "phone number", "phone no", "phoneno", "contact", "contact number", "contact no", "contact no.", "ph", "ph no", "phno", "whatsapp", "whatsapp number", "whatsapp no", "cell", "cell number", "primary phone", "primary mobile", "mobilephone", "phone 1", "mobile 1", "contact 1", "mobile no 1"],
  email: ["email", "email address", "email id", "emailid", "mail", "e mail", "primary email", "official email"],
  parent_name: ["parent name", "parent", "father name", "father", "fathers name", "mother name", "mother", "guardian", "guardian name", "parent guardian"],
  department: ["department", "dept", "group", "stream", "branch"],
  location: ["location", "city", "town", "place", "district", "area", "current location", "current city"],
  source: ["source", "lead source", "sourced from", "source of lead", "lead origin", "campaign", "utm source", "leadsource"],
  course: ["course", "course interest", "course interested", "interested course", "program", "programme", "proposed for", "course applied", "interested in", "course name"],
  lead_type: ["lead type", "type", "leadtype", "category", "lead category"],
  lead_id: ["lead id", "leadid", "id", "lead number", "lead no", "reference id", "ref id", "crm id", "record id"],
  status: ["status", "lead status", "leadstatus", "stage", "lead stage", "disposition"],
  address: ["address", "street", "address street", "full address", "address line", "residential address"],
  postal_code: ["postal code", "pincode", "pin code", "pin", "zip", "zipcode", "zip code", "address postalcode", "postal"],
  company: ["company", "organization", "organisation", "company name", "firm", "employer"],
  designation: ["designation", "job title", "title", "role", "position"],
  alt_phone: ["alt phone", "alt phone 1", "alternate phone", "alternate phone 1", "alternate mobile", "alternate mobile 1", "alternate mobile no", "secondary phone", "secondary mobile", "other phone", "phone 2", "mobile 2"],
  alt_phone_2: ["alt phone 2", "alternate phone 2", "alternate mobile 2", "phone 3", "mobile 3", "secondary phone 2"],
  alt_phone_3: ["alt phone 3", "alternate phone 3", "alternate mobile 3", "phone 4", "mobile 4"],
  secondary_email: ["secondary email", "secondary mail", "email 2", "alternate mail"],
  alternative_email: ["alt email", "alternate email", "alternative email", "alternateemail", "alternativeemail", "other email", "email 3"],
  college_name: ["college name", "college", "institution", "institute", "school", "university", "college university"],
  comments: ["comments", "remarks", "notes", "comment", "remark", "note", "description", "feedback"],
  follow_up_date: ["follow up date", "followup date", "next follow up", "next followup", "callback date", "follow up", "followup"],
  tags: ["tags", "tag", "labels", "label"],
}

// Reverse lookup: normalized synonym -> field. Also includes each canonical
// field name itself so `mobile`, `lead_id` etc. map to themselves.
const SYNONYM_TO_FIELD: Record<string, CanonicalField> = (() => {
  const map: Record<string, CanonicalField> = {}
  ;(Object.keys(FIELD_SYNONYMS) as CanonicalField[]).forEach((field) => {
    map[normalizeHeader(field)] = field
    FIELD_SYNONYMS[field].forEach((syn) => {
      const key = normalizeHeader(syn)
      // First field to claim a synonym wins; declaration order in FIELD_SYNONYMS
      // determines precedence for any accidental overlaps.
      if (!(key in map)) map[key] = field
    })
  })
  return map
})()

const PHONE_PLACEHOLDERS = new Set(["", "na", "n/a", "n.a", "nil", "null", "none", "-", "--", ".", "0"])

export function normalizeHeader(header: string): string {
  return String(header ?? "")
    .replace(/﻿/g, "")      // strip BOM
    .replace(/ /g, " ")     // nbsp -> space
    .toLowerCase()
    .trim()
    .replace(/__c$/i, "")        // Salesforce custom-field suffix
    .replace(/[^a-z0-9]+/g, " ") // punctuation/underscores -> space
    .replace(/\s+/g, " ")
    .trim()
}

function isBlankHeader(header: string): boolean {
  const h = String(header ?? "").trim()
  return h === "" || /^__empty/i.test(h) || normalizeHeader(h) === ""
}

export interface ColumnMappingEntry {
  source: string
  field: CanonicalField
}

export interface ColumnMapping {
  /** field -> source header keys (original, in file order) that feed it. */
  fieldToHeaders: Partial<Record<CanonicalField, string[]>>
  /** For display: every mapped source column and its target field. */
  entries: ColumnMappingEntry[]
  /** Source columns that matched no known field. */
  ignored: string[]
}

export function buildColumnMapping(headers: string[]): ColumnMapping {
  const fieldToHeaders: Partial<Record<CanonicalField, string[]>> = {}
  const entries: ColumnMappingEntry[] = []
  const ignored: string[] = []

  headers.forEach((h) => {
    if (isBlankHeader(h)) {
      ignored.push(h && !/^__empty/i.test(h) ? h : "(unnamed column)")
      return
    }
    const field = SYNONYM_TO_FIELD[normalizeHeader(h)]
    if (field) {
      ;(fieldToHeaders[field] ||= []).push(h)
      entries.push({ source: h, field })
    } else {
      ignored.push(h)
    }
  })

  return { fieldToHeaders, entries, ignored }
}

export interface PhoneResult {
  value: string | null
  valid: boolean
  reason?: string
}

function expandScientific(raw: string): string {
  if (!/e/i.test(raw)) return raw
  const n = Number(raw)
  return Number.isFinite(n) ? String(Math.round(n)) : raw
}

function normalizeSingle(candidate: string): PhoneResult {
  let digits = candidate.replace(/\D/g, "")
  if (!digits) return { value: null, valid: false, reason: "No digits found" }

  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2)
  else if (digits.length === 13 && digits.startsWith("091")) digits = digits.slice(3)
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1)
  else if (digits.length > 10) digits = digits.slice(-10)

  if (digits.length < 10) return { value: null, valid: false, reason: `Too short (${digits.length} digits)` }
  if (digits.length > 10) return { value: null, valid: false, reason: "Too long for an Indian mobile" }
  if (!"6789".includes(digits[0])) return { value: null, valid: false, reason: "Not a mobile number (must start 6-9)" }
  return { value: digits, valid: true }
}

/** Normalize any phone cell to a valid 10-digit Indian mobile. Mirrors the
 *  backend `normalize_indian_mobile`. */
export function normalizeIndianMobile(raw: unknown): PhoneResult {
  if (raw === null || raw === undefined) return { value: null, valid: false }

  let str: string
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return { value: null, valid: false }
    str = Number.isInteger(raw) ? String(raw) : String(raw)
  } else {
    str = String(raw).trim()
  }

  if (PHONE_PLACEHOLDERS.has(str.toLowerCase())) return { value: null, valid: false }
  str = expandScientific(str)

  // Split only on genuine multi-number separators so a single number with
  // internal spaces/dashes ("+91 98765-43210") stays intact.
  const candidates = str.split(/[\/,;|&\n]+|\s+or\s+/i).filter((c) => c.trim())
  if (candidates.length === 0) return { value: null, valid: false, reason: "No digits found" }

  let firstReason: string | undefined
  for (const c of candidates) {
    const res = normalizeSingle(c)
    if (res.valid) return res
    if (!firstReason) firstReason = res.reason
  }
  return { value: null, valid: false, reason: firstReason || "Invalid phone number" }
}

/** Parse a date cell to ISO `YYYY-MM-DD`. Handles Excel Date objects and the
 *  common dd/mm/yyyy and yyyy-mm-dd string forms. Returns raw string + warning
 *  when unrecognized. */
export function parseDate(raw: unknown): { value: string | null; warning?: string } {
  if (raw === null || raw === undefined || raw === "") return { value: null }

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getFullYear()
    const m = String(raw.getMonth() + 1).padStart(2, "0")
    const d = String(raw.getDate()).padStart(2, "0")
    return { value: `${y}-${m}-${d}` }
  }

  const s = String(raw).trim()
  if (!s) return { value: null }

  let match = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/) // yyyy-mm-dd
  if (match) {
    const [, y, m, d] = match
    return { value: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` }
  }
  match = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/) // dd/mm/yyyy (Indian)
  if (match) {
    let [, d, m, y] = match
    if (y.length === 2) y = `20${y}`
    return { value: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}` }
  }
  return { value: s.slice(0, 50), warning: `Unrecognized date format "${s}"` }
}

// Field length caps mirroring the backend schema (models/schemas.py).
const CAPS: Partial<Record<string, number>> = {
  name: 150, email: 255, location: 150, sourced_from: 100, status: 100,
  course_interest: 100, parent_name: 150, department: 150, lead_id: 100,
  secondary_email: 255, alternative_email: 255, college_name: 255, city: 100,
  postal_code: 20, designation: 150, company: 200, comments: 1000,
  follow_up_date: 50, alt_phone: 20, alt_phone_2: 20, alt_phone_3: 20,
}

export interface ProspectPayload {
  [key: string]: any
}

export type ClientStatus = "ok" | "invalid_phone" | "missing_name"

export interface ParsedRecord {
  /** 1-based spreadsheet row number(s) this record came from. */
  sourceRows: number[]
  name: string
  mobile: string          // normalized (10-digit) or "" when invalid/blank
  mobileOriginal: string  // original cell text, for showing what changed
  mobileValid: boolean
  course: string
  clientStatus: ClientStatus
  warnings: string[]
  /** Backend payload (ProspectCreate-shaped). */
  fields: ProspectPayload
}

export interface ParseResult {
  columnMapping: ColumnMapping
  records: ParsedRecord[]
  totalRows: number
}

export interface ParseOptions {
  createdBy: number
  defaultTags?: string
  defaultSource?: string
}

function cap(value: string, field: string, warnings: string[], label: string): string {
  const max = CAPS[field]
  if (max && value.length > max) {
    warnings.push(`${label} truncated to ${max} characters`)
    return value.slice(0, max)
  }
  return value
}

function splitList(value: string): string[] {
  return value.split(",").map((t) => t.trim()).filter(Boolean)
}

/** Parse raw sheet rows (objects keyed by original header) into normalized,
 *  in-file-deduped prospect records ready for preview + import. */
export function parseRows(jsonData: Record<string, any>[], options: ParseOptions): ParseResult {
  const headers = new Set<string>()
  jsonData.forEach((row) => Object.keys(row).forEach((k) => headers.add(k)))
  const columnMapping = buildColumnMapping([...headers])
  const { fieldToHeaders } = columnMapping

  const rawGet = (row: Record<string, any>, field: CanonicalField): any => {
    for (const h of fieldToHeaders[field] || []) {
      const v = row[h]
      if (v !== undefined && v !== null && String(v).trim() !== "") return v
    }
    return ""
  }
  const strGet = (row: Record<string, any>, field: CanonicalField): string =>
    String(rawGet(row, field) ?? "").trim()

  const records: ParsedRecord[] = []
  // In-file dedup index: normalized mobile / lead_id -> record.
  const byMobile = new Map<string, ParsedRecord>()
  const byLeadId = new Map<string, ParsedRecord>()

  jsonData.forEach((row, index) => {
    const sourceRow = index + 2 // +1 for 0-index, +1 for the header row
    const warnings: string[] = []

    let name = strGet(row, "name")
    const company = strGet(row, "company")
    if (!name && company) {
      name = company
      warnings.push("Name was blank — used Company as name")
    }

    const mobileOriginal = strGet(row, "mobile")
    const phone = normalizeIndianMobile(rawGet(row, "mobile"))
    if (mobileOriginal && !phone.valid) {
      warnings.push(`Invalid phone: ${phone.reason || "could not normalize"}`)
    }

    const source = strGet(row, "source") || options.defaultSource || ""
    const course = strGet(row, "course")
    const leadType = strGet(row, "lead_type")
    const leadId = strGet(row, "lead_id")
    const dateParsed = parseDate(rawGet(row, "follow_up_date"))
    if (dateParsed.warning) warnings.push(dateParsed.warning)

    const altPhone = normalizeIndianMobile(rawGet(row, "alt_phone"))
    const altPhone2 = normalizeIndianMobile(rawGet(row, "alt_phone_2"))
    const altPhone3 = normalizeIndianMobile(rawGet(row, "alt_phone_3"))

    const tags = [
      ...splitList(strGet(row, "tags")),
      ...(options.defaultTags ? splitList(options.defaultTags) : []),
    ]

    const clientStatus: ClientStatus = !name
      ? "missing_name"
      : mobileOriginal && !phone.valid
      ? "invalid_phone"
      : "ok"

    const fields: ProspectPayload = {
      name: cap(name || "Unknown", "name", warnings, "Name"),
      mobile: phone.value || "",
      email: strGet(row, "email") ? cap(strGet(row, "email"), "email", warnings, "Email") : null,
      location: cap(strGet(row, "location"), "location", warnings, "Location") || null,
      parent_name: cap(strGet(row, "parent_name"), "parent_name", warnings, "Parent name") || null,
      department: cap(strGet(row, "department"), "department", warnings, "Department") || null,
      sourced_from: source ? cap(source, "sourced_from", warnings, "Source") : null,
      status: cap(strGet(row, "status") || "new", "status", warnings, "Status"),
      course_interest: cap(course, "course_interest", warnings, "Course") || null,
      lead_source: source ? [cap(source, "sourced_from", warnings, "Source")] : [],
      lead_type: leadType ? [cap(leadType, "status", warnings, "Lead type")] : [],
      lead_id: leadId ? cap(leadId, "lead_id", warnings, "Lead ID") : null,
      city: cap(strGet(row, "location"), "city", warnings, "City") || null,
      address: strGet(row, "address") || null,
      postal_code: cap(strGet(row, "postal_code"), "postal_code", warnings, "Postal code") || null,
      designation: cap(strGet(row, "designation"), "designation", warnings, "Designation") || null,
      alt_phone: (altPhone.value || strGet(row, "alt_phone")).slice(0, 20) || null,
      alt_phone_2: (altPhone2.value || strGet(row, "alt_phone_2")).slice(0, 20) || null,
      alt_phone_3: (altPhone3.value || strGet(row, "alt_phone_3")).slice(0, 20) || null,
      secondary_email: cap(strGet(row, "secondary_email"), "secondary_email", warnings, "Secondary email") || null,
      alternative_email: cap(strGet(row, "alternative_email"), "alternative_email", warnings, "Alternative email") || null,
      college_name: cap(strGet(row, "college_name"), "college_name", warnings, "College name") || null,
      company: cap(company, "company", warnings, "Company") || null,
      comments: cap(strGet(row, "comments"), "comments", warnings, "Comments") || null,
      follow_up_date: dateParsed.value,
      is_imported: true,
      tags,
      created_by: options.createdBy,
    }

    const record: ParsedRecord = {
      sourceRows: [sourceRow],
      name: fields.name,
      mobile: phone.value || "",
      mobileOriginal,
      mobileValid: phone.valid,
      course,
      clientStatus,
      warnings,
      fields,
    }

    // Collapse in-file duplicates (same valid mobile or same lead_id) into the
    // earlier record: union course/tags/lead arrays, no duplicate row created.
    const dupKeyLead = leadId ? byLeadId.get(leadId) : undefined
    const dupKeyMobile = phone.valid && phone.value ? byMobile.get(phone.value) : undefined
    const existing = dupKeyLead || dupKeyMobile
    if (existing && name) {
      mergeInFile(existing, record)
      existing.sourceRows.push(sourceRow)
      return
    }

    records.push(record)
    if (phone.valid && phone.value) byMobile.set(phone.value, record)
    if (leadId) byLeadId.set(leadId, record)
  })

  return { columnMapping, records, totalRows: jsonData.length }
}

function unionInto(target: string[], incoming: string[]) {
  const lowered = new Set(target.map((t) => t.toLowerCase()))
  incoming.forEach((item) => {
    if (item && !lowered.has(item.toLowerCase())) {
      target.push(item)
      lowered.add(item.toLowerCase())
    }
  })
}

function mergeInFile(target: ParsedRecord, incoming: ParsedRecord) {
  // Append course (dedup, <=100 chars) and mirror it as a tag.
  const courses = splitList(target.fields.course_interest || "")
  const incomingCourses = splitList(incoming.fields.course_interest || "")
  unionInto(courses, incomingCourses)
  target.fields.course_interest = courses.join(", ").slice(0, 100) || null
  target.course = courses.join(", ")

  const tags: string[] = target.fields.tags || []
  unionInto(tags, [...(incoming.fields.tags || []), ...incomingCourses])
  target.fields.tags = tags

  const src: string[] = target.fields.lead_source || []
  unionInto(src, incoming.fields.lead_source || [])
  target.fields.lead_source = src

  const type: string[] = target.fields.lead_type || []
  unionInto(type, incoming.fields.lead_type || [])
  target.fields.lead_type = type

  incoming.warnings.forEach((w) => {
    if (!target.warnings.includes(w)) target.warnings.push(w)
  })
}
