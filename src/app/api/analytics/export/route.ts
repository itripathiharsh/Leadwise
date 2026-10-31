import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { getCurrentUser } from '@/lib/auth/current-user'
import { assertCan } from '@/lib/rbac'
import { prisma } from '@/lib/db'
import { todayKey, dayRangeUtc, rangeUtc, addDaysToKey, formatDateTime, formatDate, formatTime } from '@/lib/dates'
import { getWeeklyAnalytics } from '@/server/services/analytics'
import { getTeamTargetsAndProgress } from '@/server/services/targets'
import { writeAuditSafe } from '@/server/services/audit'
import { ACTIVITY_TYPE_META, OUTCOME_META } from '@/lib/constants'

function formatWorksheetHeader(sheet: ExcelJS.Worksheet, headerColor = 'FF1F2544') {
  sheet.views = [{ state: 'frozen', ySplit: 1 }]
  const header = sheet.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } }
  header.alignment = { vertical: 'middle' }
  header.height = 24
}

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.role === 'INTERN') {
    return NextResponse.json({ error: 'Forbidden: Analytics export restricted to leaders' }, { status: 403 })
  }

  assertCan(user, 'data:export')

  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') || 'today'

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Leadwise Outreach CRM'
  workbook.created = new Date()

  const currentTodayKey = todayKey()

  if (range === 'today') {
    // ══════════════════════════════════════════════════════════════════════════
    // TODAY'S DATA EXPORT
    // ══════════════════════════════════════════════════════════════════════════
    const { start, end } = dayRangeUtc(currentTodayKey)

    // 1. Fetch Today's Daily Target vs Actual for each rep
    const targetsProgress = await getTeamTargetsAndProgress(user, currentTodayKey)

    // 2. Fetch Today's Logged Activities
    const todayActivities = await prisma.activity.findMany({
      where: {
        activityDate: { gte: start, lt: end },
        deletedAt: null,
      },
      include: {
        organisation: { select: { name: true, category: true, domain: true } },
        contact: { select: { name: true, designation: true, phone: true, email: true } },
        performedBy: { select: { name: true, role: true } },
      },
      orderBy: { activityDate: 'desc' },
    })

    // 3. Fetch Analytics summary (Today vs Yesterday)
    const analytics = await getWeeklyAnalytics(user)
    const todayVsYesterday = analytics.executiveAnalytics?.todayVsYesterday

    // ── SHEET 1: Today Quota & Target Progress ──
    const quotaSheet = workbook.addWorksheet("Today's Quota & Targets")
    quotaSheet.columns = [
      { header: 'Team Member', key: 'name', width: 22 },
      { header: 'Role', key: 'role', width: 12 },
      { header: 'Target Calls', key: 'targetCalls', width: 13 },
      { header: 'Actual Calls', key: 'actualCalls', width: 13 },
      { header: 'Target Emails', key: 'targetEmails', width: 13 },
      { header: 'Actual Emails', key: 'actualEmails', width: 13 },
      { header: 'Target LinkedIn', key: 'targetLinkedin', width: 14 },
      { header: 'Actual LinkedIn', key: 'actualLinkedin', width: 14 },
      { header: 'Target Meetings', key: 'targetMeetings', width: 15 },
      { header: 'Actual Meetings', key: 'actualMeetings', width: 15 },
      { header: 'Target Orgs', key: 'targetOrgs', width: 13 },
      { header: 'Actual Orgs', key: 'actualOrgs', width: 13 },
      { header: 'Total Outreach Today', key: 'totalActual', width: 20 },
      { header: 'Quota Met %', key: 'percentage', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
    ]
    formatWorksheetHeader(quotaSheet, 'FF4F46E5')

    for (const t of targetsProgress) {
      const overall = t.progressPercent.overall
      const totalActual = t.actuals.calls + t.actuals.emails + t.actuals.linkedin + t.actuals.meetings
      quotaSheet.addRow({
        name: t.userName,
        role: t.role,
        targetCalls: t.targets.calls,
        actualCalls: t.actuals.calls,
        targetEmails: t.targets.emails,
        actualEmails: t.actuals.emails,
        targetLinkedin: t.targets.linkedin,
        actualLinkedin: t.actuals.linkedin,
        targetMeetings: t.targets.meetings,
        actualMeetings: t.actuals.meetings,
        targetOrgs: t.targets.organisations,
        actualOrgs: t.actuals.organisations,
        totalActual,
        percentage: `${overall}%`,
        status: overall >= 100 ? 'EXCEEDED' : overall >= 70 ? 'ON TRACK' : 'PENDING',
      })
    }

    // ── SHEET 2: Today Activities Log ──
    const actSheet = workbook.addWorksheet("Today's Activities Log")
    actSheet.columns = [
      { header: 'Time (IST)', key: 'time', width: 14 },
      { header: 'Rep Name', key: 'rep', width: 20 },
      { header: 'Rep Role', key: 'role', width: 12 },
      { header: 'Organisation', key: 'organisation', width: 30 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Contact Person', key: 'contact', width: 22 },
      { header: 'Contact Designation', key: 'designation', width: 22 },
      { header: 'Channel', key: 'channel', width: 14 },
      { header: 'Outcome', key: 'outcome', width: 24 },
      { header: 'Phone / Email Used', key: 'contactInfo', width: 24 },
      { header: 'Subject / Meeting Place', key: 'subject', width: 30 },
      { header: 'Next Follow-up', key: 'nextFollowup', width: 16 },
      { header: 'Notes', key: 'notes', width: 45 },
    ]
    formatWorksheetHeader(actSheet, 'FF059669')

    for (const a of todayActivities) {
      const channelLabel = ACTIVITY_TYPE_META[a.type]?.label || a.type
      const outcomeLabel = OUTCOME_META[a.outcome]?.label || a.outcome
      const contactDetail = a.phoneNumberUsed || a.emailUsed || a.contact?.phone || a.contact?.email || '—'
      const subjectOrLoc = a.emailSubject || a.meetingLocation || '—'

      actSheet.addRow({
        time: formatTime(a.activityDate),
        rep: a.performedBy.name,
        role: a.performedBy.role,
        organisation: a.organisation.name,
        category: a.organisation.category || '',
        contact: a.contact?.name || 'General outreach',
        designation: a.contact?.designation || '',
        channel: channelLabel,
        outcome: outcomeLabel,
        contactInfo: contactDetail,
        subject: subjectOrLoc,
        nextFollowup: a.nextFollowupDate ? formatDate(a.nextFollowupDate) : 'None scheduled',
        notes: a.notes || '',
      })
    }

    // ── SHEET 3: Channel Velocity (Today vs Yesterday) ──
    if (todayVsYesterday) {
      const channelSheet = workbook.addWorksheet('Today vs Yesterday')
      channelSheet.columns = [
        { header: 'Outreach Channel', key: 'channel', width: 20 },
        { header: 'Today Count', key: 'today', width: 16 },
        { header: 'Yesterday Count', key: 'yesterday', width: 16 },
        { header: 'Difference (+/-)', key: 'diff', width: 16 },
        { header: 'Trend', key: 'trend', width: 16 },
      ]
      formatWorksheetHeader(channelSheet, 'FF1F2544')

      for (const c of todayVsYesterday.channelData) {
        channelSheet.addRow({
          channel: c.channel,
          today: c.Today,
          yesterday: c.Yesterday,
          diff: c.diff > 0 ? `+${c.diff}` : c.diff,
          trend: c.diff > 0 ? 'GROWING' : c.diff < 0 ? 'DECLINED' : 'UNCHANGED',
        })
      }
    }

    const fileName = `leadwise_today_analytics_${currentTodayKey}.xlsx`
    const arrayBuffer = await workbook.xlsx.writeBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await writeAuditSafe({
      userId: user.id,
      action: 'export.generated',
      entityType: 'import',
      entityId: 'today_analytics',
      entityLabel: fileName,
      summary: `Downloaded today's analytics and team outreach spreadsheet (${todayActivities.length} activities logged today)`,
    })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } else {
    // ══════════════════════════════════════════════════════════════════════════
    // 7-DAY TEAM PERFORMANCE EXPORT
    // ══════════════════════════════════════════════════════════════════════════
    const past7DaysStart = rangeUtc(addDaysToKey(currentTodayKey, -6), currentTodayKey).start
    const analytics = await getWeeklyAnalytics(user)

    // 1. Fetch 7-day activities log
    const weekActivities = await prisma.activity.findMany({
      where: {
        activityDate: { gte: past7DaysStart },
        deletedAt: null,
      },
      include: {
        organisation: { select: { name: true, category: true, domain: true } },
        contact: { select: { name: true, designation: true } },
        performedBy: { select: { name: true, role: true } },
      },
      orderBy: { activityDate: 'desc' },
      take: 2000,
    })

    // ── SHEET 1: Team 7-Day Performance ──
    const teamSheet = workbook.addWorksheet('Team 7-Day Performance')
    teamSheet.columns = [
      { header: 'Member', key: 'userName', width: 22 },
      { header: 'Role', key: 'role', width: 12 },
      { header: 'Organisations Reached', key: 'organisations', width: 22 },
      { header: 'Calls Logged', key: 'calls', width: 14 },
      { header: 'Emails Sent', key: 'emails', width: 14 },
      { header: 'LinkedIn Outreach', key: 'linkedin', width: 18 },
      { header: 'Responses Engaged', key: 'responses', width: 18 },
      { header: 'Interested Leads', key: 'interested', width: 16 },
      { header: 'Meetings Booked', key: 'meetings', width: 16 },
      { header: 'Total Activities (7d)', key: 'total', width: 20 },
    ]
    formatWorksheetHeader(teamSheet, 'FF4F46E5')

    for (const row of analytics.teamBreakdown) {
      const totalActs = row.calls + row.emails + row.linkedin + row.meetings
      teamSheet.addRow({
        userName: row.userName,
        role: row.role,
        organisations: row.organisations,
        calls: row.calls,
        emails: row.emails,
        linkedin: row.linkedin,
        responses: row.responses,
        interested: row.interested,
        meetings: row.meetings,
        total: totalActs,
      })
    }

    // ── SHEET 2: Domain Coverage & Penetration ──
    if (analytics.executiveAnalytics?.domainsCovered) {
      const domainSheet = workbook.addWorksheet('Domain Coverage')
      domainSheet.columns = [
        { header: 'Domain Name', key: 'domain', width: 26 },
        { header: 'Total Organisations', key: 'totalOrganisations', width: 20 },
        { header: 'Contacted Accounts', key: 'contactedOrganisations', width: 20 },
        { header: 'Untapped Whitespace', key: 'uncontactedOrganisations', width: 20 },
        { header: 'Pipeline Leads', key: 'pipelineLeads', width: 16 },
        { header: 'Coverage Rate %', key: 'coveragePercent', width: 16 },
      ]
      formatWorksheetHeader(domainSheet, 'FF10B981')

      for (const d of analytics.executiveAnalytics.domainsCovered) {
        domainSheet.addRow({
          domain: d.domain,
          totalOrganisations: d.totalOrganisations,
          contactedOrganisations: d.contactedOrganisations,
          uncontactedOrganisations: d.uncontactedOrganisations,
          pipelineLeads: d.pipelineLeads,
          coveragePercent: `${d.coveragePercent}%`,
        })
      }
    }

    // ── SHEET 3: 7-Day Activities Log ──
    const actSheet = workbook.addWorksheet('7-Day Activities Log')
    actSheet.columns = [
      { header: 'Date & Time (IST)', key: 'dateTime', width: 20 },
      { header: 'Rep Name', key: 'rep', width: 20 },
      { header: 'Organisation', key: 'organisation', width: 30 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Contact Person', key: 'contact', width: 22 },
      { header: 'Channel', key: 'channel', width: 14 },
      { header: 'Outcome', key: 'outcome', width: 24 },
      { header: 'Notes', key: 'notes', width: 45 },
    ]
    formatWorksheetHeader(actSheet, 'FF1F2544')

    for (const a of weekActivities) {
      actSheet.addRow({
        dateTime: formatDateTime(a.activityDate),
        rep: a.performedBy.name,
        organisation: a.organisation.name,
        category: a.organisation.category || '',
        contact: a.contact?.name || 'General outreach',
        channel: ACTIVITY_TYPE_META[a.type]?.label || a.type,
        outcome: OUTCOME_META[a.outcome]?.label || a.outcome,
        notes: a.notes || '',
      })
    }

    const fileName = `leadwise_team_analytics_7d_${currentTodayKey}.xlsx`
    const arrayBuffer = await workbook.xlsx.writeBuffer()
    const buffer = Buffer.from(arrayBuffer)

    await writeAuditSafe({
      userId: user.id,
      action: 'export.generated',
      entityType: 'import',
      entityId: 'team_analytics_7d',
      entityLabel: fileName,
      summary: `Downloaded 7-day team performance spreadsheet (${weekActivities.length} activities logged)`,
    })

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  }
}
