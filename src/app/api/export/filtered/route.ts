import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/current-user'
import { prisma } from '@/lib/db'
import { organisationScope } from '@/lib/rbac'
import ExcelJS from 'exceljs'
import type { Priority, OrgStatus, Prisma } from '@prisma/client'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const status = (searchParams.get('status') as OrgStatus) || undefined
  const priority = (searchParams.get('priority') as Priority) || undefined
  const assigneeId = searchParams.get('assigneeId') || undefined
  const query = searchParams.get('q') || undefined

  const where: Prisma.OrganisationWhereInput = {
    deletedAt: null,
    AND: [
      organisationScope(user),
      status ? { status } : {},
      priority ? { priority } : {},
      assigneeId ? { assignedToId: assigneeId === 'UNASSIGNED' ? null : assigneeId } : {},
      query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { domain: { contains: query, mode: 'insensitive' } },
              { generalEmail: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {},
    ],
  }

  const orgs = await prisma.organisation.findMany({
    where,
    include: {
      assignedTo: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
      contacts: {
        where: { deletedAt: null },
        select: { name: true, designation: true, email: true, phone: true, isDecisionMaker: true },
      },
    },
    orderBy: [{ priority: 'asc' }, { name: 'asc' }],
  })

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Leadwise Outreach CRM'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Filtered Outreach Targets')

  sheet.columns = [
    { header: 'Organisation Name', key: 'name', width: 30 },
    { header: 'Category / Sector', key: 'category', width: 22 },
    { header: 'Website / Domain', key: 'domain', width: 25 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Priority', key: 'priority', width: 14 },
    { header: 'Assigned Rep', key: 'assignee', width: 20 },
    { header: 'Primary Contact Name', key: 'contactName', width: 24 },
    { header: 'Contact Designation', key: 'contactDesignation', width: 24 },
    { header: 'Contact Email', key: 'contactEmail', width: 28 },
    { header: 'Contact Phone', key: 'contactPhone', width: 20 },
    { header: 'Decision Maker', key: 'isDecisionMaker', width: 16 },
    { header: 'Next Action', key: 'nextAction', width: 30 },
    { header: 'Last Contacted', key: 'lastContactedAt', width: 20 },
    { header: 'Notes', key: 'notes', width: 35 },
  ]

  // Header styling
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }

  for (const org of orgs) {
    const primaryContact = org.contacts[0]
    sheet.addRow({
      name: org.name,
      category: org.category || '',
      domain: org.domain || org.website || '',
      status: org.status,
      priority: org.priority,
      assignee: org.assignedTo?.name || 'Unassigned',
      contactName: primaryContact?.name || '',
      contactDesignation: primaryContact?.designation || '',
      contactEmail: primaryContact?.email || org.generalEmail || '',
      contactPhone: primaryContact?.phone || org.generalPhone || '',
      isDecisionMaker: primaryContact?.isDecisionMaker ? 'YES' : 'NO',
      nextAction: org.nextAction || '',
      lastContactedAt: org.lastContactedAt ? org.lastContactedAt.toISOString().slice(0, 10) : 'Never',
      notes: org.notes || '',
    })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `leadwise_outreach_${new Date().toISOString().slice(0, 10)}.xlsx`

  return new Response(buffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
