import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Box, DollarSign, Drone, ArrowRight } from "lucide-react";
import Link from "next/link";

const modules = [
  { title: "Fleet Management", href: "/erp/fleet", icon: Truck, desc: "Vehicles, maintenance, fuel logs" },
  { title: "Asset Tracking", href: "/erp/assets", icon: Box, desc: "Equipment, weapons, uniforms" },
  { title: "Budget & Finance", href: "/erp/budget", icon: DollarSign, desc: "Budgets, purchase orders, expenses" },
  { title: "Drone Fleet", href: "/erp/drones", icon: Drone, desc: "Drone inventory, deployments, certifications" },
];

export default async function ErpPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Enterprise Resource Planning</h1>
        <p className="text-muted-foreground">Manage fleet, assets, and departmental budgets.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href} href={mod.href}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{mod.title}</CardTitle>
                  <Icon className="w-5 h-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{mod.desc}</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-primary font-medium">
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}