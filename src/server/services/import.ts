import ExcelJS from 'exceljs'
import { OrgStatus, Prisma, Priority } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { ORG_STATUS_META, PRIORITY_META } from '@/lib/constants'
import {
  cleanMultiline,
  cleanText,
  normalizeDomain,
  normalizeEmail,
  normalizeLinkedIn,
  normalizeLinkedInUrl,
  normalizeOrgName,
  normalizePersonName,
  normalizePhone,
  normalizeWebsite,
} from '@/lib/normalize'
import { IMPORT_FIELDS, type ImportCommitInput, type ImportField } from '@/lib/validation'
import { NotFoundError, ValidationError } from '@/server/errors'
import { writeAudit } from './audit'

/**
 * Excel import (spec §23).
 *
 * Upload → Preview → Map columns → Validate → Detect duplicates → Import.
 *
 * Two rules shape the whole design:
 *   • "Do not destroy existing CRM data during import" — an import may create
 *     records and fill *blank* fields on existing ones. It never overwrites a
 *     value a human already put in, and it never deletes anything.
 *   • Nothing is written until the user has seen the counts and pressed Import.
 *
 * Between preview and commit the parsed sheet is parked in `ImportBatch.summary`
 * rather than in process memory, so the flow survives a serverless instance
 * being recycled between the two requests.
 */

export const MAX_IMPORT_ROWS = 5000
const COMMIT_CHUNK = 25

// ── Column mapping ───────────────────────────────────────────────────────────

const FIELD_ALIASES: Record<ImportField, string[]> = {
  name: ['organisation', 'organization', 'org', 'company', 'name', 'orgname', 'institution', 'school', 'clinic', 'hospital', 'ngo'],
  category: ['category', 'sector', 'type', 'vertical', 'segment', 'industry'],
  website: ['website', 'url', 'site', 'web', 'webpage', 'domain'],
  generalEmail: ['email', 'orgemail', 'generalemail', 'officeemail', 'infoemail', 'companyemail'],
  generalPhone: ['phone', 'orgphone', 'generalphone', 'officephone', 'landline', 'contactnumber', 'mobile'],
  linkedinUrl: ['linkedin', 'linkedinurl', 'linkedinpage', 'companylinkedin'],
  location: ['location', 'city', 'address', 'region', 'state', 'area'],
  priority: ['priority'],
  status: ['status', 'stage', 'pipeline'],
  notes: ['notes', 'note', 'remarks', 'comments', 'description'],
  assignedToEmail: ['assignedto', 'assignee', 'owner', 'assignedemail', 'assignedtoemail', 'intern'],
  contactName: ['contactname', 'contactperson', 'person', 'poc', 'pointofcontact', 'contact'],
  contactDesignation: ['designation', 'title', 'role', 'position', 'contactdesignation', 'jobtitle'],
  contactEmail: ['contactemail', 'personemail', 'emailid', 'pocemail'],
  contactPhone: ['contactphone', 'personphone', 'pocphone', 'contactmobile', 'whatsapp'],
  contactLinkedinUrl: ['contactlinkedin', 'personlinkedin', 'contactlinkedinurl'],
  contactIsDecisionMaker: ['decisionmaker', 'isdecisionmaker', 'dm', 'keydecisionmaker'],
}

function headerKey(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Best-guess mapping so the user usually just presses Next. */
export function suggestMapping(headers: string[]): Record<string, ImportField | 'IGNORE'> {
  const mapping: Record<string, ImportField | 'IGNORE'> = {}
  const used = new Set<ImportField>()

  headers.forEach((header, index) => {
    const key = headerKey(header)
    if (!key) {
      mapping[String(index)] = 'IGNORE'
      return
    }

    let match: ImportField | undefined

    // Exact alias first, then a contains-match, so "Organisation Name" still lands.
    for (const field of IMPORT_FIELDS) {
      if (used.has(field)) continue
      if (FIELD_ALIASES[field].includes(key)) {
        match = field
        break
      }
    }
    if (!match) {
      for (const field of IMPORT_FIELDS) {
        if (used.has(field)) continue
        if (FIELD_ALIASES[field].some((alias) => key.includes(alias) || alias.includes(key))) {
          match = field
          break
        }
      }
    }

    if (match) used.add(match)
    mapping[String(index)] = match ?? 'IGNORE'
  })

  return mapping
}

// ── Parsing ──────────────────────────────────────────────────────────────────

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'object') {
    if ('text' in value && typeof value.text === 'string') return value.text.trim()
    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('').trim()
    }
    if ('result' in value) return cellText(value.result as ExcelJS.CellValue)
    if ('hyperlink' in value && typeof value.hyperlink === 'string') return value.hyperlink.trim()
  }
  return ''
}

