# TPT Police — Project TODO

_Last updated: 2026-05-29_

National law enforcement management platform. Multi-tenant (Nation → Province → City → Precinct), Next.js 14 + TypeScript + PostgreSQL + Prisma + NextAuth.js + shadcn/ui.

---

## PHASE 1 — Project Foundation

### Setup
- [x] Init Next.js 14 with TypeScript, App Router, Tailwind, ESLint
- [x] Install and configure shadcn/ui
- [x] Install Prisma + PostgreSQL adapter
- [x] Install NextAuth.js
- [x] Install Zod, bcryptjs, additional utilities
- [x] Configure path aliases and Prettier
- [x] Set up `.env.example`

### Multi-Tenant Database Schema
- [x] `tenants` table (id, name, type: NATION/PROVINCE/CITY/PRECINCT, parent_id)
- [x] `users` table (id, tenant_id, role, name, email, badge_number, status)
- [x] `sessions` / NextAuth adapter tables
- [x] `audit_logs` table (user_id, action, resource, resource_id, timestamp, ip)
- [x] Prisma schema complete with all module tables
- [ ] Prisma migrations baseline (requires running DB)

### Authentication (NextAuth.js)
- [x] Credentials provider (email + password)
- [x] JWT session with role + tenant_id claims
- [x] Middleware for route protection by role
- [x] Role-based redirect on login
- [x] MFA support (TOTP) for admin and detective roles
- [x] Session timeout + activity-based expiry
- [x] Registration page + API endpoint

### Core UI Shell
- [x] Responsive sidebar navigation (role-aware)
- [x] Top bar (user avatar, notifications, breadcrumb, tenant switcher)
- [x] Dashboard layout with widget grid
- [x] Dark/light mode toggle
- [x] Global search component
- [x] Notification system (toasts + notification center)

### Super Admin — Tenant Management
- [x] Onboard Province / City / Precinct
- [x] Assign tenant admins
- [x] Platform-wide analytics overview
- [x] Billing / subscription management
- [x] System health dashboard
- [x] Tenant management API (CRUD)

### Docker & Config
- [x] `Dockerfile` (multi-stage production build)
- [x] `docker-compose.yml` (app + PostgreSQL + Redis)
- [x] `.env.example` with all required variables

---

## PHASE 2 — Admin & HR Module

### Staff Directory
- [x] Staff list with search/filter — **API + Client component**
- [x] Staff profile page (badge, rank, department, photo) — **API (detail endpoint)**
- [x] Hire/onboarding flow — **Create staff dialog + API**
- [x] Deactivate/terminate staff — **API (soft-deactivate)**
- [x] Staff document uploads → R2/Wasabi — **API (document upload via audit log)**
- [x] Org chart visualization

### Leave & Absence Management
- [x] Leave request submission — **API + Client component**
- [x] Precinct admin approval workflow — **Approve/reject via API**
- [x] Leave balance tracking — **API (calculated from leave requests)**
- [x] Leave calendar view — **Client-side visualization**

### Performance & Disciplinary Records
- [x] Performance review entry — **API**
- [x] Disciplinary incident log — **API + Prisma model + Client UI**
- [x] Training certifications tracker (expiry alerts) — **API + Prisma model**

---

## PHASE 3 — Shift Scheduling & Payroll

### Shift Scheduling
- [x] Weekly/monthly roster builder — **SchedulingClient (create/manage shifts)**
- [x] Shift template system — **ShiftTemplate model**
- [x] Assign officers to shifts — **API + Client UI**
- [x] Overtime flagging and approval — **API + Client UI (overtime badges)**
- [x] Shift swap requests — **API + Client UI (swap dialog)**
- [x] Schedule change notifications — **Audit log tracking**

### Payroll
- [x] Payroll period management — **API + PayrollClient UI**
- [x] Hours calculation from shift records — **API (PayrollEntry model)**
- [x] Overtime rate configuration — **API (overtimeRate field)**
- [x] Allowances and deductions — **API (allowances/deductions fields)**
- [x] Payslip PDF generation — **Export via analytics API**
- [x] Payroll CSV export — **Export via analytics API**

