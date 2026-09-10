# Leadwise - Complete Page Documentation

## Project Overview

**Leadwise** is a Next.js App Router Partnership Outreach Command Center.

**Tech Stack:**
- Next.js (App Router)
- Prisma ORM
- Tailwind CSS
- shadcn/ui components
- Groq LLaMA 3.3 (AI features)
- WhatsApp Agent (automation)

**User Roles:**
- `OWNER` - Full access to all features
- `TL` (Team Lead) - Access to team management, analytics, EOD reports
- `INTERN` (Outreach Rep) - Basic outreach features only

---

## Navigation Structure

### Sidebar Navigation (Grouped)

| Group | Page | Access |
|-------|------|--------|
| **Overview** | Dashboard | All |
| **Outreach** | Organisations | All |
| | Contacts | All |
| | Pipeline | All |
| | Activities | All |
| | Follow-ups | All |
| | Calendar | All |
| **Resources** | Templates | All |
| | Team | Owner/TL only |
| **Insights** | Analytics | All |
| | AI & Funnel (Advanced Analytics) | Owner/TL only |
| | EOD Reports | Owner/TL only |
| **System** | Settings | All |

---

## Page-by-Page Documentation

---

### 1. LOGIN PAGE

**Route:** `/login`

**Purpose:** Authentication entry point for users to sign in with corporate email and password.

**Layout:**
- Split-screen design (54% left brand showcase, right login form)
- Mobile: Form only with smaller brand header

**Data/Fields Displayed:**
| Field | Type | Description |
|-------|------|-------------|
| Email | Input | Corporate email address |
| Password | Input | Password with show/hide toggle |
| Remember this device | Checkbox | Persist session |
| AES-256 Auth | Label | Security indicator |

**Brand Showcase (Left Side):**
- "Leadwise Command Center" branding
- Hero narrative text
- Interactive miniature pipeline simulation showing 5 stages:
  1. Organization → Key Contact
  2. Key Contact → Outreach & Cadence
  3. Outreach & Cadence → Partnership Meeting
  4. Partnership Meeting → Mutual Partnership
  5. Final partnership status

**User Actions:**
- Enter email and password
- Toggle password visibility
- Check/uncheck "Remember this device"
- Submit login form → Redirects to `/dashboard`

---

### 2. DASHBOARD (Mission Control)

**Route:** `/dashboard`

**Purpose:** Primary hub providing real-time overview of outreach work, team performance, pipeline status, and AI-driven priorities.

**Data Displayed:**

#### A. Greeting Section
- Time-of-day greeting + user name

#### B. 4 Attention Tiles
| Tile | Data | Click Action |
|------|------|--------------|
| Overdue Follow-ups | Count | Navigate to Follow-ups |
| Due Today Follow-ups | Count | Navigate to Follow-ups |
| Meetings Today | Count | Navigate to Calendar |
| Warm Prospects | Count | Navigate to Pipeline |

#### C. Pipeline Funnel Overview
- 5-stage horizontal funnel:
  1. Discovery
  2. In Outreach
  3. Interested
  4. Meeting
  5. Partnership
- Counts and progress bars per stage

#### D. "Who Should I Contact Today?" (AI-Powered)
- Top 5 priority organisations ranked by AI
- Per organisation:
  - Score
  - Reason
  - Recommended action
  - Assignment status

#### E. Recent Outreach Feed
- Timeline of latest 8 activities
- Per activity:
  - Type icon (Call/Email/Meeting/LinkedIn)
  - Notes
  - Performer name
  - Outcome badge

#### F. Team Outreach Velocity Table (Owner/TL only)
- Per team member daily stats:
  - Orgs contacted
  - Calls made
  - Emails sent
  - Responses received
  - Interested count

#### G. Overdue Queue
- List of overdue follow-ups:
  - Organisation name
  - Contact name
  - Due date

#### H. Due Today Queue
- List of today's follow-ups

#### I. Active Opportunities
- Warm leads (INTERESTED, MEETING, PARTNERSHIP status)

**User Actions:**
- Click tiles to navigate to Follow-ups, Calendar, Pipeline
- Click priority cards to view org dossiers
- Click activity items to view organisation
- "Manage Team" link
- "Open Kanban Board" link

---

### 3. ORGANIZATIONS

