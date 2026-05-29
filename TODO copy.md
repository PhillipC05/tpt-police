# TPT Police — Project TODO

National law enforcement management platform. Multi-tenant (Nation → Province → City → Precinct), Next.js 14 + TypeScript + PostgreSQL + Prisma + NextAuth.js + shadcn/ui.

---

## PHASE 1 — Project Foundation

### Setup
- [x] Init Next.js 14 with TypeScript, App Router, Tailwind, ESLint
- [ ] Install and configure shadcn/ui
- [ ] Install Prisma + PostgreSQL adapter
- [ ] Install NextAuth.js
- [ ] Install Zod, bcryptjs, additional utilities
- [ ] Configure path aliases and Prettier
- [ ] Set up `.env.example`

### Multi-Tenant Database Schema
- [ ] `tenants` table (id, name, type: NATION/PROVINCE/CITY/PRECINCT, parent_id)
- [ ] `users` table (id, tenant_id, role, name, email, badge_number, status)
- [ ] `sessions` / NextAuth adapter tables
- [ ] `audit_logs` table (user_id, action, resource, resource_id, timestamp, ip)
- [ ] Prisma migrations baseline

### Authentication (NextAuth.js)
- [ ] Credentials provider (email + password)
- [ ] JWT session with role + tenant_id claims
- [ ] Middleware for route protection by role
- [ ] Role-based redirect on login
- [ ] MFA support (TOTP) for admin and detective roles
- [ ] Session timeout + activity-based expiry

### Core UI Shell
- [ ] Responsive sidebar navigation (role-aware)
- [ ] Top bar (user avatar, notifications, breadcrumb, tenant switcher)
- [ ] Dashboard layout with widget grid
- [ ] Dark/light mode toggle
- [ ] Global search component
- [ ] Notification system (toasts + notification center)

### Super Admin — Tenant Management
- [ ] Onboard Province / City / Precinct
- [ ] Assign tenant admins
- [ ] Platform-wide analytics overview
- [ ] Billing / subscription management
- [ ] System health dashboard

### Docker & Config
- [ ] `Dockerfile` (multi-stage production build)
- [ ] `docker-compose.yml` (app + PostgreSQL + Redis)
- [ ] `.env.example` with all required variables

---

## PHASE 2 — Admin & HR Module

### Staff Directory
- [ ] Staff list with search/filter
- [ ] Staff profile page (badge, rank, department, photo)
- [ ] Hire/onboarding flow
- [ ] Deactivate/terminate staff
- [ ] Staff document uploads → R2/Wasabi
- [ ] Org chart visualization

### Leave & Absence Management
- [ ] Leave request submission
- [ ] Precinct admin approval workflow
- [ ] Leave balance tracking
- [ ] Leave calendar view

### Performance & Disciplinary Records
- [ ] Performance review entry
- [ ] Disciplinary incident log
- [ ] Training certifications tracker (expiry alerts)

---

## PHASE 3 — Shift Scheduling & Payroll

### Shift Scheduling
- [ ] Weekly/monthly roster builder (drag-and-drop calendar)
- [ ] Shift template system
- [ ] Assign officers to shifts
- [ ] Overtime flagging and approval
- [ ] Shift swap requests
- [ ] Schedule change notifications

### Payroll
- [ ] Payroll period management
- [ ] Hours calculation from shift records
- [ ] Overtime rate configuration
- [ ] Allowances and deductions
- [ ] Payslip PDF generation
- [ ] Payroll CSV export

---

## PHASE 4 — Case Management Module

### Case Core
- [ ] Case creation (auto case number, type, description, date/location)
- [ ] Case status workflow: OPEN → ACTIVE → REVIEW → PROSECUTION → CLOSED
- [ ] Assign detective(s) to case
- [ ] Case notes / activity timeline
- [ ] Case search and filter
- [ ] Case list views (assigned to me, by precinct, all)

### Evidence Management
- [ ] Evidence item entry (physical + digital)
- [ ] Chain of custody log (immutable append-only)
- [ ] File uploads → Cloudflare R2 / Wasabi
- [ ] Evidence check-in / check-out
- [ ] Evidence room inventory view
- [ ] Storage location tagging