interface Sheet {
  headers: string[]
  rows: string[][]
  truncated: boolean
}

/** Minimal RFC4180 CSV reader — quoted fields, escaped quotes, CRLF. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += char
      continue
    }
    if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char !== '\r') field += char
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

async function readSheet(fileName: string, buffer: Buffer): Promise<Sheet> {
  const isCsv = fileName.toLowerCase().endsWith('.csv')
  let grid: string[][]

  if (isCsv) {
    grid = parseCsv(buffer.toString('utf8')).map((row) => row.map((cell) => cell.trim()))
  } else {
    const workbook = new ExcelJS.Workbook()
    try {
      // exceljs ships its own `declare interface Buffer extends ArrayBuffer {}`
      // (index.d.ts line 1), so a real Node Buffer never matches its declared
      // parameter type. A Buffer is exactly what `load` wants at runtime — do
      // not "simplify" this cast away.
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
    } catch {
      throw new ValidationError(
        'That file could not be read as an Excel workbook. Save it as .xlsx or .csv and try again.',
      )
    }
    const sheet = workbook.worksheets[0]
    if (!sheet) throw new ValidationError('The workbook has no sheets.')

    grid = []
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = []
      // row.values is 1-indexed with a leading hole.
      const raw = row.values as ExcelJS.CellValue[]
      for (let col = 1; col < raw.length; col++) values.push(cellText(raw[col] ?? null))
      grid.push(values)
    })
  }

  // Drop leading blank lines, then take the first non-empty line as headers.
  while (grid.length > 0 && grid[0]!.every((cell) => cell === '')) grid.shift()
  if (grid.length === 0) throw new ValidationError('That file appears to be empty.')

  const headers = grid[0]!.map((cell, index) => cell || `Column ${index + 1}`)
  const body = grid.slice(1).filter((row) => row.some((cell) => cell !== ''))
  const truncated = body.length > MAX_IMPORT_ROWS

  return {
    headers,
    rows: (truncated ? body.slice(0, MAX_IMPORT_ROWS) : body).map((row) => {
      const padded = [...row]
      while (padded.length < headers.length) padded.push('')
      return padded.slice(0, headers.length)
    }),
    truncated,
  }
}

// ── Stage (upload + preview) ─────────────────────────────────────────────────

interface StagedPayload {
  stage: 'PREVIEW' | 'COMMITTED'
  headers: string[]
  rows: string[][]
  suggestedMapping: Record<string, ImportField | 'IGNORE'>
  truncated: boolean
  mapping?: Record<string, string>
  errors?: Array<{ row: number; messages: string[] }>
}

export interface ImportPreview {
  token: string
  fileName: string
  headers: string[]
  /** First rows, for the on-screen preview table. */
  sampleRows: string[][]
  totalRows: number
  truncated: boolean
  suggestedMapping: Record<string, ImportField | 'IGNORE'>
}

export async function stageImport(
  user: CurrentUser,
  file: { name: string; buffer: Buffer },
): Promise<ImportPreview> {
  assertCan(user, 'data:import')

  const sheet = await readSheet(file.name, file.buffer)
  const suggestedMapping = suggestMapping(sheet.headers)

  const payload: StagedPayload = {
    stage: 'PREVIEW',
    headers: sheet.headers,
    rows: sheet.rows,
    suggestedMapping,
    truncated: sheet.truncated,
  }

  const batch = await prisma.importBatch.create({
    data: {
      fileName: file.name.slice(0, 200),
      uploadedById: user.id,
      totalRows: sheet.rows.length,
      summary: payload as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  })

  return {
    token: batch.id,
    fileName: file.name,
    headers: sheet.headers,
    sampleRows: sheet.rows.slice(0, 8),
    totalRows: sheet.rows.length,
    truncated: sheet.truncated,
    suggestedMapping,
  }
}

async function loadStaged(
  user: CurrentUser,
  token: string,
): Promise<{ id: string; fileName: string; payload: StagedPayload }> {
  const batch = await prisma.importBatch.findFirst({
    where: { id: token, uploadedById: user.id },
    select: { id: true, fileName: true, summary: true },
  })
  if (!batch?.summary) throw new NotFoundError('Upload')

  const payload = batch.summary as unknown as StagedPayload
  if (!Array.isArray(payload.rows) || !Array.isArray(payload.headers)) {
    throw new NotFoundError('Upload')
  }
  return { id: batch.id, fileName: batch.fileName, payload }
}

// ── Row parsing & validation ─────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function parseEnum<T extends string>(
  raw: string,
  values: readonly T[],
  labels: Record<T, { label: string }>,
): T | null {
  const key = raw.trim().toUpperCase().replace(/[\s-]+/g, '_')
  const direct = values.find((v) => v === key)
  if (direct) return direct
  const lower = raw.trim().toLowerCase()
  return values.find((v) => labels[v].label.toLowerCase() === lower) ?? null
}

