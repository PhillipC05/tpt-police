"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, FolderOpen, Users, Truck, FileText, MapPin, LayoutDashboard } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const SEARCH_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: "home overview" },
  { label: "Cases", href: "/cases", icon: FolderOpen, keywords: "case investigation crime" },
  { label: "Staff & HR", href: "/hr", icon: Users, keywords: "staff employee hire leave" },
  { label: "Scheduling", href: "/hr/scheduling", icon: Users, keywords: "shift roster schedule" },
  { label: "ERP — Fleet", href: "/erp/fleet", icon: Truck, keywords: "vehicle car fleet maintain" },
  { label: "ERP — Assets", href: "/erp/assets", icon: Truck, keywords: "asset equipment weapon radio" },
  { label: "ERP — Budget", href: "/erp/budget", icon: Truck, keywords: "budget finance purchase order" },
  { label: "Dispatch", href: "/dispatch", icon: MapPin, keywords: "incident dispatch emergency" },
  { label: "Crime Map", href: "/crime-map", icon: MapPin, keywords: "crime map heatmap" },
  { label: "Reports", href: "/reports", icon: FileText, keywords: "report analytics statistics" },
  { label: "FOIA Requests", href: "/foia", icon: FileText, keywords: "foia records request" },
  { label: "Tenant Admin", href: "/admin", icon: LayoutDashboard, keywords: "admin tenant settings" },
];

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  const filtered = query.trim()
    ? SEARCH_ITEMS.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.keywords.toLowerCase().includes(query.toLowerCase())
      )
    : SEARCH_ITEMS;

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href);
    },
    [router, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle className="sr-only">Search</DialogTitle>
      <DialogContent className="top-[15%] sm:max-w-lg">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search pages, cases, people…"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length > 0) {
                  handleSelect(filtered[0].href);
                }
                if (e.key === "Escape") onOpenChange(false);
              }}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.href}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
                  onClick={() => handleSelect(item.href)}
                >
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground px-3 py-2">No results found.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}