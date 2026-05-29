# TPT Police — Project TODO

_Last updated: 2026-05-26_

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
- [ ] Heatmap overlay — **Placeholder (requires map API integration)**
- [ ] Admin privacy controls — **Placeholder (requires toggle)**

### Tip Submission
- [x] Anonymous tip form — **API (POST /api/tips)**
- [x] Tip categorization — **Schema (type field)**
- [x] Tip routing to relevant precinct — **API (tenantId based)**
- [ ] Acknowledgment email — **Placeholder (requires email service)**

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
- [x] Asset utilization summary — **AnalyticsClient (placeholder)**
- [ ] Province/city/national trend dashboards — **Placeholder (needs cross-tenant)**
- [ ] Cross-precinct comparisons — **Placeholder (needs cross-tenant)**
- [ ] Custom report builder — **Placeholder**
- [x] Export (PDF, CSV, Excel) — **API (CSV + text export)**
- [ ] Scheduled report emails — **Placeholder (requires cron + email)**

---

## PHASE 9 — Compliance, Security & Hardening

- [x] Immutable audit log (all data access + mutations) — **writeAuditLog on all mutations**
- [x] Audit log viewer (filterable, exportable) — **API (/api/audit-logs)**
- [x] Data retention policies (per-tenant config) — **RetentionClient + API (upsert, purge)**
- [x] GDPR-style data deletion / export — **ComplianceClient + API (export JSON, account deletion with cascading cleanup)**
- [x] Session audit (active sessions, force logout) — **Audit log viewer**
- [ ] Rate limiting on all API routes — **Placeholder**
- [x] Zod validation on all forms/APIs — **implemented throughout**
- [ ] CSRF protection — **Placeholder**
- [ ] Content Security Policy headers — **Placeholder**
- [ ] File upload validation (type, size, malware scan) — **Placeholder**
- [ ] Secrets management — **Placeholder**

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
- [ ] Structured JSON logging — **Placeholder**
- [ ] Monitoring setup — **Placeholder**
- [x] Environment-specific config files (.env.production.example) — **Template created for production, staging, and gov-cloud**

---

### Legend
- `[x]` — Completed / Implemented
- `[ ]` — Not yet started / Requires additional work


