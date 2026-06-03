# Scheduled Report Migration

Run this SQL to add the ScheduledReport model:

```sql
CREATE TABLE "ScheduledReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metrics" JSONB NOT NULL DEFAULT '[]',
    "filters" JSONB NOT NULL DEFAULT '{}',
    "schedule" TEXT NOT NULL DEFAULT 'weekly',
    "recipients" JSONB NOT NULL DEFAULT '[]',
    "format" TEXT NOT NULL DEFAULT 'pdf',
    "lastSentAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ScheduledReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    CONSTRAINT "ScheduledReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "ScheduledReport_tenantId_idx" ON "ScheduledReport"("tenantId");
CREATE INDEX "ScheduledReport_userId_idx" ON "ScheduledReport"("userId");
CREATE INDEX "ScheduledReport_nextRunAt_idx" ON "ScheduledReport"("nextRunAt");