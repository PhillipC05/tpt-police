import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AlertBanner } from "@/components/layout/alert-banner";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { AlertBadge } from "@/components/pwa/alert-badge";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const [tenant, alertCount] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true },
    }),
    prisma.alert.count({
      where: {
        status: "ACTIVE",
        OR: [
          { tenantId: session.user.tenantId },
          { scopeTenantId: null },
        ],
      },
    }),
  ]);

  return (
    <SidebarProvider>
      <ServiceWorkerRegistration />
      <AlertBadge count={alertCount} />
      <AppSidebar
        userRole={session.user.role}
        userName={session.user.name}
        tenantName={tenant?.name ?? ""}
      />
      <div className="flex flex-col flex-1 min-h-screen min-w-0">
        <Topbar userName={session.user.name} userRole={session.user.role} />
        <AlertBanner tenantId={session.user.tenantId} />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