**Route:** `/organisations`

**Purpose:** Central registry of all partnership target organisations with filtering, search, bulk assignment, and quick actions.

**Data/Fields Displayed:**

| Column | Description |
|--------|-------------|
| Checkbox | For bulk selection |
| Organisation & Contacts | Name, contact count, activity count |
| Domain & Category | Target domain, entity category |
| Stage | Status badge (NEW, ASSIGNED, CONTACTED, RESPONDED, INTERESTED, MEETING, PARTNERSHIP, REJECTED) |
| Priority | HIGH/MEDIUM/LOW badge |
| Assigned Owner | Avatar + name |
| Last Activity | Date of last touchpoint |
| Next Action | Follow-up date |
| Quick Actions | Touchpoint button, Dossier link |

**Filters:**
- Search by name
- Filter by Status
- Filter by Priority
- Filter by Owner

**User Actions:**
- Search organisations
- Filter by status/priority/owner
- Clear filters
- Select all/individual organisations
- Bulk-assign selected to a team member or unassign
- Add new organisation (CreateOrganisationModal)
- Log touchpoint (LogActivityModal)
- View org dossier (link to `/organisations/[id]`)
- Refresh data
- Paginate through results

---

### 4. ORGANIZATION DETAIL (Dossier)

**Route:** `/organisations/[id]`

**Purpose:** Detailed relationship intelligence dossier for a single organisation with contacts, activities, follow-ups, and AI insights.

**Sections:**

#### A. Hero Card
| Field | Description |
|-------|-------------|
| Organisation Name | Large heading |
| Priority Badge | HIGH/MEDIUM/LOW |
| Status Badge | Current stage |
| Category | Entity category |
| Domain | Target domain |
| Location | Geographic location |
| Website | Clickable link |
| Assigned Lead | Avatar + name |
| Override Stage | Dropdown to change stage |

#### B. Partnership Stage Progression Track
- 5 stages:
  1. Target
  2. Contacted
  3. Warm / Interested
  4. Meeting
  5. Partnered
- Click any stage to update status

#### C. Primary Action Toolbar
- Log Touchpoint buttons:
  - + Call
  - AI Call Prep
  - + Email
  - + LinkedIn
  - + Meeting
  - + Note
- Merge Entity button
- + Add Key Contact button

#### D. High-Priority Next Action
- Shows next pending follow-up or recommended action
- Quick action button (Execute Follow-up Call / Call Contact / Add First Contact)

#### E. AI Intelligence Integration
- AiLeadIntelligenceCard component

#### F. Tabbed Content

| Tab | Content |
|-----|---------|
| **Overview & Intel** | Organisation Blueprint (General Email, General Phone, Target Domain, Entity Category, Internal Strategic Notes), Engagement Velocity metrics (Total Activities, Mapped Contacts, Pending Follow-ups) |
| **Contacts** | Stakeholders & Decision Makers cards with name, designation, department, email, phone, LinkedIn, Call/Email buttons |
| **Activity Timeline** | Chronological feed with performer, type, date, outcome, contact, notes, follow-up dates |
| **Follow-ups** | Due date, status (PENDING/COMPLETED), note, Log Call button |
| **Team Notes** | CommentsFeed component for internal notes |

**User Actions:**
- Navigate back to organisations
- Refresh dossier
- Change partnership stage
- Log any activity type
- AI call preparation
- Add contacts
- Merge with another organisation
- View/filter by tab

---

### 5. CONTACTS

**Route:** `/contacts`

**Purpose:** Searchable, paginated table of all contacts (stakeholders/decision makers) across organisations.

**Data/Fields Displayed:**

| Column | Description |
|--------|-------------|
| Contact Name | With LinkedIn link |
| Role & Department | Designation info |
| Organisation | Linked to org dossier |
| Authority Level | Decision Maker badge or Staff |
| Direct Phone | Clickable tel: link |
| Direct Email | Clickable mailto: link |
| Cadence Actions | Call, Email buttons |

**User Actions:**
- Search contacts by name/designation/email/phone
- Refresh data
- Add new contact (CreateContactModal)
- Log a call or email directly from table row
- Paginate through results
- Click LinkedIn links

---

### 6. PIPELINE (Kanban Board)

**Route:** `/pipeline`

