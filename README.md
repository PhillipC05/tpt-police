# TPT Police — National Law Enforcement Management Platform

Multi-tenant national police department management platform serving a 4-tier hierarchy: **Nation → Province → City → Precinct**.

Built with Next.js 16, TypeScript, PostgreSQL (Prisma ORM), NextAuth.js v5, and shadcn/ui.

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

All required environment variables are documented in `.env.example`:

```bash
# Required - Database
DATABASE_URL="postgresql://user:password@host:5432/tpt_police?sslmode=require"

# Required - NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"

# Required - File Storage (at least one of R2 or Wasabi)
R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET="tpt-police"

WASABI_ENDPOINT="https://s3.wasabisys.com"
WASABI_REGION="us-east-1"
WASABI_ACCESS_KEY_ID=""
WASABI_SECRET_ACCESS_KEY=""
WASABI_BUCKET="tpt-police-evidence"

# Optional - Dispatch integration
DISPATCH_API_URL="http://dispatch-service:4000"
DISPATCH_API_KEY=""

# Optional - Email
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@tptpolice.gov"
```

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

The app exposes a health check endpoint at `/api/health`:

```json
{
  "status": "healthy",
  "timestamp": "2026-05-28T00:00:00.000Z",
  "uptime": 12345,
  "database": {
    "status": "connected",
    "latencyMs": 2
  },
  "memory": {
    "rss": 123456,
    "heapTotal": 78901,
    "heapUsed": 45678,
    "external": 1234
  }
}
```

Use this endpoint for:
- **Load balancer health checks** (configure to hit `/api/health`)
- **Container orchestration liveness probes** (Kubernetes)
- **Monitoring tools** (Datadog, New Relic, Prometheus)

### Monitoring Recommendations

- **Uptime monitoring**: Ping `/api/health` every 30 seconds
- **Error tracking**: Integrate Sentry or similar
- **Performance monitoring**: Vercel Analytics or Datadog RUM
- **Database monitoring**: Use RDS Performance Insights / Cloud SQL Query Insights
- **Alerting**: Set up alerts for health check failures, high DB latency, 5xx errors

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
│   └── schema.prisma         # Database schema (all modules)
├── src/
│   ├── app/
│   │   ├── (auth)/           # Login, register, MFA pages
│   │   ├── (platform)/       # Authenticated app routes
│   │   │   ├── dashboard/    # Role-aware dashboard
│   │   │   ├── hr/           # Staff directory, leave, performance
│   │   │   ├── cases/        # Case management, evidence, persons
│   │   │   ├── erp/           # Fleet, assets, budget
│   │   │   ├── dispatch/     # Live operations, incidents
│   │   │   └── admin/        # Tenant management, billing, audit
│   │   ├── (public)/         # Public portal (crime map, FOIA, tips)
│   │   └── api/              # REST API routes
│   ├── components/
│   │   ├── ui/               # shadcn/ui primitives
│   │   └── ...               # Feature components
│   ├── lib/
│   │   ├── auth.ts           # NextAuth configuration
│   │   ├── prisma.ts         # Prisma client singleton
│   │   ├── storage.ts        # StorageService (R2 + Wasabi)
│   │   ├── dispatch.ts       # Dispatch API adapter
│   │   └── audit.ts          # Audit log helper
│   └── middleware.ts          # Route protection + tenant resolution
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # App + PostgreSQL + Redis
├── .env.example               # All required environment variables
├── next.config.ts             # Next.js config (standalone output)
└── TODO.md                    # Full task list by phase
```

---

## API Reference

The application provides REST API routes under `/api/`. Key endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check (DB connectivity, memory, uptime) |
| `POST /api/auth/register` | User registration |
| `POST /api/auth/login` | Authentication |
| `GET /api/audit-logs` | Audit log viewer (filterable, exportable) |
| `GET /api/admin/tenants` | Tenant management (Super Admin) |
| `GET /api/admin/billing` | Billing/subscription management |
| `GET /api/hr/staff` | Staff directory |
| `GET /api/cases` | Case list with search/filter |
| `GET /api/erp/fleet` | Vehicle inventory |
| `GET /api/erp/assets` | Asset catalog |
| `GET /api/erp/budget` | Budget management |
| `GET /api/dispatch/incidents` | Active incidents |
| `GET /api/tips` | Anonymous tips (public) |
| `GET /api/foia` | FOIA records requests (public) |
| `GET /api/public/crime-map` | Anonymized crime data (public) |

All API routes use Zod validation. Authentication is handled via NextAuth.js JWT sessions.

---

## License

Proprietary — TPT Police National Law Enforcement Management Platform

For deployment support, contact the TPT Police IT Division.