"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Calendar,
  Truck,
  Radio,
  BarChart3,
  Settings,
  Shield,
  MapPin,
  FileText,
  Building2,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN", "DETECTIVE", "OFFICER", "DISPATCHER"] },
  { label: "Cases", href: "/cases", icon: FolderOpen, roles: ["SUPER_ADMIN", "PRECINCT_ADMIN", "DETECTIVE", "OFFICER"] },
  { label: "Staff & HR", href: "/hr", icon: Users, roles: ["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"] },
  { label: "Scheduling", href: "/hr/scheduling", icon: Calendar, roles: ["SUPER_ADMIN", "PRECINCT_ADMIN", "OFFICER"] },
  { label: "ERP", href: "/erp", icon: Truck, roles: ["SUPER_ADMIN", "PRECINCT_ADMIN"] },
  { label: "Dispatch", href: "/dispatch", icon: Radio, roles: ["SUPER_ADMIN", "PRECINCT_ADMIN", "DISPATCHER", "OFFICER"] },
  { label: "Crime Map", href: "/crime-map", icon: MapPin, roles: ["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN", "DETECTIVE"] },
  { label: "Reports", href: "/reports", icon: BarChart3, roles: ["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"] },
  { label: "FOIA Requests", href: "/foia", icon: FileText, roles: ["SUPER_ADMIN", "PRECINCT_ADMIN"] },
  { label: "Tenant Admin", href: "/admin", icon: Building2, roles: ["SUPER_ADMIN"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["SUPER_ADMIN", "PRECINCT_ADMIN"] },
];

interface AppSidebarProps {
  userRole: UserRole;
  userName: string;
  tenantName: string;
}

export function AppSidebar({ userRole, userName, tenantName }: AppSidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) =>
    (item.roles as string[]).includes(userRole)
  );

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex items-center justify-center w-8 h-8 rounded bg-primary">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold truncate">TPT Police</span>
            <span className="text-xs text-muted-foreground truncate">{tenantName}</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarMenu>
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive}
                    render={<Link href={item.href} />}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium truncate">{userName}</span>
            <span className="text-xs text-muted-foreground capitalize">{userRole.replace(/_/g, " ").toLowerCase()}</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
