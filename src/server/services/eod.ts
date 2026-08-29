import { Prisma, type ActivityOutcome, type OrgStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { CurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { OUTCOME_META, type Tone } from '@/lib/constants'
import {
  addDaysToKey,
  dayRangeUtc,
  formatLongDate,
  startOfDayUtc,
  type DateKey,
} from '@/lib/dates'
import type { EodGenerateInput } from '@/lib/validation'
import { NotFoundError } from '@/server/errors'
import { AIService, type EodFacts, type EodNarrative } from '@/server/ai'
import { writeAudit } from './audit'
import { getDayMetrics, getUserDayMetrics, type DayMetrics, type UserMetrics } from './metrics'
import { getSettings } from './settings'

/**
 * End-of-day report (spec §25–§30).
 *
 * Division of labour, and it is not negotiable (spec §26):
 *   • every number here comes from `metrics.ts`, i.e. from SQL;
 *   • the AI may only write prose, and what it writes is checked against those
 *     numbers before it is stored;
 *   • if the AI is unavailable, unconfigured or caught inventing a figure, the
 *     report is still produced with a deterministic narrative.
 *
 * The stored `whatsappText` is the exact string the user copies or sends, so
 * what they reviewed on screen is what the founder receives.
 */

// ── Key updates ──────────────────────────────────────────────────────────────

export interface EodKeyUpdate {
  organisationId: string
  organisation: string
  outcome: ActivityOutcome
  /** "Interested", "Meeting scheduled", … */
  headline: string
  /** First line of the rep's note, trimmed. */
  detail: string | null
  by: string
  status: OrgStatus
  tone: Tone
  rank: number
}

/** How newsworthy each outcome is. Anything absent never reaches the report. */
const NOTABLE_OUTCOMES: Partial<Record<ActivityOutcome, number>> = {
  MEETING_COMPLETED: 6,
  MEETING_SCHEDULED: 5,
  INTERESTED: 4,
  REPLIED: 3,
  CONNECTION_ACCEPTED: 2,
  CONNECTED: 2,
  CALL_BACK: 1,
  NOT_INTERESTED: 1,
}

const NOTABLE_KEYS = Object.keys(NOTABLE_OUTCOMES) as ActivityOutcome[]

function firstLine(notes: string | null, limit = 110): string | null {
  if (!notes) return null
  const line = notes.split('\n').map((l) => l.trim()).find(Boolean)
  if (!line) return null
  return line.length > limit ? `${line.slice(0, limit - 1).trimEnd()}…` : line
}

/**
 * The day's genuinely notable movements, one row per organisation so a chatty
 * afternoon on one lead doesn't crowd out everyone else.
 */
export async function computeKeyUpdates(dateKey: DateKey, take = 10): Promise<EodKeyUpdate[]> {
  const { start, end } = dayRangeUtc(dateKey)

  const rows = await prisma.activity.findMany({
    where: {
      deletedAt: null,
      activityDate: { gte: start, lt: end },
      outcome: { in: NOTABLE_KEYS },
      organisation: { deletedAt: null },
    },
    select: {
      outcome: true,
      notes: true,
      activityDate: true,
      organisationId: true,
      organisation: { select: { name: true, status: true } },
      performedBy: { select: { name: true } },
    },
    orderBy: { activityDate: 'desc' },
  })

  const best = new Map<string, EodKeyUpdate>()
  for (const row of rows) {
    const rank = NOTABLE_OUTCOMES[row.outcome] ?? 0
    const existing = best.get(row.organisationId)
    if (existing && existing.rank >= rank) continue

    best.set(row.organisationId, {
      organisationId: row.organisationId,
      organisation: row.organisation.name,
      outcome: row.outcome,
      headline: OUTCOME_META[row.outcome].label,
      detail: firstLine(row.notes),
      by: row.performedBy.name,
      status: row.organisation.status,
      tone: OUTCOME_META[row.outcome].tone,
      rank,
    })
  }

  return [...best.values()]
    .sort((a, b) => b.rank - a.rank || a.organisation.localeCompare(b.organisation))
    .slice(0, take)
}

// ── Deterministic data ───────────────────────────────────────────────────────

export interface EodData {
  dateKey: DateKey
  dateLabel: string
  teamName: string
  metrics: DayMetrics
  perUser: UserMetrics[]
  keyUpdates: EodKeyUpdate[]
}

/** Everything the report needs, computed from the database. No AI involved. */
export async function buildEodData(dateKey: DateKey): Promise<EodData> {
  const [metrics, perUser, keyUpdates, settings] = await Promise.all([
    getDayMetrics(dateKey, null),
    getUserDayMetrics(dateKey, null),
    computeKeyUpdates(dateKey),
    getSettings(),
  ])

  return {
    dateKey,
    dateLabel: formatLongDate(dateKey),
    teamName: settings.teamName,
    metrics,
    perUser,
    keyUpdates,
  }
}

/** The fact sheet handed to the AI — a projection of `EodData`, nothing more. */
export function toFacts(data: EodData, previous: DayMetrics | null): EodFacts {
  return {
    dateKey: data.dateKey,
    dateLabel: data.dateLabel,
    teamName: data.teamName,
    metrics: {
      organisationsContacted: data.metrics.organisationsContacted,
      calls: data.metrics.calls,
      emails: data.metrics.emails,
      linkedin: data.metrics.linkedin,
      meetings: data.metrics.meetings,
      followUps: data.metrics.followUps,
      notes: data.metrics.notes,
      responses: data.metrics.responses,
      interested: data.metrics.interested,
      rejected: data.metrics.rejected,
      meetingsScheduled: data.metrics.meetingsScheduled,
      meetingsCompleted: data.metrics.meetingsCompleted,
      newOrganisations: data.metrics.newOrganisations,
      newContacts: data.metrics.newContacts,
      followUpsPending: data.metrics.followUpsPending,
      followUpsOverdue: data.metrics.followUpsOverdue,
      followUpsCompleted: data.metrics.followUpsCompleted,
    },
    perUser: data.perUser
      .filter((u) => u.activities > 0)
      .map((u) => ({
        name: u.name,
        role: u.role,
        calls: u.calls,
        emails: u.emails,
        linkedin: u.linkedin,
        meetings: u.meetings,
        responses: u.responses,
        interested: u.interested,
        organisationsContacted: u.organisationsContacted,
        activities: u.activities,
      })),
    keyUpdates: data.keyUpdates.map((k) => ({
      organisation: k.organisation,
      headline: k.headline,
      ...(k.detail ? { detail: k.detail } : {}),
    })),
    previous: previous
      ? {
          organisationsContacted: previous.organisationsContacted,
          responses: previous.responses,
          interested: previous.interested,
        }
      : null,
  }
}

/**
 * Narrative written from our own numbers, used when AI is off, unavailable, or
 * rejected. Plain, factual, and always correct.
 */
export function deterministicNarrative(data: EodData): EodNarrative {
  const m = data.metrics
  const sentences: string[] = []

  if (m.activities === 0) {
    sentences.push(`No outreach was logged on ${data.dateLabel}.`)
  } else {
    const channels = [
      m.calls ? `${m.calls} ${plural(m.calls, 'call')}` : null,
      m.emails ? `${m.emails} ${plural(m.emails, 'email')}` : null,
      m.linkedin ? `${m.linkedin} LinkedIn ${plural(m.linkedin, 'touch', 'touches')}` : null,
      m.meetings ? `${m.meetings} ${plural(m.meetings, 'meeting')}` : null,
    ].filter(Boolean) as string[]

    sentences.push(
      `The team logged ${m.activities} ${plural(m.activities, 'activity', 'activities')} across ${
        m.organisationsContacted
      } ${plural(m.organisationsContacted, 'organisation')}${
        channels.length ? ` — ${list(channels)}` : ''
      }.`,
    )

    if (m.responses > 0) {
      sentences.push(
        `${m.responses} ${plural(m.responses, 'response')} came back${
          m.interested > 0
            ? `, and ${m.interested} ${plural(m.interested, 'organisation is', 'organisations are')} now marked interested`
            : ''
        }.`,
      )
    } else {
      sentences.push('No organisation responded today.')
    }

    if (m.meetingsScheduled > 0) {
      sentences.push(
        `${m.meetingsScheduled} ${plural(m.meetingsScheduled, 'meeting was', 'meetings were')} scheduled.`,
      )
    }
  }

  const highlights: string[] = []

  const top = data.perUser.filter((u) => u.activities > 0)[0]
  if (top) {
    highlights.push(
      `Most active: ${top.name} with ${top.activities} ${plural(top.activities, 'activity', 'activities')}.`,
    )
  }
  const idle = data.perUser.filter((u) => u.activities === 0).map((u) => u.name)
  if (idle.length > 0) highlights.push(`No activity logged by ${list(idle)}.`)

  if (m.followUpsOverdue > 0) {
    highlights.push(
      `${m.followUpsOverdue} ${plural(m.followUpsOverdue, 'follow-up is', 'follow-ups are')} overdue and need clearing first tomorrow.`,
    )
  } else if (m.followUpsPending > 0) {
    highlights.push(`${m.followUpsPending} ${plural(m.followUpsPending, 'follow-up is', 'follow-ups are')} pending.`)
  }

  if (data.keyUpdates.length > 0) {
    highlights.push(`Priority tomorrow: ${data.keyUpdates.slice(0, 3).map((k) => k.organisation).join(', ')}.`)
  }
  if (m.newOrganisations > 0) {
    highlights.push(`${m.newOrganisations} new ${plural(m.newOrganisations, 'organisation')} added to the pipeline.`)
  }

  return { summary: sentences.join(' '), highlights }
}

function plural(count: number, one: string, many?: string): string {
  if (count === 1) return one
  return many ?? `${one}s`
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

// ── WhatsApp-formatted text (spec §25 layout, §29 formatting) ────────────────

export function buildWhatsappText(data: EodData, narrative: EodNarrative): string {
  const m = data.metrics
  const lines: string[] = []

  lines.push(`*${data.teamName.toUpperCase()} — DAILY OUTREACH REPORT*`)
  lines.push(`_${data.dateLabel}_`)
  lines.push('')

  lines.push('*TEAM SUMMARY*')
  lines.push(`• Organisations contacted: ${m.organisationsContacted}`)
  lines.push(`• Calls: ${m.calls}`)
  lines.push(`• Emails: ${m.emails}`)
  lines.push(`• LinkedIn: ${m.linkedin}`)
  lines.push(`• Responses: ${m.responses}`)
  lines.push(`• Interested: ${m.interested}`)
  lines.push(`• Meetings: ${m.meetings}`)
  lines.push(
    `• Follow-ups pending: ${m.followUpsPending}${
      m.followUpsOverdue > 0 ? ` (${m.followUpsOverdue} overdue)` : ''
    }`,
  )
  if (m.newOrganisations > 0 || m.newContacts > 0) {
    lines.push(`• Added today: ${m.newOrganisations} organisations, ${m.newContacts} contacts`)
  }

  const active = data.perUser.filter((u) => u.activities > 0)
  if (active.length > 0) {
    lines.push('')
    lines.push('*TEAM PERFORMANCE*')
    for (const u of active) {
      const parts = [
        `${u.calls} ${plural(u.calls, 'call')}`,
        `${u.emails} ${plural(u.emails, 'email')}`,
      ]
      if (u.linkedin > 0) parts.push(`${u.linkedin} LinkedIn`)
      if (u.meetings > 0) parts.push(`${u.meetings} ${plural(u.meetings, 'meeting')}`)
      parts.push(`${u.responses} ${plural(u.responses, 'response')}`)
      lines.push(`• ${u.name} — ${parts.join(', ')}`)
    }
    const idle = data.perUser.filter((u) => u.activities === 0)
    if (idle.length > 0) lines.push(`• No activity: ${idle.map((u) => u.name).join(', ')}`)
  }

  if (data.keyUpdates.length > 0) {
    lines.push('')
    lines.push('*KEY UPDATES*')
    for (const k of data.keyUpdates) {
      lines.push(`• ${k.organisation} — ${k.headline}${k.detail ? `: ${k.detail}` : ''}`)
    }
  }

  if (narrative.summary) {
    lines.push('')
    lines.push('*SUMMARY*')
    lines.push(narrative.summary)
  }

  if (narrative.highlights.length > 0) {
    lines.push('')
    lines.push('*WHAT MATTERS TOMORROW*')
    for (const h of narrative.highlights) lines.push(`• ${h}`)
  }

  lines.push('')
  lines.push(`_Generated from ${data.teamName} CRM · ${data.dateKey}_`)

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

// ── Persistence ──────────────────────────────────────────────────────────────

export interface EodReportView {
  id: string
  dateKey: DateKey
  dateLabel: string
  teamName: string
  metrics: DayMetrics
  perUser: UserMetrics[]
  keyUpdates: EodKeyUpdate[]
  ai: {
    summary: string | null
    highlights: string[]
    provider: string | null
    model: string | null
    failed: boolean
  }
  whatsappText: string
  whatsappNumber?: string | null
  version: number
  generatedBy: { id: string; name: string }
  lastSentAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const reportSelect = {
  id: true,
  dateKey: true,
  reportDate: true,
  metrics: true,
  perUser: true,
  keyUpdates: true,
  aiSummary: true,
  aiHighlights: true,
  aiProvider: true,
  aiModel: true,
  aiFailed: true,
  whatsappText: true,
  version: true,
  lastSentAt: true,
  createdAt: true,
  updatedAt: true,
  generatedBy: { select: { id: true, name: true } },
} satisfies Prisma.EodReportSelect

type ReportRow = Prisma.EodReportGetPayload<{ select: typeof reportSelect }>

/** Prisma's Json input type can't see through our interfaces; this is the seam. */
function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function toView(row: ReportRow, teamName: string): EodReportView {
  return {
    id: row.id,
    dateKey: row.dateKey,
    dateLabel: formatLongDate(row.dateKey),
    teamName,
    metrics: row.metrics as unknown as DayMetrics,
    perUser: (row.perUser ?? []) as unknown as UserMetrics[],
    keyUpdates: (row.keyUpdates ?? []) as unknown as EodKeyUpdate[],
    ai: {
      summary: row.aiSummary,
      highlights: (row.aiHighlights ?? []) as unknown as string[],
      provider: row.aiProvider,
      model: row.aiModel,
      failed: row.aiFailed,
    },
    whatsappText: row.whatsappText,
    whatsappNumber: process.env.EOD_WHATSAPP_NUMBER || null,
    version: row.version,
    generatedBy: row.generatedBy,
    lastSentAt: row.lastSentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export interface GenerateEodResult {
  report: EodReportView
  /** False when an existing report was returned untouched (spec §30). */
  generated: boolean
  /** Why the deterministic narrative was used, if it was. */
  aiError: string | null
}

/**
 * Generate (or regenerate) the report for one day.
 *
 * An existing report is returned as-is unless `regenerate` is set — old reports
 * are a record of what was sent, so they are never silently rewritten (§30).
 */
export async function generateEodReport(
  user: CurrentUser,
  input: EodGenerateInput,
): Promise<GenerateEodResult> {
  assertCan(user, 'eod:generate')

  const existing = await prisma.eodReport.findUnique({
    where: { dateKey: input.dateKey },
    select: reportSelect,
  })

  if (existing && !input.regenerate) {
    const settings = await getSettings()
    return { report: toView(existing, settings.teamName), generated: false, aiError: null }
  }

  const data = await buildEodData(input.dateKey)

  let narrative = deterministicNarrative(data)
  let aiSummary: string | null = null
  let aiHighlights: string[] = []
  let aiProvider: string | null = null
  let aiModel: string | null = null
  let aiFailed = false
  let aiError: string | null = null

  if (!input.skipAi && AIService.isConfigured()) {
    const previous = await getDayMetrics(addDaysToKey(input.dateKey, -1), null)
    const result = await AIService.eodNarrative(toFacts(data, previous))
    aiProvider = result.provider
    aiModel = result.model
    if (result.narrative) {
      narrative = result.narrative
      aiSummary = result.narrative.summary
      aiHighlights = result.narrative.highlights
    } else {
      aiFailed = true
      aiError = result.error
    }
  }

  const whatsappText = buildWhatsappText(data, narrative)

  const row = await prisma.$transaction(async (tx) => {
    const saved = await tx.eodReport.upsert({
      where: { dateKey: data.dateKey },
      create: {
        dateKey: data.dateKey,
        reportDate: startOfDayUtc(data.dateKey),
        metrics: json(data.metrics),
        perUser: json(data.perUser),
        keyUpdates: json(data.keyUpdates),
        aiSummary,
        aiHighlights: aiHighlights.length ? json(aiHighlights) : undefined,
        aiProvider,
        aiModel,
        aiFailed,
        whatsappText,
        generatedById: user.id,
      },
      update: {
        metrics: json(data.metrics),
        perUser: json(data.perUser),
        keyUpdates: json(data.keyUpdates),
        aiSummary,
        aiHighlights: aiHighlights.length ? json(aiHighlights) : Prisma.DbNull,
        aiProvider,
        aiModel,
        aiFailed,
        whatsappText,
        generatedById: user.id,
        version: { increment: 1 },
      },
      select: reportSelect,
    })

    await writeAudit(
      {
        userId: user.id,
        action: existing ? 'eod.regenerated' : 'eod.generated',
        entityType: 'eod',
        entityId: saved.id,
        entityLabel: data.dateKey,
        summary: `${existing ? 'Regenerated' : 'Generated'} EOD report for ${data.dateLabel} — ${
          data.metrics.activities
        } activities, ${data.metrics.organisationsContacted} organisations`,
        after: {
          version: saved.version,
          aiFailed,
          activities: data.metrics.activities,
        },
      },
      tx,
    )

    return saved
  })

  return { report: toView(row, data.teamName), generated: true, aiError }
}

export async function getEodReport(dateKey: DateKey): Promise<EodReportView | null> {
  const [row, settings] = await Promise.all([
    prisma.eodReport.findUnique({ where: { dateKey }, select: reportSelect }),
    getSettings(),
  ])
  return row ? toView(row, settings.teamName) : null
}

export interface EodHistoryItem {
  id: string
  dateKey: DateKey
  dateLabel: string
  activities: number
  organisationsContacted: number
  responses: number
  interested: number
  version: number
  aiFailed: boolean
  lastSentAt: Date | null
  generatedBy: string
}

/** Report history, newest first (spec §30). */
export async function listEodReports(take = 30): Promise<EodHistoryItem[]> {
  const rows = await prisma.eodReport.findMany({
    orderBy: { reportDate: 'desc' },
    take,
    select: {
      id: true,
      dateKey: true,
      metrics: true,
      version: true,
      aiFailed: true,
      lastSentAt: true,
      generatedBy: { select: { name: true } },
    },
  })

  return rows.map((row) => {
    const m = row.metrics as unknown as DayMetrics
    return {
      id: row.id,
      dateKey: row.dateKey,
      dateLabel: formatLongDate(row.dateKey),
      activities: m?.activities ?? 0,
      organisationsContacted: m?.organisationsContacted ?? 0,
      responses: m?.responses ?? 0,
      interested: m?.interested ?? 0,
      version: row.version,
      aiFailed: row.aiFailed,
      lastSentAt: row.lastSentAt,
      generatedBy: row.generatedBy.name,
    }
  })
}

/**
 * Records that the user opened WhatsApp with the report pre-filled. We cannot
 * know whether they pressed Send — the last step is deliberately manual (§28) —
 * so this is "handed off", not "delivered".
 */
export async function markEodSent(user: CurrentUser, dateKey: DateKey): Promise<{ sentAt: Date }> {
  assertCan(user, 'eod:generate')

  const report = await prisma.eodReport.findUnique({
    where: { dateKey },
    select: { id: true, dateKey: true },
  })
  if (!report) throw new NotFoundError('EOD report')

  const sentAt = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.eodReport.update({ where: { id: report.id }, data: { lastSentAt: sentAt } })
    await writeAudit(
      {
        userId: user.id,
        action: 'eod.sent',
        entityType: 'eod',
        entityId: report.id,
        entityLabel: report.dateKey,
        summary: `EOD report for ${formatLongDate(report.dateKey)} opened in WhatsApp for sending`,
      },
      tx,
    )
  })

  return { sentAt }
}
