"use client";

import { useEffect } from "react";
import { setBadge } from "@/lib/badge";

interface AlertBadgeProps {
  count: number;
}

export function AlertBadge({ count }: AlertBadgeProps) {
  useEffect(() => {
    setBadge(count);
    return () => setBadge(0);
  }, [count]);

  return null;
}
