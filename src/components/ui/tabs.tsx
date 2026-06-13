"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({
  value: "",
  onValueChange: () => {},
});

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

function Tabs({ defaultValue = "", value, onValueChange, className, children }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : internalValue;

  const handleChange = React.useCallback(
    (v: string) => {
      if (!controlled) setInternalValue(v);
      onValueChange?.(v);
    },
    [controlled, onValueChange],
  );

  return (
    <TabsContext.Provider value={{ value: current, onValueChange: handleChange }}>
      <div className={cn("", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "inline-flex h-9 items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function TabsTrigger({ value, className, children, disabled }: TabsTriggerProps) {
  const { value: current, onValueChange } = React.useContext(TabsContext);
  const active = current === value;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        active && "bg-background text-foreground shadow",
        className,
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

function TabsContent({ value, className, children }: TabsContentProps) {
  const { value: current } = React.useContext(TabsContext);
  if (current !== value) return null;
  return <div className={cn("mt-2", className)}>{children}</div>;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