const TRUTHY = new Set(['yes', 'y', 'true', '1', 'dm', 'decision maker', 'decision-maker'])

interface RowValues {
  org: {
    name: string
    category: string | null
    website: string | null
    generalEmail: string | null
    generalPhone: string | null
    linkedinUrl: string | null
    location: string | null
    priority: Priority | null
    status: OrgStatus | null
    notes: string | null
  }
  contact: {
    name: string
    designation: string | null
    email: string | null
    phone: string | null
    linkedinUrl: string | null
    isDecisionMaker: boolean
  } | null
  assignedToEmail: string | null
}

export type RowVerdict = 'VALID' | 'DUPLICATE' | 'INVALID'

export interface ImportRowReport {
  /** 1-based data row (row 1 = first row under the header). */
  row: number
  name: string
  contactName: string | null
  verdict: RowVerdict
  messages: string[]
  duplicateOf: { id: string; name: string; reason: string } | null
}

interface ParsedRow extends ImportRowReport {
  values: RowValues | null
  existingOrganisationId: string | null
}

function readRow(
  raw: string[],
  mapping: Record<string, string>,
): { values: RowValues; errors: string[] } {
  const get = (field: ImportField): string => {
    for (const [index, mapped] of Object.entries(mapping)) {
      if (mapped === field) return (raw[Number(index)] ?? '').trim()
    }
    return ''
  }

  const errors: string[] = []

  const name = cleanText(get('name')) ?? ''
  if (!name) errors.push('Organisation name is missing')
  else if (name.length < 2) errors.push('Organisation name is too short')

  const generalEmail = get('generalEmail')
  if (generalEmail && !EMAIL_RE.test(generalEmail)) errors.push(`Invalid organisation email "${generalEmail}"`)

  const contactEmail = get('contactEmail')
  if (contactEmail && !EMAIL_RE.test(contactEmail)) errors.push(`Invalid contact email "${contactEmail}"`)

  const priorityRaw = get('priority')
  const priority = priorityRaw
    ? parseEnum(priorityRaw, Object.values(Priority), PRIORITY_META)
    : null
  if (priorityRaw && !priority) errors.push(`Unknown priority "${priorityRaw}"`)

  const statusRaw = get('status')
  const status = statusRaw ? parseEnum(statusRaw, Object.values(OrgStatus), ORG_STATUS_META) : null
  if (statusRaw && !status) errors.push(`Unknown status "${statusRaw}"`)

  const contactName = cleanText(get('contactName'))
  const contactPhone = get('contactPhone')

  return {
    values: {
      org: {
        name,
        category: cleanText(get('category')),
        website: normalizeWebsite(get('website')),
        generalEmail: generalEmail && EMAIL_RE.test(generalEmail) ? generalEmail.toLowerCase() : null,
        generalPhone: cleanText(get('generalPhone')),
        linkedinUrl: normalizeLinkedInUrl(get('linkedinUrl')),
        location: cleanText(get('location')),
        priority,
        status,
        notes: cleanMultiline(get('notes')),
      },
      contact: contactName
        ? {
            name: contactName,
            designation: cleanText(get('contactDesignation')),
            email: contactEmail && EMAIL_RE.test(contactEmail) ? contactEmail.toLowerCase() : null,
            phone: cleanText(contactPhone),
            linkedinUrl: normalizeLinkedInUrl(get('contactLinkedinUrl')),
            isDecisionMaker: TRUTHY.has(get('contactIsDecisionMaker').trim().toLowerCase()),
          }
        : null,
      assignedToEmail: normalizeEmail(get('assignedToEmail')),
    },
    errors,
  }
}