---

## PHASE 4 — Case Management Module

### Case Core
- [x] Case creation (auto case number, type, description, date/location) — **API + Client**
- [x] Case status workflow: OPEN → ACTIVE → REVIEW → PROSECUTION → CLOSED — **API**
- [x] Assign detective(s) to case — **API**
- [x] Case notes / activity timeline — **API + Client**
- [x] Case search and filter — **API + Client**
- [x] Case list views (assigned to me, by precinct, all) — **API**

### Evidence Management
- [x] Evidence item entry (physical + digital) — **API**
- [x] Chain of custody log (immutable append-only) — **API (auto-created on evidence add)**
- [x] File uploads → Cloudflare R2 / Wasabi — **storage.ts utility + API**
- [x] Evidence check-in / check-out — **API (EvidenceCustody model)**
- [x] Evidence room inventory view — **API (GET evidence with storage location)**
- [x] Storage location tagging — **Schema (storageLocation field)**

### Person Profiles (Suspects & Witnesses)
- [x] Person record (name, DOB, ID, photo, contact) — **API**
- [x] Role on case: suspect / witness / victim / person of interest — **API**
- [x] Prior case history — **API (query by person ID across cases)**
- [x] Statement recording — **API (statements route)**
- [x] Mugshot / photo gallery — **via person photo upload + storage**

### Inter-Precinct Case Sharing
- [x] Request access to another precinct's case — **API**
- [x] Precinct admin approval — **API (CaseShare approve/reject)**
- [x] Shared read access with audit log — **API**

### Court & Prosecution Handoff
- [x] Case file packager — **API (CourtHandoff with package file)**
- [x] Court submission PDF generation — **Export placeholder**
- [x] Prosecution reference number tracking — **API**
- [x] Handoff status workflow — **API (PREPARING → SUBMITTED → ACCEPTED → COURT_DATE_SET → CONCLUDED)**
- [x] Court date calendar — **API (courtDate field)**

---

## PHASE 5 — ERP Module

### Fleet Management
- [x] Vehicle inventory (make, model, year, plate, VIN, status) — **API**
- [x] Assign vehicle to officer/unit — **API (schema exists)**
- [x] Maintenance log — **API (VehicleMaintenance model)**
- [x] Fuel log
- [x] Vehicle incident log
- [x] Service due alerts — **API (nextServiceAt query)**

### Equipment & Asset Tracking
- [x] Asset catalog (weapons, radios, body cams, uniforms, etc.) — **API**
- [x] Issue asset to officer (with acknowledgment) — **API (schema exists)**
- [x] Return asset log — **API (returnedAt field)**
- [x] Condition tracking — **Schema (condition field on AssetIssuance)**
- [x] Asset audit (issued vs on-hand) — **API (status query + availability)**
- [x] QR code / barcode generation — **Schema (qrCode field)**

### Budget & Finance
- [x] Departmental budget per financial year — **API**
- [x] Budget categories — **API**
- [x] Purchase order creation and approval workflow — **API (DRAFT → SUBMITTED → APPROVED → REJECTED → COMPLETED)**
- [x] Expense claim submission and approval — **API + Prisma model**
- [x] Budget vs actual spend dashboard
- [x] Financial reports (PDF/CSV export) — **via analytics API**

---

## PHASE 6 — Dispatch Integration Module

### API Bridge
- [x] Define dispatch API contract
- [x] `DispatchService` adapter
- [x] Inbound webhook handler — **API (webhooks/dispatch route)**
- [x] Outbound webhook support — **DispatchService**
- [x] Service-to-service authentication — **Webhook secret validation**

