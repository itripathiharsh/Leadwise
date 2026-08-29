import { PrismaClient, Role, OrgStatus, Priority, ActivityType, ActivityOutcome } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Leadwise Outreach CRM database...')

  // 1. Clean existing records in sequence
  await prisma.notification.deleteMany()
  await prisma.notificationPreference.deleteMany()
  await prisma.backupRecord.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.activity.deleteMany()
  await prisma.followUp.deleteMany()
  await prisma.contact.deleteMany()
  await prisma.organisation.deleteMany()
  await prisma.eodReport.deleteMany()
  await prisma.importBatch.deleteMany()
  await prisma.user.deleteMany()

  const passwordHash = await bcrypt.hash('Sentio@123', 10)

  // 2. Create Users
  const harsh = await prisma.user.create({
    data: {
      name: 'Harsh',
      email: 'harsh@sentiomind.com',
      passwordHash,
      role: Role.OWNER,
      phone: '+919876543210',
      avatarColor: 'violet',
      isActive: true,
    },
  })

  const priya = await prisma.user.create({
    data: {
      name: 'Priya',
      email: 'priya@sentiomind.com',
      passwordHash,
      role: Role.TL,
      phone: '+919876543211',
      avatarColor: 'teal',
      isActive: true,
    },
  })

  const rahul = await prisma.user.create({
    data: {
      name: 'Rahul',
      email: 'rahul@sentiomind.com',
      passwordHash,
      role: Role.INTERN,
      phone: '+919876543212',
      avatarColor: 'indigo',
      isActive: true,
    },
  })

  const ananya = await prisma.user.create({
    data: {
      name: 'Ananya',
      email: 'ananya@sentiomind.com',
      passwordHash,
      role: Role.INTERN,
      phone: '+919876543213',
      avatarColor: 'amber',
      isActive: true,
    },
  })

  console.log('✅ Users created: Harsh (Owner), Priya (TL), Rahul (Intern), Ananya (Intern)')

  // 3. Create Notification Preferences
  for (const u of [harsh, priya, rahul, ananya]) {
    await prisma.notificationPreference.create({
      data: {
        userId: u.id,
        followUpReminders: true,
        meetingReminders: true,
        assignmentNotifications: true,
        backupAlerts: u.role === Role.OWNER || u.role === Role.TL,
      },
    })
  }

  // 4. Create Organisations & Contacts
  const athena = await prisma.organisation.create({
    data: {
      name: 'Athena Behavioural Health',
      nameNormalized: 'athena behavioural health',
      category: 'Behavioural Health',
      website: 'https://athenabehavioural.com',
      domain: 'athenabehavioural.com',
      generalEmail: 'info@athenabehavioural.com',
      generalPhone: '+91 92890 86193',
      location: 'Gurugram, Haryana',
      priority: Priority.HIGH,
      status: OrgStatus.INTERESTED,
      assignedToId: rahul.id,
      createdById: harsh.id,
      notes: 'Leading inpatient and outpatient mental health care center.',
      activityCount: 3,
      lastContactedAt: new Date(),
    },
  })

  const cadabams = await prisma.organisation.create({
    data: {
      name: 'Cadabams Hospitals',
      nameNormalized: 'cadabams hospitals',
      category: 'Hospital',
      website: 'https://cadabamshospitals.com',
      domain: 'cadabamshospitals.com',
      generalEmail: 'reach@cadabamshospitals.com',
      generalPhone: '+91 97414 76476',
      location: 'Bengaluru, Karnataka',
      priority: Priority.HIGH,
      status: OrgStatus.MEETING,
      assignedToId: ananya.id,
      createdById: harsh.id,
      notes: 'One of the largest psychiatric recovery and rehabilitation chains.',
      activityCount: 2,
      lastContactedAt: new Date(),
    },
  })

  const sukoon = await prisma.organisation.create({
    data: {
      name: 'Sukoon Health',
      nameNormalized: 'sukoon health',
      category: 'Mental Health Clinic',
      website: 'https://sukoonhealth.com',
      domain: 'sukoonhealth.com',
      generalEmail: 'care@sukoonhealth.com',
      generalPhone: '+91 84484 49099',
      location: 'Delhi NCR',
      priority: Priority.HIGH,
      status: OrgStatus.CONTACTED,
      assignedToId: rahul.id,
      createdById: priya.id,
      notes: 'Premium psychiatric hospital with modern clinical setups.',
      activityCount: 1,
      lastContactedAt: new Date(),
    },
  })

  const nimhans = await prisma.organisation.create({
    data: {
      name: 'NIMHANS Outpatient & Outreach',
      nameNormalized: 'nimhans outpatient & outreach',
      category: 'Hospital',
      location: 'Bengaluru, Karnataka',
      priority: Priority.MEDIUM,
      status: OrgStatus.ASSIGNED,
      assignedToId: ananya.id,
      createdById: priya.id,
      notes: 'National institute with academic and community outreach programs.',
      activityCount: 0,
    },
  })

  const mindpeers = await prisma.organisation.create({
    data: {
      name: 'Mindpeers Corporate Wellness',
      nameNormalized: 'mindpeers corporate wellness',
      category: 'Corporate / HR',
      website: 'https://mindpeers.co',
      domain: 'mindpeers.co',
      priority: Priority.MEDIUM,
      status: OrgStatus.NEW,
      createdById: harsh.id,
      notes: 'B2B mental wellbeing solutions provider.',
      activityCount: 0,
    },
  })

  console.log('✅ Organisations created: Athena, Cadabams, Sukoon, NIMHANS, Mindpeers')

  // 5. Create Contacts
  const athenaContact = await prisma.contact.create({
    data: {
      organisationId: athena.id,
      name: 'Dr. Sameer Malhotra',
      nameNormalized: 'sameer malhotra',
      designation: 'Director & Chief Psychiatrist',
      department: 'Clinical Leadership',
      email: 'dr.sameer@athenabehavioural.com',
      emailNormalized: 'dr.sameer@athenabehavioural.com',
      phone: '+91 98100 12345',
      phoneNormalized: '9810012345',
      isDecisionMaker: true,
      priority: Priority.HIGH,
      createdById: rahul.id,
      notes: 'Key decision maker for clinical partnership collaborations.',
    },
  })

  const cadabamsContact = await prisma.contact.create({
    data: {
      organisationId: cadabams.id,
      name: 'Neha Cadabam',
      nameNormalized: 'neha cadabam',
      designation: 'Executive Director',
      department: 'Management',
      email: 'neha@cadabamshospitals.com',
      emailNormalized: 'neha@cadabamshospitals.com',
      phone: '+91 98450 67890',
      phoneNormalized: '9845067890',
      linkedinUrl: 'https://linkedin.com/in/nehacadabam',
      isDecisionMaker: true,
      priority: Priority.HIGH,
      createdById: ananya.id,
    },
  })

  const sukoonContact = await prisma.contact.create({
    data: {
      organisationId: sukoon.id,
      name: 'Vidur Kaushik',
      nameNormalized: 'vidur kaushik',
      designation: 'Co-Founder & CEO',
      email: 'vidur@sukoonhealth.com',
      emailNormalized: 'vidur@sukoonhealth.com',
      isDecisionMaker: true,
      priority: Priority.HIGH,
      createdById: rahul.id,
    },
  })

  console.log('✅ Contacts created with Decision Maker tags')

  // 6. Log Sample Activities
  await prisma.activity.create({
    data: {
      organisationId: athena.id,
      contactId: athenaContact.id,
      performedById: rahul.id,
      type: ActivityType.CALL,
      outcome: ActivityOutcome.INTERESTED,
      notes: 'Spoke with Dr. Sameer. He is very keen on exploring the partnership model. Requested a follow-up call on Friday to review the proposal draft.',
      activityDate: new Date(),
    },
  })

  await prisma.activity.create({
    data: {
      organisationId: athena.id,
      contactId: athenaContact.id,
      performedById: rahul.id,
      type: ActivityType.EMAIL,
      outcome: ActivityOutcome.SENT,
      emailSubject: 'Leadwise Partnership Proposal Deck',
      notes: 'Shared introductory presentation and clinical trial summaries.',
      activityDate: new Date(),
    },
  })

  await prisma.activity.create({
    data: {
      organisationId: cadabams.id,
      contactId: cadabamsContact.id,
      performedById: ananya.id,
      type: ActivityType.MEETING,
      outcome: ActivityOutcome.MEETING_SCHEDULED,
      meetingLocation: 'Google Meet',
      notes: 'Scheduled initial alignment session with Neha Cadabam and clinical lead.',
      activityDate: new Date(),
    },
  })

  await prisma.activity.create({
    data: {
      organisationId: sukoon.id,
      contactId: sukoonContact.id,
      performedById: rahul.id,
      type: ActivityType.LINKEDIN,
      outcome: ActivityOutcome.CONNECTION_ACCEPTED,
      notes: 'Connected with CEO Vidur Kaushik on LinkedIn. Sent intro message.',
      activityDate: new Date(),
    },
  })

  console.log('✅ Activities logged across Calls, Emails, LinkedIn, and Meetings')

  // 7. Create Follow-ups
  const today = new Date()
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await prisma.followUp.create({
    data: {
      organisationId: athena.id,
      contactId: athenaContact.id,
      assignedToId: rahul.id,
      createdById: rahul.id,
      dueDate: today,
      note: 'Call back Dr. Sameer to confirm proposal review timing.',
      reminderEnabled: true,
    },
  })

  await prisma.followUp.create({
    data: {
      organisationId: cadabams.id,
      contactId: cadabamsContact.id,
      assignedToId: ananya.id,
      createdById: ananya.id,
      dueDate: tomorrow,
      note: 'Send Google Meet calendar invite with meeting agenda to Neha Cadabam.',
      reminderEnabled: true,
    },
  })

  console.log('✅ Follow-ups scheduled (Today and Tomorrow)')

  // 8. Notifications
  await prisma.notification.create({
    data: {
      userId: rahul.id,
      type: 'FOLLOW_UP_DUE',
      priority: 'URGENT',
      title: 'Follow-up Due Today',
      message: 'Follow-up scheduled with Dr. Sameer Malhotra at Athena Behavioural Health.',
      entityType: 'organisation',
      entityId: athena.id,
      linkUrl: `/organisations/${athena.id}`,
    },
  })

  await prisma.notification.create({
    data: {
      userId: ananya.id,
      type: 'MEETING_REMINDER',
      priority: 'INFO',
      title: 'Upcoming Meeting Tomorrow',
      message: 'Meeting with Neha Cadabam at Cadabams Hospitals.',
      entityType: 'organisation',
      entityId: cadabams.id,
      linkUrl: `/organisations/${cadabams.id}`,
    },
  })

  // 9. Outreach Templates
  await prisma.template.create({
    data: {
      title: 'Initial Partnership Exploration',
      category: 'EMAIL',
      subcategory: 'INITIAL_OUTREACH',
      subject: 'Exploring Clinical Partnership: Leadwise & {{organisation_name}}',
      body: `Dear {{contact_name}},\n\nI hope this note finds you well. I am reaching out from Leadwise regarding a potential partnership with {{organisation_name}}.\n\nWe provide clinical-grade digital solutions tailored for healthcare providers. We would love to explore synergy with your clinical programs.\n\nCould we connect for a brief 15-minute introductory call this week?\n\nBest regards,\n{{sender_name}}\nPartnerships Lead | Leadwise`,
      createdById: harsh.id,
    },
  })

  await prisma.template.create({
    data: {
      title: 'LinkedIn InMail — Decision Maker Intro',
      category: 'LINKEDIN',
      subcategory: 'INITIAL_OUTREACH',
      body: `Hi {{contact_name}}, noticed your impactful work leading programs at {{organisation_name}}. We're collaborating with leading behavioral health institutions to scale patient outcomes. Would love to connect and share a quick overview of how we might collaborate.`,
      createdById: harsh.id,
    },
  })

  await prisma.template.create({
    data: {
      title: 'Call Script — Warm Intro & Discovery',
      category: 'CALL_SCRIPT',
      subcategory: 'INITIAL_OUTREACH',
      body: `1. Intro: "Hi {{contact_name}}, this is {{sender_name}} from Leadwise. Am I catching you at a good time?"\n2. Hook: "We work with organizations like {{organisation_name}} to enhance outreach and operational tracking."\n3. Value prop: "We're currently offering a trial partnership for select clinical centers."\n4. Ask: "Would you be open to a 20-min product walkthrough with our director on Thursday or Friday?"`,
      createdById: harsh.id,
    },
  })

  await prisma.template.create({
    data: {
      title: 'WhatsApp Partnership Follow-up',
      category: 'WHATSAPP',
      subcategory: 'FOLLOW_UP',
      body: `Hi {{contact_name}}, {{sender_name}} here from Leadwise following up on our email regarding {{organisation_name}}. Let me know if you'd have a few minutes for a brief call this week. Thank you!`,
      createdById: harsh.id,
    },
  })

  console.log('✅ Default outreach templates and scripts created')

  // 10. Tags
  const tagMentalHealth = await prisma.tag.create({
    data: { name: 'mental health', color: 'teal', createdById: harsh.id },
  })
  const tagHighPotential = await prisma.tag.create({
    data: { name: 'high potential', color: 'amber', createdById: harsh.id },
  })
  const tagDecisionMaker = await prisma.tag.create({
    data: { name: 'decision maker', color: 'violet', createdById: harsh.id },
  })

  await prisma.organisationTag.create({
    data: { organisationId: athena.id, tagId: tagMentalHealth.id },
  })
  await prisma.organisationTag.create({
    data: { organisationId: athena.id, tagId: tagHighPotential.id },
  })

  console.log('🎉 Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
