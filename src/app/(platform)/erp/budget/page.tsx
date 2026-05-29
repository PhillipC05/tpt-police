import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BudgetClient } from "@/components/erp/budget-client";

export default async function BudgetPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Budget & Finance</h1>
        <p className="text-muted-foreground">Departmental budgets, purchase orders, and expense claims.</p>
      </div>

      <BudgetClient />
    </div>
  );
}
