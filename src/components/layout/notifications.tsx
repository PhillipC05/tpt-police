"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, Info, AlertTriangle, CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  read: boolean;
  createdAt: string;
}

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Case Assigned",
    message: "Case #C-2024-0042 has been assigned to you.",
    type: "info",
    read: false,
    createdAt: "2 min ago",
  },
  {
    id: "2",
    title: "Leave Approved",
    message: "Your annual leave request has been approved.",
    type: "success",
    read: false,
    createdAt: "1 hour ago",
  },
  {
    id: "3",
    title: "Vehicle Service Due",
    message: "Unit 42 (Toyota Camry) is due for service.",
    type: "warning",
    read: true,
    createdAt: "3 hours ago",
  },
];

const iconMap = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
};

const colorMap = {
  info: "text-blue-500",
  warning: "text-amber-500",
  success: "text-green-500",
};

export function Notifications() {
  const [notifications, setNotifications] = useState(SAMPLE_NOTIFICATIONS);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative inline-flex items-center justify-center rounded-md p-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
            {unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup className="max-h-[320px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((n) => {
              const Icon = iconMap[n.type];
              return (
                <DropdownMenuItem
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-3 py-2.5 cursor-default",
                    !n.read && "bg-accent/50"
                  )}
                >
                  <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", colorMap[n.type])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{n.createdAt}</p>
                  </div>
                  <button
                    onClick={() => dismiss(n.id)}
                    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </DropdownMenuItem>
              );
            })
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}