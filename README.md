# TPT Police — National Law Enforcement Management Platform

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748)](https://www.prisma.io)

Multi-tenant national police department management platform serving a 4-tier hierarchy: **Nation → Province → City → Precinct**.

Built with Next.js 16, TypeScript, PostgreSQL (Prisma ORM), NextAuth.js v5, and shadcn/ui.

> **Open source under the MIT License.** See [LICENSE](LICENSE).

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Getting Started (Development)](#getting-started-development)
- [Deployment Guide](#deployment-guide)
  - [Prerequisites](#prerequisites)
  - [Docker Deployment (Self-Hosted)](#docker-deployment-self-hosted)
  - [Vercel Deployment](#vercel-deployment)
  - [Government Cloud / Private Cloud Deployment](#government-cloud--private-cloud-deployment)
  - [Environment Configuration (Environments)](#environment-configuration-environments)
- [CI/CD Pipeline](#cicd-pipeline)
- [Health Check & Monitoring](#health-check--monitoring)
- [Database Migrations](#database-migrations)
- [Seed Data](#seed-data)
- [Roles & Permissions](#roles--permissions)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Load Balancer                        │
├─────────────────────────────────────────────────────────┤
│  Next.js App (Docker / Vercel / Gov Cloud)              │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ App Router   │ │ API Routes   │ │ NextAuth.js Auth │  │
│  │ (RSC/SSR)    │ │ (REST)       │ │ (JWT Sessions)   │  │
│  └─────────────┘ └──────────────┘ └──────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  PostgreSQL 16 (Primary DB - Prisma ORM)                │
│  Redis 7 (Session cache, optional rate limiting)        │
├─────────────────────────────────────────────────────────┤
│  Cloudflare R2 / Wasabi (File/Object Storage)           │
│  SMTP (Email notifications, FOIA responses)             │
└─────────────────────────────────────────────────────────┘
```

### Multi-Tenancy Model

The platform supports a 4-tier tenant hierarchy:
- **NATION** — Super Admin view, cross-tenant analytics
- **PROVINCE** — Province-level admin over cities and precincts
- **CITY** — City-level admin over precincts
- **PRECINCT** — Individual precinct operations (cases, HR, ERP, dispatch)

All data is scoped by `tenantId`. Cross-tier read access is granted by role hierarchy (e.g., a Province Admin can view any precinct within that province).

---

## Tech Stack

| Layer         | Technology                                              |
|---------------|---------------------------------------------------------|
| **Framework** | Next.js 16 (App Router, RSC + Server Actions)          |
| **Language**  | TypeScript 5                                            |
| **UI**        | shadcn/ui + Tailwind CSS v4 + Sonner (toasts)          |
| **Auth**      | NextAuth.js v5 (beta) — Credentials + JWT + MFA (TOTP) |
| **ORM**       | Prisma 6 + PostgreSQL 16                                |
| **Validation**| Zod 4 — all API routes and forms                        |
| **Storage**   | Cloudflare R2 + Wasabi (abstracted via `StorageService`)|
| **Cache**     | Redis 7                                                 |
| **Container** | Docker — multi-stage build (node:20-alpine)            |
| **CI/CD**     | GitHub Actions (lint → type-check → build → docker)    |

---

## Getting Started (Development)

### Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL + Redis)
- npm

### Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/tpt-police.git
cd tpt-police

# 2. Copy environment variables
cp .env.example .env.local

# 3. Start PostgreSQL and Redis
docker-compose up -d db redis

# 4. Install dependencies
npm install

# 5. Run database migrations
npx prisma migrate dev

# 6. (Optional) Seed the database with demo data
npx prisma db seed

# 7. Start development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Development Commands

| Command               | Description                          |
|-----------------------|--------------------------------------|
| `npm run dev`         | Start development server             |
| `npm run build`       | Production build                     |
| `npm run start`       | Start production server              |
| `npm run lint`        | Run ESLint                           |
| `npx prisma studio`   | Open Prisma Studio (DB GUI)          |
| `npx prisma migrate dev`| Create and apply migrations       |
| `npx prisma generate` | Regenerate Prisma client             |

---

## Deployment Guide

### Prerequisites

Before deploying, ensure you have:

1. **PostgreSQL 16** database instance (RDS, Cloud SQL, self-hosted, etc.)
2. **Redis 7** instance (ElastiCache, Memorystore, self-hosted, etc.)
3. **Object Storage** — Cloudflare R2 and/or Wasabi account for file uploads
4. **SMTP Service** — For email notifications (FOIA responses, alerts, etc.)
5. **A domain name** with SSL/TLS certificate

### Environment Variables

All required environment variables are documented in [`.env.example`](.env.example). Copy it to `.env.local` and fill in your values.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `NEXTAUTH_URL` | ✅ | Public URL of the app (no trailing slash) |
| `NEXTAUTH_SECRET` | ✅ | Random 32+ char secret for JWT signing |
| `STORAGE_PROVIDER` | ✅ | `r2` or `wasabi` |
| `R2_*` / `WASABI_*` | ✅ | Object storage credentials |
| `DISPATCH_API_URL` | optional | External CAD system endpoint |
| `DISPATCH_API_KEY` | optional | CAD API key |
| `DISPATCH_WEBHOOK_SECRET` | optional | Inbound webhook validation |
| `RESEND_API_KEY` | optional | Email via Resend (primary) |
| `MAILJET_API_KEY` + `MAILJET_SECRET_KEY` | optional | Email via Mailjet (fallback) |
| `REDIS_URL` | optional | Required for multi-instance rate limiting |
| `OLLAMA_BASE_URL` | optional | Local Ollama AI endpoint (for AI features) |
| `OPENROUTER_API_KEY` | optional | OpenRouter AI key (alternative to Ollama) |
| `ANPR_API_URL` + `ANPR_API_KEY` | optional | Number plate lookup API |
| `CLAMD_HOST` | optional | ClamAV host for malware scanning |
| `LOG_LEVEL` | optional | `debug`/`info`/`warn`/`error` (default: `info`) |

> AI features (FOIA drafting, shift briefs) work with either Ollama **or** OpenRouter. Leave both unset to disable AI entirely.

### Docker Deployment (Self-Hosted)

This is the recommended deployment method for on-premises or government cloud environments.

#### Production Build & Run

```bash
# Build and start all services
docker-compose up -d --build

# Or build just the app image separately
docker build -t tpt-police:latest .
```

#### docker-compose.yml

The included `docker-compose.yml` provisions:
- **PostgreSQL 16** — primary database (persistent volume)
- **Redis 7** — session cache and rate limiting
- **App** — the Next.js application

For production, replace the `.env` file values with your production credentials.

#### Manual Docker Run

```bash
docker build -t tpt-police:latest .
docker run -d \
  --name tpt-police \
  -p 3000:3000 \
  --env-file .env.production \
  --restart unless-stopped \
  tpt-police:latest
```

#### Database Migrations on Docker

For first-time deployment, run migrations inside the container:

```bash
docker exec tpt-police npx prisma migrate deploy
```

For subsequent releases, migrations can be run as part of the CI/CD pipeline before the new container starts.

#### Production Architecture (Docker)

```
┌─────────────────┐
│   Load Balancer  │  (NGINX / Traefik / Cloud LB)
└────────┬─────────┘
         │
┌────────▼─────────┐     ┌──────────────────┐
│  Next.js (App)   │────▶│  PostgreSQL 16    │
│  :3000            │     │  (persistent vol) │
└────────┬─────────┘     └──────────────────┘
         │
┌────────▼─────────┐
│  Redis 7          │
│  (cache/sessions) │
└──────────────────┘
```

For high availability, run multiple app containers behind a load balancer.

---

### Vercel Deployment

Vercel is the simplest deployment option for the app layer. You'll still need external PostgreSQL and Redis instances.

#### Steps

1. **Push your repository** to GitHub/GitLab/Bitbucket
2. **Import the project** in Vercel dashboard
3. **Configure environment variables** in Vercel project settings:
   - Add all variables from `.env.example`
   - Ensure `NEXTAUTH_URL` is your production domain
4. **Deploy** — Vercel will auto-detect Next.js and build

> **Note**: Vercel does not support WebSocket connections natively (they use Serverless Functions). The dispatch live dashboard uses polling, which works fine. If you need real-time WebSockets in the future, consider using a separate WebSocket service or switching to Docker deployment.

#### Vercel + External Services

- **PostgreSQL**: Use RDS, Cloud SQL, or Supabase
- **Redis**: Use Upstash (serverless Redis) or ElastiCache
- **Storage**: R2 / Wasabi remain as-is, accessed via fetch from serverless functions
- **SMTP**: Any SMTP provider (SendGrid, SES, Mailgun, etc.)

---

### Government Cloud / Private Cloud Deployment

For government or private cloud environments (e.g., AWS GovCloud, Azure Government, private data center):

#### Option A: Docker on VM

```bash
# Provision a VM (e.g., AWS EC2, Azure VM, OpenStack)
# Install Docker and Docker Compose
# Copy your .env.production file
# Run:
docker-compose up -d --build
```

#### Option B: Kubernetes (EKS, AKS, GKE, OpenShift)

An example Kubernetes deployment manifests directory should be created at `k8s/`. Key considerations:

- Use **Secrets** for environment variables (not ConfigMaps)
- Use **PersistentVolumeClaims** for PostgreSQL data
- Configure **HorizontalPodAutoscaler** for the app
- Use **Ingress** with TLS termination
- Set up **NetworkPolicies** for security

#### Security Considerations for Government Cloud

1. **All traffic must be encrypted in transit** — enforce HTTPS at the load balancer level
2. **Database encryption at rest** — use encrypted RDS/Cloud SQL instances
3. **Secrets management** — use Azure Key Vault, AWS Secrets Manager, or HashiCorp Vault
4. **Audit logging** — all application mutations are logged in the audit_logs table (immutable)
5. **Network segmentation** — place the app, DB, and Redis in private subnets
6. **Regular backups** — configure automated PostgreSQL backups

---

### Environment Configuration (Environments)

For a robust deployment pipeline, maintain separate environment configurations:

| Environment | Purpose | PostgreSQL | Redis | Domain |
|-------------|---------|-----------|-------|--------|
| `dev` | Local development | Docker Compose | Docker Compose | localhost:3000 |
| `staging` | Pre-production testing | RDS/Cloud SQL | ElastiCache/Memorystore | staging.tptpolice.gov |
| `prod` | Production | RDS/Cloud SQL (multi-AZ) | ElastiCache/Memorystore (replicated) | tptpolice.gov |
| `gov-cloud` | Government cloud | GovCloud RDS | GovCloud ElastiCache | tptpolice.gov.internal |

Use `.env.production`, `.env.staging`, etc. with the appropriate values for each environment.

---

## CI/CD Pipeline

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) with three stages:

1. **Lint & Type Check** — ESLint + TypeScript compilation check
2. **Build Check** — Prisma client generation + Next.js production build
3. **Docker Build** — Multi-stage Docker image build (push: false by default)

To enable Docker image pushes to a registry, add your registry credentials as GitHub Secrets and uncomment the push configuration in `ci.yml`.

### CI Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    # ESLint + tsc type checking
  test:
    # Prisma generate + Next.js build
  docker:
    # Docker multi-stage build
```

---

## Health Check & Monitoring

### Health Endpoint

The app exposes a health check endpoint at `GET /api/health`. It returns JSON with connectivity status for the database and Redis (if configured), plus memory and CPU usage:

```json
{
  "status": "healthy",
  "timestamp": "2026-05-28T00:00:00.000Z",
  "uptime": 12345,
  "service": "tpt-police",
  "version": "0.1.0",
  "environment": "production",
  "checks": {
    "database": { "status": "connected", "latencyMs": 2 },
    "redis": { "status": "connected", "latencyMs": 1 }
  },
  "memory": {
    "heapUsed": 45,
    "heapTotal": 78,
    "rss": 120,
    "unit": "MB"
  },
  "cpu": {
    "loadAvg": { "user": 12345, "system": 6789 }
  }
}
```

Use this endpoint for:
- **Load balancer health checks** (configure to hit `/api/health`)
- **Container orchestration liveness/readiness probes** (Kubernetes `httpGet`)
- **Monitoring tools** (Datadog, New Relic, Prometheus, Grafana)

### Prometheus Metrics Endpoint

A Prometheus-compatible metrics endpoint is available at `GET /api/metrics`. It exposes the following metrics in OpenMetrics text format:

| Metric | Type | Description |
|--------|------|-------------|
| `tpt_police_build_info` | gauge | Build version, Node version, environment |
| `tpt_police_uptime_seconds_total` | counter | Application uptime in seconds |
| `tpt_police_memory_heap_bytes` | gauge | Heap used memory in bytes |
| `tpt_police_memory_heap_total_bytes` | gauge | Heap total memory in bytes |
| `tpt_police_memory_rss_bytes` | gauge | Resident set size in bytes |
| `tpt_police_database_up` | gauge | Database connectivity (1 = connected, 0 = disconnected) |
| `tpt_police_database_latency_ms` | gauge | Database query latency in milliseconds |

**Prometheus scrape config:**
```yaml
scrape_configs:
  - job_name: 'tpt-police'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/metrics'
```

### Structured JSON Logging

In production, the application outputs **newline-delimited JSON (NDJSON)** to stdout/stderr for ingestion by any log aggregation platform:

- **Log levels**: `debug`, `info`, `warn`, `error`, `fatal`
- **Every log entry includes**: `timestamp`, `level`, `message`, `service`, `environment`, and optionally `requestId`, `userId`, `tenantId`, `durationMs`, `statusCode`, `stack`
- **Development mode**: Colorized human-readable output with contextual badges
- **Log level control**: Set `LOG_LEVEL` environment variable (`debug`, `info`, `warn`, `error`, `fatal`). Defaults to `info` in production, `debug` in development.

**Example production log line:**
```json
{"timestamp":"2026-05-28T00:00:00.000Z","level":"info","message":"Request completed","service":"tpt-police","environment":"production","requestId":"abc-123","method":"GET","path":"/api/health","statusCode":200,"durationMs":42}
```

**Integration targets:**
| Platform | Method |
|----------|--------|
| **Datadog** | Agent tailing stdout/stderr |
| **Grafana Loki** | Promtail scraping container logs |
| **AWS CloudWatch** | Container insights / CloudWatch agent |
| **ELK Stack** | Filebeat → Logstash → Elasticsearch |
| **Splunk** | Universal forwarder tailing stdout |
| **Papertrail / Loggly** | Remote syslog forwarding |

### Monitoring Recommendations

- **Uptime monitoring**: Ping `/api/health` every 30 seconds; alert on non-200 responses
- **Metrics scraping**: Configure Prometheus (or Grafana Cloud) to scrape `/api/metrics` every 15s
- **Error tracking**: Integrate Sentry for exception capture and performance tracing
- **Dashboarding**: Import the Prometheus metrics into Grafana for real-time dashboards (memory, DB latency, uptime)
- **Log aggregation**: Route container stdout/stderr to your logging platform and create alerts for `"level":"error"` and `"level":"fatal"` entries
- **Database monitoring**: Use RDS Performance Insights / Cloud SQL Query Insights
- **Alerting rules**:
  - Health check returns non-200 for >1 minute
  - Database latency > 500ms
  - Memory usage > 80% of heap total
  - Error rate > 5% of total requests
  - Uptime drops unexpectedly (container restart)

---

## Database Migrations

### Development

```bash
# Create a new migration after schema changes
npx prisma migrate dev --name describe_change

# Apply migrations
npx prisma migrate dev
```

### Production

```bash
# Apply pending migrations (safe for production)
npx prisma migrate deploy

# If you need to reset the database (CAUTION: destructive)
npx prisma migrate reset
```

### CI/CD Migration Strategy

The recommended approach for production deployments:

1. **Before deployment**: Run `npx prisma migrate deploy` as a pre-deployment step
2. **During deployment**: The new app version connects to the migrated database
3. **Rollback**: If issues arise, roll back the app while the DB schema remains compatible (design migrations to be backward-compatible)

For zero-downtime deployments, use the **expand-migrate-contract** pattern:
1. **Expand**: Add new columns/tables (app can read both old and new)
2. **Migrate**: Backfill data, update application logic
3. **Contract**: Remove old columns/tables in a subsequent release

---

## Seed Data

For development and testing, seed data can be created via a Prisma seed script (when implemented):

```bash
npx prisma db seed
```

The seed script should create:
- Super Admin user
- A Nation-level tenant
- Sample Province, City, and Precinct tenants
- Demo users for each role
- Sample cases, evidence, and other module data

> **Note**: The seed script is not yet implemented. See `TODO.md` for current status.

---

## Roles & Permissions

| Role | Scope | Capabilities |
|------|-------|-------------|
| `SUPER_ADMIN` | National | Platform-wide management, tenant onboarding, billing |
| `PROVINCE_ADMIN` | Province | Manage cities/precincts in province, cross-precinct analytics |
| `CITY_ADMIN` | City | Manage precincts in city |
| `PRECINCT_ADMIN` | Precinct | Full precinct management (HR, cases, ERP, dispatch) |
| `DETECTIVE` | Assigned cases | Case investigation, evidence management, statements |
| `OFFICER` | Field ops | Shifts, incidents, vehicle assignments |
| `DISPATCHER` | Dispatch | Incident response, unit dispatching |
| `PUBLIC` | Public | Crime map, anonymous tips, FOIA requests |

---

## Project Structure

```
tpt-police/
├── prisma/
│   └── schema.prisma         # Database schema (70+ models)
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login, register, MFA pages
│   │   ├── (platform)/       # Authenticated platform routes
│   │   │   ├── dashboard/    # Role-aware dashboard + shift brief
│   │   │   ├── cases/        # Case management, evidence, persons
│   │   │   ├── dispatch/     # Live dispatch + officer tracking
│   │   │   ├── operations/   # Warrants, bookings, BOLO, use-of-force
│   │   │   ├── evidence-room/# Evidence inventory + lab submissions
│   │   │   ├── bwc/          # Body worn camera management
│   │   │   ├── hr/           # Staff, scheduling, payroll, wellness
│   │   │   ├── erp/          # Fleet, assets, budget, drones
│   │   │   ├── community/    # Events, watch groups, commendations
│   │   │   ├── wellness/     # Mental health check-ins, counselling
│   │   │   ├── reports/      # Analytics and scheduled reports
│   │   │   ├── settings/     # Profile, security (MFA), notifications
│   │   │   └── admin/        # Tenant management, billing, audit
│   │   ├── (public)/         # Public portal (crime map, FOIA, tips)
│   │   └── api/              # 95+ REST API routes
│   ├── components/           # Feature components (co-located)
│   ├── lib/
│   │   ├── ai.ts             # Optional AI service (Ollama + OpenRouter)
│   │   ├── anpr.ts           # Number plate lookup adapter
│   │   ├── auth.ts           # NextAuth configuration
│   │   ├── audit.ts          # Immutable audit log writer
│   │   ├── dispatch.ts       # External CAD adapter
│   │   ├── email.ts          # Multi-provider email (Resend → Mailjet)
│   │   ├── logger.ts         # Structured NDJSON logger
│   │   ├── prisma.ts         # Prisma singleton
│   │   ├── secrets.ts        # Startup secret validation
│   │   └── storage.ts        # R2 / Wasabi abstraction
│   └── middleware.ts         # Route protection + tenant resolution
├── public/
│   ├── manifest.json         # Officer PWA manifest
│   └── public-manifest.json  # Community portal PWA manifest
├── Dockerfile                # Multi-stage production build
├── docker-compose.yml        # App + PostgreSQL + Redis
├── .env.example              # All environment variables documented
├── LICENSE                   # MIT License
└── TODO.md                   # Phase-by-phase task history
```

---

## API Reference

The application provides REST API routes under `/api/`. Key endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check (DB, memory, uptime) |
| `GET /api/metrics` | Prometheus metrics |
| `GET /api/audit-logs` | Audit trail (filterable) |
| `GET/POST /api/cases` | Case management |
| `GET/POST /api/cases/[id]/evidence` | Evidence CRUD (tenant-scoped) |
| `GET /api/bwc/cameras` | Body camera inventory + events |
| `GET /api/lab-submissions` | Lab submission tracking |
| `GET /api/dispatch/officer-locations` | Real-time officer GPS |
| `POST /api/webhooks/dispatch` | Inbound CAD webhook (Bearer auth) |
| `POST /api/vehicles/plate-lookup` | ANPR number plate lookup (audited) |
| `GET /api/shifts/handover-brief` | Shift handover summary (+ AI) |
| `POST /api/admin/foia` | FOIA draft/send response (+ AI) |
| `GET /api/admin/ai-config` | AI provider status |
| `GET/PUT /api/user/profile` | User profile management |
| `PUT /api/user/password` | Password change |
| `GET /api/public/crime-map/heatmap` | Anonymized public crime data |
| `GET /api/public/alerts` | Public safety alerts |
| `POST /api/public/submissions` | Tips, complaints, commendations |

All 95+ routes use Zod validation. Auth via NextAuth.js JWT. Every mutation writes to the audit log.

---

## Known Gaps

| Gap | Notes |
|-----|-------|
| **No test suite** | No Jest/Vitest setup. Integration tests for RBAC and tenant isolation are strongly recommended before production. |
| **In-memory rate limiting** | `src/lib/rate-limit.ts` uses an in-memory Map. Set `REDIS_URL` for multi-instance deployments. |
| **ClamAV scanning optional** | File uploads skip malware scanning unless `CLAMD_HOST` is set. Not recommended for production without it. |
| **AI is opt-in** | AI features (FOIA draft, shift brief) degrade gracefully when neither `OLLAMA_BASE_URL` nor `OPENROUTER_API_KEY` is set. |
| **ANPR stub** | Plate lookup returns empty data when `ANPR_API_URL` is not configured. Safe for development. |
| **PWA icons placeholder** | `manifest.json` references `/icons/icon-192.png` and `/icons/icon-512.png` — add real icon files to `public/icons/` before deploying as a PWA. |

---

## Roadmap

Features planned for future releases:

- **Predictive hotspot mapping** — time-of-day/weekday crime heatmap overlays on dispatch and public maps
- **Evidence expiration alerts** — automated email/in-app when retention period is approaching
- **Cross-precinct person deduplication** — flag when the same person is booked under different names across precincts
- **Court discovery bulk export** — one-click download of all case materials for prosecution
- **Voice-to-text field reports** — Web Speech API integration for hands-free field contact entry
- **Inter-precinct secure messaging** — direct messages and memos across precinct boundaries
- **Offline PWA sync** — Background Sync API for queuing field contacts while offline
- **Automated FOIA deadlines** — reminder emails to the records officer when FOIA responses are due

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.