/**
 * Parse every row, then resolve duplicates against the database and against
 * earlier rows of the same file, in batched queries rather than row-by-row.
 */
async function analyseRows(
  rows: string[][],
  mapping: Record<string, string>,
): Promise<ParsedRow[]> {
  const parsed: ParsedRow[] = rows.map((raw, index) => {
    const { values, errors } = readRow(raw, mapping)
    return {
      row: index + 1,
      name: values.org.name || '(no name)',
      contactName: values.contact?.name ?? null,
      verdict: errors.length ? 'INVALID' : 'VALID',
      messages: errors,
      duplicateOf: null,
      values: errors.length ? null : values,
      existingOrganisationId: null,
    }
  })

  const nameKeys = new Set<string>()
  const domains = new Set<string>()
  for (const row of parsed) {
    if (!row.values) continue
    const key = normalizeOrgName(row.values.org.name)
    if (key) nameKeys.add(key)
    const domain = normalizeDomain(row.values.org.website)
    if (domain) domains.add(domain)
  }

  const existing =
    nameKeys.size || domains.size
      ? await prisma.organisation.findMany({
          where: {
            deletedAt: null,
            OR: [
              ...(nameKeys.size ? [{ nameNormalized: { in: [...nameKeys] } }] : []),
              ...(domains.size ? [{ domain: { in: [...domains] } }] : []),
            ],
          },
          select: { id: true, name: true, nameNormalized: true, domain: true },
        })
      : []

  const byName = new Map(existing.map((org) => [org.nameNormalized, org]))
  const byDomain = new Map(
    existing.filter((org) => org.domain).map((org) => [org.domain!, org]),
  )

  const seenInFile = new Map<string, number>()

  for (const row of parsed) {
    if (!row.values) continue
    const key = normalizeOrgName(row.values.org.name)
    const domain = normalizeDomain(row.values.org.website)

    const hit = (key && byName.get(key)) || (domain && byDomain.get(domain)) || null
    if (hit) {
      row.existingOrganisationId = hit.id
      row.verdict = 'DUPLICATE'
      row.duplicateOf = {
        id: hit.id,
        name: hit.name,
        reason: key && byName.has(key) ? 'Same organisation name' : 'Same website domain',
      }
      row.messages.push(`Already in the CRM as "${hit.name}"`)
      continue
    }

    const fileKey = key || `name:${row.values.org.name.toLowerCase()}`
    const firstRow = seenInFile.get(fileKey)
    if (firstRow) {
      row.verdict = 'DUPLICATE'
      row.duplicateOf = { id: '', name: row.values.org.name, reason: `Repeat of row ${firstRow}` }
      row.messages.push(`Repeats row ${firstRow} in this file`)
    } else {
      seenInFile.set(fileKey, row.row)
    }
  }

  return parsed
}

export interface ImportValidation {
  token: string
  fileName: string
  totalRows: number
  counts: { total: number; valid: number; duplicates: number; invalid: number }
  /** Capped for display; the commit works from the full set. */
  rows: ImportRowReport[]
  truncated: boolean
}

export async function validateImport(
  user: CurrentUser,
  input: { token: string; mapping: Record<string, string> },
): Promise<ImportValidation> {
  assertCan(user, 'data:import')
  const staged = await loadStaged(user, input.token)

  const mapped = Object.values(input.mapping)
  if (!mapped.includes('name')) {
    throw new ValidationError('Map a column to the organisation name before continuing.', {
      mapping: 'Organisation name is required',
    })
  }

  const parsed = await analyseRows(staged.payload.rows, input.mapping)

  return {
    token: staged.id,
    fileName: staged.fileName,
    totalRows: staged.payload.rows.length,
    counts: {
      total: parsed.length,
      valid: parsed.filter((r) => r.verdict === 'VALID').length,
      duplicates: parsed.filter((r) => r.verdict === 'DUPLICATE').length,
      invalid: parsed.filter((r) => r.verdict === 'INVALID').length,
    },
    rows: parsed.slice(0, 200).map(stripInternals),
    truncated: staged.payload.truncated,
  }
}

function stripInternals(row: ParsedRow): ImportRowReport {
  return {
    row: row.row,
    name: row.name,
    contactName: row.contactName,
    verdict: row.verdict,
    messages: row.messages,
    duplicateOf: row.duplicateOf,
  }
}