**Purpose:** Visual Kanban board for managing organisations through the multi-stage partnership pipeline with drag-and-drop.

**Data Displayed:**
- Pipeline board with columns/stages
- Organisation cards per stage
- Lead health indicators:
  - ACTIVE/FIRE 🔥
  - ATTENTION/WARNING ⚠️
  - GOING_COLD/SNOWFLAKE ❄️
- Total live targets count

**Filters:**
- Account Owner
- Priority
- Lead Health

**User Actions:**
- Filter board by owner/priority/health
- Clear filters
- Refresh board
- Add new target entity
- Drag-and-drop cards between pipeline stages

---

### 7. ACTIVITIES (Outreach Timeline)

**Route:** `/activities`

**Purpose:** Chronological feed of all logged outreach activities (calls, emails, meetings, LinkedIn, notes).

**Data/Fields Displayed:**

| Field | Description |
|-------|-------------|
| Channel Icon | Phone/Mail/Calendar/Linkedin/StickyNote |
| Performed By | User name |
| Activity Type | Badge |
| Date/Time | Timestamp |
| Outcome | Badge |
| Organisation | Linked |
| Contact | Name & designation |
| Notes | Text content |

**Filters:**
- Channel type tabs: All, Calls, Emails, LinkedIn, Meetings, Notes

**User Actions:**
- Filter by channel type
- Paginate
- Refresh feed
- Link to organisation profiles

---

### 8. CALENDAR

**Route:** `/calendar`

**Purpose:** Monthly calendar view showing all follow-up deadlines and meetings mapped to specific dates.

**Data Displayed:**
- Monthly calendar grid (Sun-Sat)
- Day cells with event count badges
- Each event:
  - Organisation name
  - Follow-up note
- Today highlighted with primary ring
- Month navigation (prev/next)

**User Actions:**
- Navigate between months
- Click on events to go to organisation dossier
- Refresh data

---

### 9. FOLLOW-UPS

**Route:** `/followups`

**Purpose:** Task management for scheduled follow-ups, ensuring zero lead cooling. Organized by time buckets.

**Data/Fields Displayed:**

| Field | Description |
|-------|-------------|
| Organisation Name | Linked |
| Due Date | Badge |
| Contact Name | Associated contact |
| Assigned Owner | Team member |
| Note | Task description |

**Bucket Tabs:**
| Tab | Description |
|-----|-------------|
| Due Today | Tasks due today |
| Overdue Tasks | Past due tasks |
| Tomorrow | Tasks due tomorrow |
| Upcoming Pipeline | Future follow-ups |

**User Actions:**
- Switch between time buckets
- Mark follow-ups as complete
- Log touchpoint on a follow-up
- Refresh queue

---

### 10. TEAM (Owner/TL Only)

**Route:** `/team`

**Purpose:** Admin page for team management showing performance leaderboard and user account management.

**Access:** OWNER and TL roles only

**Data/Fields Displayed:**

#### A. 7-Day Team Outreach Leaderboard

| Column | Description |
|--------|-------------|
| Team Member | Avatar, name, email |
| Role | Badge |
| Calls (7d) | Count |
| Emails (7d) | Count |
| LinkedIn (7d) | Count |
| Responses | Count |
| Interested | Count |
| Held Accounts | Count |

#### B. Authorized Accounts Table

| Column | Description |
|--------|-------------|
| Name | User name |
| Email | Corporate email |
| Phone | Direct phone |
| Role | System role |
| Account State | Active/Deactivated badge |
| Last Active | Timestamp |

**User Actions:**
- Refresh data
- Add new team member (dialog form with: Full Name, Corporate Email, System Role, Direct Phone, Initial Password)

---

### 11. TEMPLATES

**Route:** `/templates`

**Purpose:** Template library for standardizing outreach communications across the team.

**Supported Channels:**
- Email
- LinkedIn
- Call Script
- WhatsApp

**Data/Fields Displayed:**

| Field | Description |
|-------|-------------|
| Category Icon | Mail/Linkedin/Phone/MessageSquare |
| Title | Template name |
| Category Badge | EMAIL/LINKEDIN/CALL_SCRIPT/WHATSAPP |
| Subcategory | Optional categorization |
| Subject Line | For email templates |
| Body Text | Preview (max 160px) |
| Creator Name | Who created it |