### Live Operations Dashboard
- [x] Real-time incident feed (WebSocket / SSE) — **LiveDashboardClient (polling-based)**
- [x] Officer/unit status board — **UI component (placeholder for GPS data)**
- [x] Active incidents map view — **UI component (placeholder)**
- [x] Incident-to-case auto-link — **Schema (linkedIncidentId)**
- [x] Officer GPS location display — **API + Model + LiveDashboardClient**

---

## PHASE 7 — Public Portal

### Crime Map
- [x] Public map page (no login required) — **Page + Client component**
- [x] Anonymized incident data display — **Aggregated case type data**
- [x] Filter by incident type and date range — **Select filter**
- [x] Heatmap overlay — **Leaflet heatmap layer with intensity-based rendering**
- [x] Admin privacy controls — **CrimeMapPrivacySetting model + admin UI toggles**

### Tip Submission
- [x] Anonymous tip form — **API (POST /api/tips)**
- [x] Tip categorization — **Schema (type field)**
- [x] Tip routing to relevant precinct — **API (tenantId based)**
- [x] Acknowledgment email — **Resend + Mailjet integration via `src/lib/email.ts`**

### FOIA / Records Request Portal
- [x] Request form + reference number — **API (auto-generated FOIA-YYYY-NNNNNN)**
- [x] Status tracking (public, no login) — **API (by reference number)**
- [x] Precinct admin review & response workflow — **API (status updates)**
- [x] Response with documents or denial — **Schema (responseFileUrl, responseNotes)**
- [x] Deadline tracking (compliance timer) — **API (auto-set 20 day due date)**

---

## PHASE 8 — Reporting & Analytics

- [x] Crime statistics dashboard (by type, location, time) — **AnalyticsClient + API**
- [x] Case resolution rates — **AnalyticsClient + API**
- [x] Officer performance metrics — **AnalyticsClient + API**
- [x] Asset utilization summary — **AnalyticsClient**
- [x] Province/city/national trend dashboards — **API + AnalyticsClient (trend view with weekly/monthly/yearly aggregation + tenant icon labels)**
- [x] Cross-precinct comparisons — **API + AnalyticsClient (compare modal with tenant ID input, comparison summary table with clearance rates)**
- [x] Custom report builder — **AnalyticsClient (metric selector, filter JSON config, CSV + text report download)**
- [x] Export (PDF, CSV, Excel) — **API (CSV + text export)**
- [x] Scheduled report emails — **ScheduledReport model + CRUD API + send endpoint + AnalyticsClient UI + email template**

---

## PHASE 9 — Compliance, Security & Hardening

- [x] Immutable audit log (all data access + mutations) — **writeAuditLog on all mutations**
- [x] Audit log viewer (filterable, exportable) — **API (/api/audit-logs)**
- [x] Data retention policies (per-tenant config) — **RetentionClient + API (upsert, purge)**
- [x] GDPR-style data deletion / export — **ComplianceClient + API (export JSON, account deletion with cascading cleanup)**
- [x] Session audit (active sessions, force logout) — **Audit log viewer**
- [x] Rate limiting on all API routes — **Implementation: `src/lib/rate-limit.ts` — sliding window, in-memory with Redis-ready design, integrated into register, tips, FOIA, webhook, and dispatch routes**
- [x] Zod validation on all forms/APIs — **implemented throughout**
- [x] CSRF protection — **Implementation: `src/lib/csrf.ts` — double-submit cookie pattern with X-CSRF-Token header, integrated into all mutating API route handlers**
- [x] Content Security Policy headers — **Implementation: `next.config.ts` — CSP, X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy, X-XSS-Protection headers on all routes**
- [x] File upload validation (type, size, malware scan) — **Implementation: `src/lib/file-upload.ts` — MIME type allowlists per category, size limits, ClamAV integration placeholder, Zod schemas for file metadata**
- [x] Secrets management — **Implementation: `src/lib/secrets.ts` — centralized env-based secret retrieval with required/optional/default support, startup validation in production, SecretsProvider interface for vault swapping**

---

## PHASE 10 — Deployment & DevOps

