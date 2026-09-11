import ExcelJS from 'exceljs'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan, contactScope, followUpScope } from '@/lib/rbac'
import {
  ACTIVITY_TYPE_META,
  CONTACT_STATUS_META,
  ORG_STATUS_META,
  OUTCOME_META,
  PRIORITY_META,
} from '@/lib/constants'
import { formatDate, formatDateTime, todayKey } from '@/lib/dates'
import { buildOrganisationWhere, type OrganisationListParams } from './organisations'
import { buildActivityWhere, type ActivityListParams } from './activities'
import { getTeamPerformance } from './users'
import { writeAuditSafe } from './audit'

/**
 * Excel export (spec §24).
 *
 * Every export respects the filters the user currently has applied — an export
 * that silently returns something other than what is on screen is worse than no
 * export at all. Rows are streamed out of Prisma in pages so a large export
 * can't blow up memory.
 */

export type ExportKind = 'organisations' | 'contacts' | 'activities' | 'followups' | 'team'

const PAGE = 500

interface Column {
  header: string
  width: number
}

function createWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Leadwise'
  workbook.created = new Date()
  return workbook
}

function addSheet(workbook: ExcelJS.Workbook, title: string, columns: Column[]): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(title, {
    views: [{ state: 'frozen', ySplit: 1 }],
  })
  sheet.columns = columns.map((column) => ({ header: column.header, width: column.width }))

  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2544' } }
  header.alignment = { vertical: 'middle' }
  header.height = 22
  return sheet
}

async function toBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const data = await workbook.xlsx.writeBuffer()
  return Buffer.from(data)
}

export interface ExportFile {
  buffer: Buffer
  fileName: string
  contentType: string
}

const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function fileName(kind: ExportKind): string {
  return `leadwise-${kind}-${todayKey()}.xlsx`
}

// ── Organisations ────────────────────────────────────────────────────────────

async function exportOrganisations(
  user: CurrentUser,
  params: OrganisationListParams,
): Promise<ExcelJS.Workbook> {
  const workbook = createWorkbook()
  const sheet = addSheet(workbook, 'Organisations', [
    { header: 'Organisation', width: 34 },
    { header: 'Category', width: 20 },
    { header: 'Status', width: 14 },
    { header: 'Priority', width: 12 },
    { header: 'Location', width: 22 },
    { header: 'Website', width: 28 },
    { header: 'General email', width: 26 },
    { header: 'General phone', width: 18 },
    { header: 'Assigned to', width: 18 },
    { header: 'Contacts', width: 10 },
    { header: 'Activities', width: 10 },
    { header: 'Last contacted', width: 16 },
    { header: 'Next follow-up', width: 16 },
    { header: 'Created', width: 16 },
    { header: 'Notes', width: 44 },
  ])

async function fetchOrgBatch(where: Prisma.OrganisationWhereInput, cursor?: string) {
  return prisma.organisation.findMany({
    where,
    orderBy: { id: 'asc' },
    take: PAGE,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    select: {
      id: true,
      name: true,
      category: true,
      status: true,
      priority: true,
      location: true,
      website: true,
      generalEmail: true,
      generalPhone: true,
      lastContactedAt: true,
      nextFollowupAt: true,
      createdAt: true,
      notes: true,
      activityCount: true,
      assignedTo: { select: { name: true } },
      _count: { select: { contacts: { where: { deletedAt: null } } } },
    },
  })
}

  const where = buildOrganisationWhere(user, params)
  let orgCursor: string | undefined = undefined
  while (true) {
    const rows = await fetchOrgBatch(where, orgCursor)
    if (rows.length === 0) break
    orgCursor = rows[rows.length - 1].id

    for (const row of rows) {
      sheet.addRow([
        row.name,
        row.category ?? '',
        ORG_STATUS_META[row.status].label,
        PRIORITY_META[row.priority].label,
        row.location ?? '',
        row.website ?? '',
        row.generalEmail ?? '',
        row.generalPhone ?? '',
        row.assignedTo?.name ?? 'Unassigned',
        row._count.contacts,
        row.activityCount,
        row.lastContactedAt ? formatDate(row.lastContactedAt) : 'Never',
        row.nextFollowupAt ? formatDate(row.nextFollowupAt) : '',
        formatDate(row.createdAt),
        row.notes ?? '',
      ])
    }
    if (rows.length < PAGE) break
  }

  return workbook
}

