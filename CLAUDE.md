@AGENTS.md

# TPT Police — National Law Enforcement Management Platform

## Project Overview
Multi-tenant national police department management platform serving a 4-tier hierarchy: **Nation → Province → City → Precinct**.

## Stack
- **Framework**: Next.js 16 (App Router, RSC + Server Actions)
- **Language**: TypeScript 5
- **UI**: shadcn/ui + Tailwind CSS v4
- **Auth**: NextAuth.js v5 (beta) with JWT sessions + MFA (TOTP)
- **ORM**: Prisma 6 + PostgreSQL 16
- **File Storage**: Cloudflare R2 + Wasabi (abstracted via `StorageService`)
- **Validation**: Zod 4 on all API routes and forms
- **AI (optional)**: Ollama (local) or OpenRouter — configured via env vars
- **Deployment**: Docker-ready (Vercel / Government Cloud / self-hosted)
- **License**: MIT

## Project Structure
```
src/
├── app/
│   ├── (auth)/              # Login, register, MFA pages
│   ├── (platform)/          # All authenticated app routes
│   │   ├── dashboard/       # Shift brief card + stats
│   │   ├── cases/
│   │   ├── evidence-room/   # Evidence inventory + lab submissions
│   │   ├── bwc/             # Body worn camera management
│   │   ├── community/       # Events, watch groups, commendations
│   │   ├── hr/
│   │   ├── erp/
│   │   ├── dispatch/
│   │   ├── operations/
│   │   ├── wellness/
│   │   ├── settings/        # Profile, security (MFA), notifications
│   │   └── admin/
│   └── (public)/            # Public portal (crime map, FOIA)
├── components/
│   ├── ui/                  # shadcn/ui primitives
│   ├── dashboard/           # ShiftBriefCard
│   ├── evidence/            # EvidenceRoomClient
│   ├── bwc/                 # BWCClient
│   ├── community/           # CommunityClient
│   ├── settings/            # SettingsClient
│   └── ...                  # Other feature components
├── lib/
│   ├── ai.ts                # Optional AI (Ollama + OpenRouter)
│   ├── anpr.ts              # Number plate lookup adapter
│   ├── auth.ts              # NextAuth config
│   ├── audit.ts             # Audit log writer
│   ├── prisma.ts            # Prisma client singleton
│   ├── storage.ts           # StorageService (R2 + Wasabi abstraction)
│   ├── logger.ts            # Structured NDJSON logger — use this, not console.*
│   ├── dispatch.ts          # External CAD adapter
│   └── secrets.ts           # Startup secret validation
└── middleware.ts             # Route protection + tenant resolution
prisma/
├── schema.prisma
└── migrations/
```

## Roles (RBAC)
| Role | Scope |
|---|---|
| `SUPER_ADMIN` | Full national platform |
| `PROVINCE_ADMIN` | All cities/precincts in province |
| `CITY_ADMIN` | All precincts in city |
| `PRECINCT_ADMIN` | Own precinct only |
| `DETECTIVE` | Assigned cases and evidence |
| `OFFICER` | Field ops, shifts, incidents |
| `DISPATCHER` | Dispatch and incident response |
| `PUBLIC` | Crime map, tips, FOIA requests |

## Multi-Tenancy
- All DB data scoped by `tenantId`
- Tenant type enum: `NATION | PROVINCE | CITY | PRECINCT`
- Middleware resolves tenant context from JWT session on every request
- Cross-tier read access granted by role hierarchy

## Key Conventions
- Server Actions for mutations (not API routes unless external consumption needed)
- All forms validated with Zod + React Hook Form + `@hookform/resolvers/zod`
- All file uploads go through `lib/storage.ts` — never call R2/Wasabi directly
- Audit log written on every data mutation (use `lib/audit.ts`)
- Keep components in `src/components/`, colocate page-specific components in page folder
- **Never use `console.*`** — always use `logger.error / logger.warn / logger.info` from `src/lib/logger.ts`
- **Always scope DB queries by `tenantId`** — every case/evidence/incident query must include `where: { tenantId: session.user.tenantId }`. Return 404 (not 403) when a record is not found in tenant scope to avoid leaking existence.
- **AI is optional** — always guard with `if (ai.isConfigured())` before calling `src/lib/ai.ts`. Features must degrade gracefully when AI is not configured.
- **ANPR stub pattern** — `lookupPlate()` in `src/lib/anpr.ts` returns a stub response when `ANPR_API_URL`/`ANPR_API_KEY` are unset, so dev/test works without a live plate registry.
- **Zod datetime** — use `z.string().datetime()`, not `z.iso.datetime()` (the latter does not exist in Zod 4).

## Environment Variables
See `.env.example` for all required variables.

## Running Locally
```bash
cp .env.example .env.local
docker-compose up -d   # starts PostgreSQL
npx prisma migrate dev
npm run dev
```

## TODO Tracking
See `TODO.md` for full phase-by-phase task list.