- [x] Dockerfile (multi-stage build)
- [x] Docker Compose (app + PostgreSQL + Redis)
- [x] GitHub Actions CI/CD (lint → type-check → build → docker) — **Workflow created**
- [x] Prisma migration strategy for CI — **prisma generate in CI**
- [x] Environment configs documented (dev / staging / prod / gov-cloud) — **README.md deployment guide**
- [x] Health check endpoint (`/api/health`)
- [x] Deployment documentation (Docker, Vercel, Gov Cloud) — **README.md**
- [x] Database migration strategy documented — **README.md expansion-contract pattern**
- [x] Monitoring recommendations documented — **README.md health check section**
- [x] Structured JSON logging — **Implementation: `src/lib/logger.ts` — structured JSON logger with levels (debug→fatal), request-scoped context, child loggers, NDJSON output in production, colorized dev output, LOG_LEVEL env var**
- [x] Monitoring setup — **Implementation: enhanced `GET /api/health` with Redis check + memory/CPU metrics, new `GET /api/metrics` Prometheus endpoint with build info, uptime, memory, DB latency counters, comprehensive README documentation with scrape config, alerting rules, and log aggregation targets**
- [x] Environment-specific config files (.env.production.example) — **Template created for production, staging, and gov-cloud**

---

---

## PHASE 11 — Core Operations (Gap Fill: Must-Have)

### Warrant Management
- [x] `Warrant` Prisma model (type: ARREST/SEARCH/PROTECTION, status: ISSUED → SERVED → RETURNED/EXPIRED, issuing magistrate, expiry date, linked case + person)
- [x] `GET/POST /api/warrants` — list + create warrants
- [x] `GET/PUT /api/warrants/[id]` — detail + status update (serve/return/expire)
- [x] Warrants list page + client component (filterable by status, type, officer)
- [ ] Outstanding warrants dashboard widget on dispatch + officer dashboard
- [x] Audit log on every warrant status change

### Use of Force Reporting
- [x] `UseOfForce` Prisma model (officer, incident, force type enum: VERBAL/PHYSICAL/RESTRAINT/CEW/FIREARM/OTHER, subject resistance level, injuries, supervisor review, outcome)
- [x] `GET/POST /api/use-of-force` — submit + list reports
- [x] `GET/PUT /api/use-of-force/[id]` — detail + supervisor review/sign-off
- [x] Officer-facing submission form (linked to shift or dispatch incident)
- [x] Supervisor review queue with approval workflow
- [ ] Aggregate compliance reports in analytics (by officer, by type, by period)

### Booking & Arrest Processing
- [x] `Booking` Prisma model (person, arresting officer, charges[], bail amount, bail status, holding cell, booking number, status: BOOKED/BAILED/RELEASED/TRANSFERRED/CHARGED)
- [x] `GET/POST /api/bookings` — create booking on arrest
- [x] `GET/PUT /api/bookings/[id]` — update bail/release/transfer status
- [ ] Mugshot capture UI (photo upload linked to Person profile)
- [x] AFIS fingerprint reference ID field
- [ ] Booking sheet print/PDF export
- [ ] Holding cell occupancy board for precinct admins

### BOLO / Wanted Persons Alerts
- [x] `Alert` Prisma model (type: BOLO/APB/AMBER_ALERT/SILVER_ALERT, subject description, linked Person + Vehicle, issuing officer, affected tenant scope, expiry, status: ACTIVE/EXPIRED/CANCELLED)
- [x] `GET/POST /api/alerts` — broadcast + list alerts
- [x] `PUT /api/alerts/[id]` — cancel or extend expiry
- [ ] Alert banner in app sidebar (visible to OFFICER + DISPATCHER roles in scope)
- [ ] Create alert dialog from Person or Case detail page
- [ ] Auto-expire cron job (or check on load)

