import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AssetsClient } from "@/components/erp/assets-client";

export default async function AssetsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Asset Tracking</h1>
        <p className="text-muted-foreground">Equipment inventory, issuance, and audits.</p>
      </div>

      <AssetsClient />
    </div>
  );
}