// ── Commit ───────────────────────────────────────────────────────────────────

export interface ImportResult {
  batchId: string
  imported: number
  updated: number
  contactsCreated: number
  skippedDuplicates: number
  invalid: number
  failed: number
  errors: Array<{ row: number; messages: string[] }>
}

/**
 * Write the sheet into the CRM.
 *
 * `duplicateStrategy` decides what happens when the organisation already exists:
 *   SKIP   — leave the organisation exactly as it is (a new person on the row is
 *            still attached, because losing a contact is data loss too)
 *   UPDATE — fill in fields that are currently blank in the CRM; never overwrite
 *            a value someone has already entered
 *   CREATE — create a second organisation anyway, because the user said so
 */
export async function commitImport(
  user: CurrentUser,
  input: ImportCommitInput,
): Promise<ImportResult> {
  assertCan(user, 'data:import')
  const staged = await loadStaged(user, input.token)

  if (staged.payload.stage === 'COMMITTED') {
    throw new ValidationError('This file has already been imported.')
  }

  const parsed = await analyseRows(staged.payload.rows, input.mapping)

  // Resolve every "assigned to" email in one query.
  const emails = [...new Set(parsed.flatMap((r) => (r.values?.assignedToEmail ? [r.values.assignedToEmail] : [])))]
  const assignees = emails.length
    ? await prisma.user.findMany({
        where: { email: { in: emails }, deletedAt: null, isActive: true },
        select: { id: true, email: true },
      })
    : []
  const assigneeByEmail = new Map(assignees.map((a) => [a.email, a.id]))

  const result: ImportResult = {
    batchId: staged.id,
    imported: 0,
    updated: 0,
    contactsCreated: 0,
    skippedDuplicates: 0,
    invalid: parsed.filter((r) => r.verdict === 'INVALID').length,
    failed: 0,
    errors: parsed.filter((r) => r.verdict === 'INVALID').map((r) => ({ row: r.row, messages: r.messages })),
  }

  const actionable = parsed.filter((row) => row.values !== null)

  // Chunked so a large sheet can't hold one transaction open long enough to time out.
  for (let start = 0; start < actionable.length; start += COMMIT_CHUNK) {
    const chunk = actionable.slice(start, start + COMMIT_CHUNK)
    try {
      await prisma.$transaction(async (tx) => {
        for (const row of chunk) {
          const values = row.values!
          const assignedToId =
            (values.assignedToEmail ? assigneeByEmail.get(values.assignedToEmail) : undefined) ??
            input.assignedToId ??
            null

          const isDuplicate = row.verdict === 'DUPLICATE'
          const strategy = isDuplicate ? input.duplicateStrategy : 'NEW'

          // A repeat within the same file has no CRM row to attach to yet.
          if (isDuplicate && !row.existingOrganisationId && strategy !== 'CREATE') {
            result.skippedDuplicates += 1
            continue
          }

          let organisationId: string

          if (strategy === 'NEW' || strategy === 'CREATE') {
            const created = await tx.organisation.create({
              data: {
                name: values.org.name,
                nameNormalized: normalizeOrgName(values.org.name),
                category: values.org.category,
                website: values.org.website,
                domain: normalizeDomain(values.org.website),
                generalEmail: values.org.generalEmail,
                generalPhone: values.org.generalPhone,
                linkedinUrl: values.org.linkedinUrl,
                location: values.org.location,
                priority: values.org.priority ?? input.defaultPriority,
                status: values.org.status ?? (assignedToId ? 'ASSIGNED' : 'NEW'),
                notes: values.org.notes,
                assignedToId,
                createdById: user.id,
              },
              select: { id: true },
            })
            organisationId = created.id
            result.imported += 1
          } else {
            organisationId = row.existingOrganisationId!
            if (strategy === 'UPDATE') {
              const current = await tx.organisation.findUnique({
                where: { id: organisationId },
                select: {
                  category: true,
                  website: true,
                  domain: true,
                  generalEmail: true,
                  generalPhone: true,
                  linkedinUrl: true,
                  location: true,
                  notes: true,
                  assignedToId: true,
                  status: true,
                },
              })
              if (current) {
                // Only ever fill blanks.
                const patch: Prisma.OrganisationUpdateInput = {}
                if (!current.category && values.org.category) patch.category = values.org.category
                if (!current.website && values.org.website) {
                  patch.website = values.org.website
                  patch.domain = normalizeDomain(values.org.website)
                }
                if (!current.generalEmail && values.org.generalEmail) {
                  patch.generalEmail = values.org.generalEmail
                }
                if (!current.generalPhone && values.org.generalPhone) {
                  patch.generalPhone = values.org.generalPhone
                }
                if (!current.linkedinUrl && values.org.linkedinUrl) {
                  patch.linkedinUrl = values.org.linkedinUrl
                }
                if (!current.location && values.org.location) patch.location = values.org.location
                if (!current.notes && values.org.notes) patch.notes = values.org.notes
                if (!current.assignedToId && assignedToId) {
                  patch.assignedTo = { connect: { id: assignedToId } }
                  if (current.status === 'NEW') patch.status = 'ASSIGNED'
                }
                if (Object.keys(patch).length > 0) {
                  await tx.organisation.update({ where: { id: organisationId }, data: patch })
                }
              }
              result.updated += 1
            } else {
              result.skippedDuplicates += 1
            }
          }

          // Attach the person, unless they are already on this organisation.
          if (values.contact) {
            const emailKey = normalizeEmail(values.contact.email)
            const phoneKey = normalizePhone(values.contact.phone)
            const nameKey = normalizePersonName(values.contact.name)

            const clash = await tx.contact.findFirst({
              where: {
                organisationId,
                deletedAt: null,
                OR: [
                  ...(emailKey ? [{ emailNormalized: emailKey }] : []),
                  ...(phoneKey ? [{ phoneNormalized: phoneKey }] : []),
                  ...(nameKey ? [{ nameNormalized: nameKey }] : []),
                ],
              },
              select: { id: true },
            })

            if (!clash) {
              await tx.contact.create({
                data: {
                  organisationId,
                  name: values.contact.name,
                  nameNormalized: nameKey,
                  designation: values.contact.designation,
                  email: values.contact.email,
                  emailNormalized: emailKey,
                  phone: values.contact.phone,
                  phoneNormalized: phoneKey,
                  linkedinUrl: values.contact.linkedinUrl,
                  linkedinHandle: normalizeLinkedIn(values.contact.linkedinUrl),
                  isDecisionMaker: values.contact.isDecisionMaker,
                  priority: values.org.priority ?? input.defaultPriority,
                  assignedToId,
                  createdById: user.id,
                },
              })
              result.contactsCreated += 1
            }
          }
        }
      })
    } catch (error) {
      // One bad chunk must not discard the rest of the sheet.
      result.failed += chunk.length
      result.errors.push({
        row: chunk[0]!.row,
        messages: [
          `Rows ${chunk[0]!.row}–${chunk[chunk.length - 1]!.row} could not be saved: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        ],
      })
      console.error('[import] chunk failed', error)
    }
  }

  const summary: StagedPayload = {
    ...staged.payload,
    stage: 'COMMITTED',
    // Drop the raw rows now that they are in the CRM — keep the report.
    rows: [],
    mapping: input.mapping,
    errors: result.errors,
  }

  await prisma.$transaction(async (tx) => {
    await tx.importBatch.update({
      where: { id: staged.id },
      data: {
        imported: result.imported,
        updated: result.updated,
        skippedDuplicates: result.skippedDuplicates,
        invalid: result.invalid,
        summary: summary as unknown as Prisma.InputJsonValue,
      },
    })

    await writeAudit(
      {
        userId: user.id,
        action: 'import.completed',
        entityType: 'import',
        entityId: staged.id,
        entityLabel: staged.fileName,
        summary: `Imported ${staged.fileName}: ${result.imported} organisations created, ${result.updated} updated, ${result.contactsCreated} contacts added, ${result.skippedDuplicates} duplicates skipped, ${result.invalid} invalid`,
        after: {
          imported: result.imported,
          updated: result.updated,
          contactsCreated: result.contactsCreated,
          skippedDuplicates: result.skippedDuplicates,
          invalid: result.invalid,
          failed: result.failed,
        },
      },
      tx,
    )
  })

  return result
}

export async function listImportBatches(user: CurrentUser, take = 10) {
  assertCan(user, 'data:import')
  return prisma.importBatch.findMany({
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      fileName: true,
      totalRows: true,
      imported: true,
      updated: true,
      skippedDuplicates: true,
      invalid: true,
      createdAt: true,
      uploadedBy: { select: { name: true } },
    },
  })
}