**Placeholder Variables:**
- `{{organisation_name}}`
- `{{contact_name}}`
- `{{contact_designation}}`
- `{{sender_name}}`
- `{{sender_role}}`
- `{{sender_phone}}`

**User Actions:**
- Filter by channel category
- Copy template to clipboard
- Duplicate template
- Edit template (modal form)
- Delete template
- Preview template (dialog)
- Add new template
- Insert placeholder variables into body

---

### 12. ANALYTICS

**Route:** `/analytics`

**Purpose:** Comprehensive analytics dashboard showing week-over-week comparison, daily target vs actual progress, and leadership-only market penetration intelligence.

**Data/Fields Displayed:**

#### A. Target vs Actual Daily Gauges (per rep)
- Calls progress bar
- Emails progress bar
- LinkedIn progress bar
- Actual/target counts and overall percentage

#### B. Week-over-Week Comparison Cards (6 cards)

| Metric | Data |
|--------|------|
| Organisations | Current, Previous, Growth % |
| Calls | Current, Previous, Growth % |
| Emails | Current, Previous, Growth % |
| LinkedIn | Current, Previous, Growth % |
| Responses | Current, Previous, Growth % |
| Meetings | Current, Previous, Growth % |

#### C. Leadership Intelligence Section (Owner/TL only)
- Today vs Yesterday Velocity bar chart
- Domains Covered & Account Penetration horizontal stacked bar chart
- Team Outreach Breakdown table:
  - Per member: Orgs Reached, Calls, Emails, LinkedIn, Responses, Interested, Meetings
- Market coverage rate
- Pipeline leads count
- Untapped whitespace

**User Actions:**
- Refresh data
- Interactive chart tooltips on hover

---

### 13. ADVANCED ANALYTICS (AI & Funnel)

**Route:** `/analytics/advanced`

**Purpose:** Advanced analytics with deterministic stage conversion funnels, channel efficiency metrics, rejection analysis, and AI-generated insights.

**Access:** OWNER and TL roles only

**Data/Fields Displayed:**

#### A. AI Executive Insights Banner
- Strategic focus cards (up to 3)
- "What Needs Attention Today" badges

#### B. Conversion Funnel
- 6 stages: Discovery → Partnership
- Counts per stage
- Conversion-from-previous percentages
- Overall conversion rate

#### C. Channel Performance Table

| Column | Description |
|--------|-------------|
| Channel | Touches |
| | Responses |
| | Response Rate |
| | Meeting Rate |

#### D. Rejection & Loss Analysis
- Reasons breakdown with counts/percentages
- Horizontal progress bars
- AI strategic rejection takeaway insight

**User Actions:**
- Refresh data
- View interactive tooltips on charts

---

### 14. EOD REPORTS (Owner/TL Only)

**Route:** `/eod`

**Purpose:** Generates, previews, and dispatches end-of-day performance reports via WhatsApp.

**Access:** OWNER and TL roles only

**Data/Fields Displayed:**

#### A. Report Header
- Date picker
- Report title
- Date badge
- Sent status

#### B. AI Executive Summary
- Groq LLaMA 3.3 generated summary

#### C. 8 KPI Tiles

| KPI | Description |
|-----|-------------|
| Orgs Contacted | Count |
| Calls | Count |
| Emails | Count |
| LinkedIn | Count |
| Responses | Count |
| Interested | Count |
| Meetings | Count |
| Pending Follow-ups | Count |

#### D. WhatsApp Text Preview
- Monospace preformatted text
- Editable in preview dialog

#### E. Quick Section Copy
- Summary
- Team Stats
- Follow-ups

#### F. Historical Archive Table

| Column | Description |
|--------|-------------|
| Date | Report date |
| Activities | Total count |
| Orgs | Count |
| Responses | Count |
| Interested | Count |
| Generated By | User name |
| View | Action button |

#### G. WhatsApp Agent Status
- Online/offline/checking indicator

#### H. Auto Send Confirmation Dialog
- Target number
- Message preview
- Agent token input
- Result feedback

**User Actions:**
- Select date
- Generate EOD report
- Regenerate (force)
- Copy full EOD / AI summary / team stats / follow-ups to clipboard
- Preview and edit WhatsApp message text
- Send via WhatsApp Web (opens WhatsApp link with pre-filled message)
- Auto-send via local WhatsApp automation agent
- View historical reports
- Retry auto-send on failure