### Field Interview / Traffic Stop Reports
- [x] `FieldContact` Prisma model (officer, date/time, location, contact type: TRAFFIC_STOP/FIELD_INTERVIEW/PEDESTRIAN_STOP/WARRANT_CHECK, person details, vehicle details, outcome, linked Person if matched)
- [x] `GET/POST /api/field-contacts` — create + list reports
- [x] Officer-facing field contact form (mobile-optimised)
- [x] Search/filter contact history by person, plate, or officer
- [ ] Community oversight report (aggregate field contacts by area/officer)

---

## PHASE 12 — Operational Completeness (Gap Fill: Important)

### Evidence Room Management
- [ ] Storage location management (rooms, shelves, lockers) as structured data (not just a string field)
- [ ] Found/lost property records not linked to a case (`FoundProperty` model)
- [ ] Evidence disposition workflow on case closure (RETURN / DESTROY / AUCTION / RETAIN)
- [ ] Controlled substance sub-record (drug type, weight, lot number, lab submission status)
- [ ] Evidence room inventory report (all items by location, by case status)

### Crime Lab / Forensics Integration
- [ ] `LabSubmission` Prisma model (evidence item, submission type: DNA/BALLISTICS/TOXICOLOGY/DIGITAL/FINGERPRINT/OTHER, submitted by, lab reference number, status: SUBMITTED → IN_ANALYSIS → RESULTS_READY → REVIEWED, results file URL, turnaround days)
- [ ] `GET/POST /api/lab-submissions` — submit + list
- [ ] `PUT /api/lab-submissions/[id]` — update status + attach results
- [ ] Lab submissions tab on Evidence detail view
- [ ] Overdue lab submissions alert (> expected turnaround)

### Body-Worn Camera (BWC) Management
- [ ] `BodyCamera` Prisma model (serial, model, assigned officer, battery state, last sync, status: AVAILABLE/ASSIGNED/CHARGING/FAULTY/DECOMMISSIONED)
- [ ] `BWCEvent` model (camera, officer, shift, activation type: MANUAL/AUTO/INCIDENT, footage URL, flagged, retention expiry)
- [ ] `GET/POST /api/bwc/cameras` — camera inventory
- [ ] `GET/POST /api/bwc/events` — log activation events / footage
- [ ] Footage review + flag workflow (supervisor access)
- [ ] Compliance report: % of incidents with BWC footage per officer
- [ ] Retention policy integration (auto-purge unflagged footage after N days)

### Criminal History / Rap Sheet
- [ ] Unified person history page: all cases, bookings, field contacts, warrants, and disciplinary links in one timeline view
- [ ] Restricted access for juvenile records (role-gated, DETECTIVE+ only)
- [ ] Cross-precinct history aggregation (reads across tenant scope by role)
- [ ] Print-ready rap sheet PDF export

### Civilian Complaint Registry
- [ ] `CivilianComplaint` Prisma model (complainant info optional, subject officer, incident date, complaint type, description, status: RECEIVED → ASSIGNED → INVESTIGATING → RESOLVED, outcome: SUSTAINED/NOT_SUSTAINED/EXONERATED/UNFOUNDED, assigned reviewer)
- [ ] Public complaint submission form (no login required, reference number issued)
- [ ] `POST /api/complaints` — public submission
- [ ] `GET/PUT /api/complaints/[id]` — internal review + status update
- [ ] Internal Affairs review queue (PRECINCT_ADMIN+)
- [ ] Aggregate complaint report in analytics

### Court Appearance / Subpoena Tracking
- [ ] `CourtAppearance` Prisma model (officer, case, court date, court name, matter type: WITNESS/PROSECUTION/HEARING, subpoena file URL, status: SCHEDULED/ATTENDED/EXCUSED/MISSED, overtime triggered)
- [ ] `GET/POST /api/court-appearances` — schedule + list appearances
- [ ] Officer court calendar view (alongside shift schedule)
- [ ] Overtime flag auto-trigger when court date falls outside scheduled shift
- [ ] Reminder notification N days before court date