### Person Profiles (Suspects & Witnesses)
- [ ] Person record (name, DOB, ID, photo, contact)
- [ ] Role on case: suspect / witness / victim / person of interest
- [ ] Prior case history
- [ ] Statement recording
- [ ] Mugshot / photo gallery

### Inter-Precinct Case Sharing
- [ ] Request access to another precinct's case
- [ ] Precinct admin approval
- [ ] Shared read access with audit log
- [ ] Joint investigation mode

### Court & Prosecution Handoff
- [ ] Case file packager
- [ ] Court submission PDF generation
- [ ] Prosecution reference number tracking
- [ ] Handoff status workflow
- [ ] Court date calendar

---

## PHASE 5 — ERP Module

### Fleet Management
- [ ] Vehicle inventory (make, model, year, plate, VIN, status)
- [ ] Assign vehicle to officer/unit
- [ ] Maintenance log
- [ ] Fuel log
- [ ] Vehicle incident log
- [ ] Service due alerts

### Equipment & Asset Tracking
- [ ] Asset catalog (weapons, radios, body cams, uniforms, etc.)
- [ ] Issue asset to officer (with acknowledgment)
- [ ] Return asset log
- [ ] Condition tracking
- [ ] Asset audit (issued vs on-hand)
- [ ] QR code / barcode generation

### Budget & Finance
- [ ] Departmental budget per financial year
- [ ] Budget categories
- [ ] Purchase order creation and approval workflow
- [ ] Expense claim submission and approval
- [ ] Budget vs actual spend dashboard
- [ ] Financial reports (PDF/CSV export)

---

## PHASE 6 — Dispatch Integration Module

### API Bridge
- [ ] Define dispatch API contract
- [ ] `DispatchService` adapter
- [ ] Inbound webhook handler
- [ ] Outbound webhook support
- [ ] Service-to-service authentication

### Live Operations Dashboard
- [ ] Real-time incident feed (WebSocket / SSE)
- [ ] Officer/unit status board
- [ ] Active incidents map view
- [ ] Incident-to-case auto-link
- [ ] Officer GPS location display

---

## PHASE 7 — Public Portal

### Crime Map
- [ ] Public map page (no login required)
- [ ] Anonymized incident data display
- [ ] Filter by incident type and date range
- [ ] Heatmap overlay
- [ ] Admin privacy controls

### Tip Submission
- [ ] Anonymous tip form
- [ ] Tip categorization
- [ ] Tip routing to relevant precinct
- [ ] Acknowledgment email

### FOIA / Records Request Portal
- [ ] Request form + reference number
- [ ] Status tracking (public, no login)
- [ ] Precinct admin review & response workflow
- [ ] Response with documents or denial
- [ ] Deadline tracking (compliance timer)

---

## PHASE 8 — Reporting & Analytics

- [ ] Crime statistics dashboard (by type, location, time)
- [ ] Case resolution rates
- [ ] Officer performance metrics
- [ ] Asset utilization summary
- [ ] Province/city/national trend dashboards
- [ ] Cross-precinct comparisons
- [ ] Custom report builder
- [ ] Export (PDF, CSV, Excel)
- [ ] Scheduled report emails

---

## PHASE 9 — Compliance, Security & Hardening

- [ ] Immutable audit log (all data access + mutations)
- [ ] Audit log viewer (filterable, exportable)
- [ ] Data retention policies (per-tenant config)
- [ ] GDPR-style data deletion / export
- [ ] Session audit (active sessions, force logout)
- [ ] Rate limiting on all API routes
- [ ] Zod validation on all forms/APIs
- [ ] CSRF protection
- [ ] Content Security Policy headers
- [ ] File upload validation (type, size, malware scan)
- [ ] Secrets management

---

## PHASE 10 — Deployment & DevOps

- [ ] Dockerfile (multi-stage build)
- [ ] Docker Compose (app + PostgreSQL + Redis)
- [ ] GitHub Actions CI/CD (lint → test → build → deploy)
- [ ] Prisma migration strategy for CI
- [ ] Environment configs (dev / staging / prod / gov-cloud)
- [ ] Health check endpoint (`/api/health`)
- [ ] Structured JSON logging
- [ ] Monitoring setup