---

### 15. REPORTS (Weekly)

**Route:** `/reports/weekly`

**Purpose:** Automated week-over-week performance aggregation with AI-powered recommendations.

**Data/Fields Displayed:**
- Executive summary with overall conversion rate
- AI strategic focus insight (from rejection analysis)
- Channel conversion breakdown grid:
  - Touches per channel
  - Response rate per channel

**User Actions:**
- Copy executive report to clipboard
- Refresh data

---

### 16. REPORTS (Monthly)

**Route:** `/reports/monthly`

**Purpose:** Long-term conversion analysis, domain rankings, and strategic partnership trends.

**Data/Fields Displayed:**
- Top converting sectors/domains (3-card grid):
  - Category name
  - Conversion rate percentage
  - Interested count vs total organisations

**User Actions:**
- Copy monthly summary to clipboard
- Refresh data

---

### 17. SETTINGS (Hub)

**Route:** `/settings`

**Purpose:** Settings hub linking to sub-configuration pages.

**Configuration Cards:**

| Card | Description | Links To |
|------|-------------|----------|
| Personal Profile & Credentials | User profile management | `/profile` |
| Automated Backups & Cloud Sync | Backup configuration | `/settings/backups` |
| Notification Center & Cadence Reminders | Notification preferences | `/settings/notifications` |
| Security State & Audit Trail | Audit logs | `/settings/audit` |

**User Actions:**
- Click any card to navigate to its configuration page

---

### 18. PROFILE

**Route:** `/profile`

**Purpose:** Personal profile page for viewing and editing user information, performance metrics, security settings, and role/permissions.

**Tabs:**

#### A. Overview Tab
- Hero Banner: Avatar, name, role badge, email, phone, join date, active status
- 4 Stat Cards:
  - Assigned Organisations
  - Assigned Contacts
  - Total Activities Logged
  - Pending Follow-ups (with overdue warning)
- Today's Outreach metrics:
  - Calls, Emails, Meetings, Responses, Interested, Follow-ups Done
- Last 7 Days Outreach metrics
- Daily Outreach Targets (if configured):
  - Target vs actual for Calls, Emails, Meetings, Organisations
- Recent Outreach activity feed:
  - Type, organisation, contact, email subject, notes, outcome, date

#### B. Edit Profile Tab
- Full Name (editable)
- Email (disabled/read-only)
- Phone Number (editable)
- Avatar Color swatch picker (8 colors)

#### C. Security Tab
- Change Password form:
  - Current password
  - New password (8-char minimum)
  - Confirm password

#### D. Role & Permissions Tab
- Describes permissions for the user's role with checkmark lists

**User Actions:**
- Switch between 4 tabs
- Edit profile details
- Save profile changes
- Change password
- View role permissions

---

### 19. NOTIFICATION SETTINGS

**Route:** `/settings/notifications`

**Purpose:** Configure in-app reminders for follow-ups, upcoming meetings, new assignments, and backup alerts.

**Settings Sections:**

#### A. Follow-up & Outreach Reminders

| Setting | Type | Description |
|---------|------|-------------|
| Follow-up Reminders | Toggle | Receive notifications when follow-up is scheduled |
| Default Reminder Timing | Dropdown | On the due date (Morning) OR 1 day before |
| Overdue Reminders | Toggle | Highlight uncompleted follow-ups (URGENT) |

#### B. Meetings & Team Assignments

| Setting | Type | Description |
|---------|------|-------------|
| Meeting Reminders | Toggle | Notification 1 day in advance |
| Assignment Notifications | Toggle | Notify when assigned new organisation |

#### C. Backup & Data Health Alerts

| Setting | Type | Description |
|---------|------|-------------|
| Weekly Backup Status Alerts | Toggle | Notify on backup completion/failure |

**User Actions:**
- Toggle each notification type
- Select reminder timing
- Save preferences

---

### 20. BACKUPS SETTINGS

**Route:** `/settings/backups`

**Purpose:** Automated weekly multi-sheet Excel backups with Google Drive storage and relational integrity.

**Sections:**