// ── Contacts ─────────────────────────────────────────────────────────────────

async function exportContacts(user: CurrentUser, params: OrganisationListParams) {
  const workbook = createWorkbook()
  const sheet = addSheet(workbook, 'Contacts', [
    { header: 'Contact', width: 26 },
    { header: 'Designation', width: 24 },
    { header: 'Decision maker', width: 14 },
    { header: 'Organisation', width: 32 },
    { header: 'Email', width: 28 },
    { header: 'Phone', width: 18 },
    { header: 'LinkedIn', width: 34 },
    { header: 'Status', width: 14 },
    { header: 'Priority', width: 12 },
    { header: 'Assigned to', width: 18 },
    { header: 'Last contacted', width: 16 },
    { header: 'Notes', width: 40 },
  ])

  // Contacts inherit the organisation filters that are on screen.
  const organisationWhere = buildOrganisationWhere(user, params)

async function fetchContactBatch(where: Prisma.ContactWhereInput, cursor?: string) {
  return prisma.contact.findMany({
    where,
    orderBy: { id: 'asc' },
    take: PAGE,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    select: {
      id: true,
      name: true,
      designation: true,
      isDecisionMaker: true,
      email: true,
      phone: true,
      linkedinUrl: true,
      status: true,
      priority: true,
      lastContactedAt: true,
      notes: true,
      organisation: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
  })
}

  let contactCursor: string | undefined = undefined
  while (true) {
    const rows = await fetchContactBatch(
      {
        deletedAt: null,
        organisation: organisationWhere,
        AND: [contactScope(user)],
      },
      contactCursor,
    )
    if (rows.length === 0) break
    contactCursor = rows[rows.length - 1].id

    for (const row of rows) {
      sheet.addRow([
        row.name,
        row.designation ?? '',
        row.isDecisionMaker ? 'Yes' : 'No',
        row.organisation.name,
        row.email ?? '',
        row.phone ?? '',
        row.linkedinUrl ?? '',
        CONTACT_STATUS_META[row.status].label,
        PRIORITY_META[row.priority].label,
        row.assignedTo?.name ?? 'Unassigned',
        row.lastContactedAt ? formatDate(row.lastContactedAt) : 'Never',
        row.notes ?? '',
      ])
    }
    if (rows.length < PAGE) break
  }

  return workbook
}

// ── Activities ───────────────────────────────────────────────────────────────

async function exportActivities(user: CurrentUser, params: ActivityListParams) {
  const workbook = createWorkbook()
  const sheet = addSheet(workbook, 'Activities', [
    { header: 'Date', width: 20 },
    { header: 'Type', width: 12 },
    { header: 'Outcome', width: 20 },
    { header: 'Organisation', width: 32 },
    { header: 'Contact', width: 24 },
    { header: 'Logged by', width: 18 },
    { header: 'Status after', width: 14 },
    { header: 'Next follow-up', width: 16 },
    { header: 'Email subject', width: 30 },
    { header: 'Notes', width: 60 },
  ])

async function fetchActivityBatch(where: Prisma.ActivityWhereInput, cursor?: string) {
  return prisma.activity.findMany({
    where,
    orderBy: { id: 'asc' },
    take: PAGE,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    select: {
      id: true,
      activityDate: true,
      type: true,
      outcome: true,
      statusAfter: true,
      nextFollowupDate: true,
      emailSubject: true,
      notes: true,
      organisation: { select: { name: true } },
      contact: { select: { name: true } },
      performedBy: { select: { name: true } },
    },
  })
}

  const where = buildActivityWhere(user, params)
  let actCursor: string | undefined = undefined
  while (true) {
    const rows = await fetchActivityBatch(where, actCursor)
    if (rows.length === 0) break
    actCursor = rows[rows.length - 1].id

    for (const row of rows) {
      sheet.addRow([
        formatDateTime(row.activityDate),
        ACTIVITY_TYPE_META[row.type].label,
        OUTCOME_META[row.outcome].label,
        row.organisation.name,
        row.contact?.name ?? '',
        row.performedBy.name,
        row.statusAfter ? ORG_STATUS_META[row.statusAfter].label : '',
        row.nextFollowupDate ? formatDate(row.nextFollowupDate) : '',
        row.emailSubject ?? '',
        row.notes ?? '',
      ])
    }
    if (rows.length < PAGE) break
  }

  return workbook
}

// ── Follow-ups ───────────────────────────────────────────────────────────────

async function exportFollowUps(user: CurrentUser) {
  const workbook = createWorkbook()
  const sheet = addSheet(workbook, 'Follow-ups', [
    { header: 'Due', width: 16 },
    { header: 'State', width: 12 },
    { header: 'Organisation', width: 32 },
    { header: 'Contact', width: 24 },
    { header: 'Assigned to', width: 18 },
    { header: 'Org status', width: 14 },
    { header: 'Priority', width: 12 },
    { header: 'Last contacted', width: 16 },
    { header: 'Note', width: 50 },
  ])

async function fetchFollowUpBatch(where: Prisma.FollowUpWhereInput, cursor?: string) {
  return prisma.followUp.findMany({
    where,
    orderBy: { id: 'asc' },
    take: PAGE,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    select: {
      id: true,
      dueDate: true,
      status: true,
      note: true,
      organisation: {
        select: { name: true, status: true, priority: true, lastContactedAt: true },
      },
      contact: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
  })
}

  let followUpCursor: string | undefined = undefined
  while (true) {
    const rows = await fetchFollowUpBatch(
      {
        deletedAt: null,
        organisation: { deletedAt: null },
        AND: [followUpScope(user)],
      },
      followUpCursor,
    )
    if (rows.length === 0) break
    followUpCursor = rows[rows.length - 1].id

    for (const row of rows) {
      sheet.addRow([
        formatDate(row.dueDate),
        row.status,
        row.organisation.name,
        row.contact?.name ?? '',
        row.assignedTo?.name ?? 'Unassigned',
        ORG_STATUS_META[row.organisation.status].label,
        PRIORITY_META[row.organisation.priority].label,
        row.organisation.lastContactedAt ? formatDate(row.organisation.lastContactedAt) : 'Never',
        row.note ?? '',
      ])
    }
    if (rows.length < PAGE) break
  }

  return workbook
}

// ── Team activity ────────────────────────────────────────────────────────────

async function exportTeam(user: CurrentUser) {
  const workbook = createWorkbook()
  const sheet = addSheet(workbook, 'Team activity', [
    { header: 'Team member', width: 22 },
    { header: 'Role', width: 10 },
    { header: 'Active', width: 8 },
    { header: 'Calls today', width: 12 },
    { header: 'Emails today', width: 13 },
    { header: 'LinkedIn today', width: 14 },
    { header: 'Activities today', width: 15 },
    { header: 'Activities (7d)', width: 15 },
    { header: 'Responses (7d)', width: 15 },
    { header: 'Interested (7d)', width: 15 },
    { header: 'Organisations', width: 14 },
    { header: 'Pending follow-ups', width: 18 },
    { header: 'Overdue', width: 10 },
    { header: 'Last activity', width: 20 },
  ])

  for (const row of await getTeamPerformance(user)) {
    sheet.addRow([
      row.name,
      row.role,
      row.isActive ? 'Yes' : 'No',
      row.today.calls,
      row.today.emails,
      row.today.linkedin,
      row.today.activities,
      row.week.activities,
      row.week.responses,
      row.week.interested,
      row.assignedOrganisations,
      row.pendingFollowUps,
      row.overdueFollowUps,
      row.lastActivityAt ? formatDateTime(row.lastActivityAt) : 'Never',
    ])
  }

  return workbook
}

// ── Entry point ──────────────────────────────────────────────────────────────

export interface ExportRequest {
  kind: ExportKind
  organisationParams?: OrganisationListParams
  activityParams?: ActivityListParams
}

export async function buildExport(user: CurrentUser, request: ExportRequest): Promise<ExportFile> {
  assertCan(user, 'data:export')

  const workbook = await (async () => {
    switch (request.kind) {
      case 'organisations':
        return exportOrganisations(user, request.organisationParams ?? {})
      case 'contacts':
        return exportContacts(user, request.organisationParams ?? {})
      case 'activities':
        return exportActivities(user, request.activityParams ?? {})
      case 'followups':
        return exportFollowUps(user)
      case 'team':
        return exportTeam(user)
    }
  })()

  const buffer = await toBuffer(workbook)

  await writeAuditSafe({
    userId: user.id,
    action: 'export.generated',
    entityType: 'import',
    entityId: request.kind,
    entityLabel: request.kind,
    summary: `Exported ${request.kind} to Excel`,
  })

  return { buffer, fileName: fileName(request.kind), contentType: XLSX_TYPE }
}