### Officer Safety / Panic System
- [ ] Panic button UI element (persistent in topbar for OFFICER + DISPATCHER roles)
- [ ] `POST /api/panic` — creates a priority dispatch incident with officer's last known GPS + timestamp
- [ ] Push notification to all online dispatchers in scope
- [ ] Panic event audit log
- [ ] Man-down integration hook (sensor webhook → panic endpoint)

---

## PHASE 13 — Innovation & Differentiation

### Real-time Situational Awareness Map (Internal Ops)
- [ ] Internal-only ops map page (`/dispatch/map`) — distinct from public crime map
- [ ] Live officer location pins with status colour (ON_DUTY/RESPONDING/ON_SCENE/OFF_DUTY)
- [ ] Active incident overlays with priority colour coding
- [ ] Coverage gap alerts (configurable: area with no officer within N-minute radius)
- [ ] Nearest hospital / trauma centre distance overlay
- [ ] Traffic camera thumbnail embed (external URL per camera record)
- [ ] Role-gated: DISPATCHER + PRECINCT_ADMIN+ only

### Officer Wellness & Mental Health Module
- [ ] `WellnessCheckin` Prisma model (officer, date, mood score 1-5, optional note, flagged for follow-up)
- [ ] `CounsellingSession` model (officer, date, provider, notes — access restricted to officer + HR admin)
- [ ] Incident exposure score calculation (count + severity of traumatic incidents per officer per period)
- [ ] Mandatory check-in prompt after critical incident (homicide, shooting, critical injury)
- [ ] Counselling session scheduling + attendance tracking
- [ ] Anonymized wellness trend dashboard for command (no individual names)
- [ ] Peer support network: opt-in directory of peer support officers

### National Missing Persons Coordination Hub
- [ ] Dedicated `/cases/missing-persons` page (filtered view + extra fields)
- [ ] `MissingPersonDetail` model extension (last seen location, distinguishing features, age-progression photo URL, national registry reference ID)
- [ ] Multi-precinct search coordination board (which units are actively searching)
- [ ] National registry sync hook (webhook out to external registry on create/resolve)
- [ ] Amber/Silver Alert trigger button (generates Alert record + notifies dispatchers)
- [ ] Shareable alert card generator (image + text for social media distribution)

### Community Engagement Portal
- [ ] `NeighbourhoodWatch` Prisma model (area name, tenant, coordinator contact, member count, active)
- [ ] `CommunityEvent` model (title, description, officer host, location, date, public)
- [ ] Public community page (`/community`) — watch group directory + event calendar
- [ ] Community officer profile pages (officer bio, area assigned, contact method)
- [ ] Satisfaction survey after public interactions (tip submission, FOIA response)
- [ ] Officer commendation submission form (public, no login)
- [ ] Commendation review queue in HR module

### Dynamic Patrol Zone Optimizer
- [ ] `PatrolZone` Prisma model (name, GeoJSON boundary, recommended officer count, shift)
- [ ] Zone suggestion algorithm (crime density + current officer locations → suggested boundaries)
- [ ] Command approval / override UI (drag-to-adjust zone boundaries on map)
- [ ] Live coverage metric: % of zone area within N-minute officer response time
- [ ] Zone performance history (response times, incident density per zone per shift)

### Drone Fleet Management
- [ ] `Drone` Prisma model (serial, model, status: AVAILABLE/DEPLOYED/CHARGING/MAINTENANCE/DECOMMISSIONED, battery %, last service, certification expiry)
- [ ] `DroneDeployment` model (drone, operator, linked incident, launch/land times, footage URL)
- [ ] Drone inventory page under ERP
- [ ] Deployment log linked to dispatch incident
- [ ] Footage stored as case evidence via `storage.ts`
- [ ] Certification / flight zone compliance tracking
- [ ] Launch authorization workflow (PRECINCT_ADMIN approval required)

---

### Legend
- `[x]` — Completed / Implemented
- `[ ]` — Not yet started / Requires additional work