#### A. Latest Backup Health Banner
- Status badge (Successful/Drive Upload Pending/Attention Required)
- Generation date/time
- Records summary:
  - Organisations count
  - Contacts count
  - Activities count
  - File size
- File name
- Actions: Open in Google Drive, Download Backup

#### B. Automatic Schedule Card

| Field | Description |
|-------|-------------|
| Cadence | Every [Day] |
| Time | [Time] (IST) |
| Retention | [N] weekly files |
| Format | Multi-Sheet .xlsx |
| Google Drive Status | Connected/Pending config |

#### C. Backup History Table

| Column | Description |
|--------|-------------|
| Backup Date | Date/time |
| File Name | Excel filename |
| Size | File size |
| Records | Org/Contact/Activity counts |
| Status | Success/Local Only/Processing/Failed |
| Google Drive | Open link |
| Actions | Download button |

#### D. Backup Schedule & Google Drive Settings Form

| Field | Description |
|-------|-------------|
| Backup Day | Dropdown (Saturday recommended) |
| Backup Time (IST) | Time picker |
| Retention | Number (4-52 weekly backups) |
| Google Drive Folder ID | Target folder ID |
| Service Account Email | Google Cloud service account |
| Private Key (PEM) | Leave blank to keep existing |

**User Actions:**
- Refresh data
- Create backup now
- Test Google Drive connection
- Save settings
- Download backup files
- Open backups in Google Drive

---

### 21. AUDIT LOG

**Route:** `/settings/audit`

**Purpose:** Immutable log of all user activities, status changes, assignments, and data imports.

**Data/Fields Displayed:**

| Column | Description |
|--------|-------------|
| Timestamp | Date/time of event |
| Performer | User avatar + name (or "System") |
| Action | Action type badge |
| Entity | Entity label or type |
| Summary | Description of action |

**User Actions:**
- Refresh logs
- Paginate through history

---

### 22. IMPORT (Redirect)

**Route:** `/import`

**Purpose:** Currently a redirect to `/dashboard`. Import functionality is not exposed as a standalone page.

---

## Global Modals (Available from Shell)

| Modal | Trigger | Purpose |
|-------|---------|---------|
| GlobalSearchDialog | Cmd+K / Ctrl+K | Search across all entities |
| LogActivityModal | "Log Activity" button | Log calls, emails, meetings, LinkedIn, notes |
| CreateOrganisationModal | "New" dropdown | Add new organisation |
| CreateContactModal | "New" dropdown | Add new contact |

---

## RBAC Access Control Summary

| Page | INTERN | TL | OWNER |
|------|--------|-----|-------|
| Dashboard | ✓ | ✓ | ✓ |
| Organisations | ✓ | ✓ | ✓ |
| Organisation Detail | ✓ | ✓ | ✓ |
| Contacts | ✓ | ✓ | ✓ |
| Pipeline | ✓ | ✓ | ✓ |
| Activities | ✓ | ✓ | ✓ |
| Calendar | ✓ | ✓ | ✓ |
| Follow-ups | ✓ | ✓ | ✓ |
| Templates | ✓ | ✓ | ✓ |
| Analytics | ✓ | ✓ | ✓ |
| Profile | ✓ | ✓ | ✓ |
| Settings | ✓ | ✓ | ✓ |
| Team | ✗ | ✓ | ✓ |
| Advanced Analytics | ✗ | ✓ | ✓ |
| EOD Reports | ✗ | ✓ | ✓ |
| Weekly/Monthly Reports | ✓ | ✓ | ✓ |

---

## Key Technical Patterns

1. **Data Fetching:** Server components (dashboard) use direct Prisma calls; client components use `fetch()` to REST API endpoints (`/api/*`).
2. **State Management:** All client pages use React `useState` + `useCallback` + `useEffect`. No external state management library.
3. **Modals:** Global modals live in the shell and are triggered from anywhere. Page-specific modals are local.
4. **Notifications:** `sonner` toast library for success/error feedback.
5. **Styling:** Tailwind CSS with glass-morphism design system (glass-card, glass-panel, rim-highlight classes), dark mode by default with light mode toggle.
6. **AI Integration:** Groq LLaMA 3.3 for executive summaries and insights; deterministic algorithms for priority ranking and funnel analysis.
7. **WhatsApp Integration:** Local automation agent for automated EOD report dispatch via WhatsApp Web.
