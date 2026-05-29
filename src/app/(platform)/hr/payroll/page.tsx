import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PayrollClient } from "@/components/hr/payroll-client";

export default async function PayrollPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payroll Management</h1>
        <p className="text-muted-foreground">Manage payroll periods, calculate hours, process payments.</p>
      </div>

      <PayrollClient />
    </div>
  );
}