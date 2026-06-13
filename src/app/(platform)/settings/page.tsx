import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      photoUrl: true,
      badgeNumber: true,
      rank: true,
      department: true,
      role: true,
      mfaEnabled: true,
    },
  });

  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account, security, and notification preferences.</p>
      </div>
      <SettingsClient user={JSON.parse(JSON.stringify(user))} />
    </div>
  );
}
