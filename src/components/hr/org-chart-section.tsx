"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { OrgChartViewer } from "@/components/hr/org-chart-viewer";
import type { OrgGraph } from "@/lib/org-chart";

// Temporary client-only data while DB relation is being added.
// Once managerId relation exists, replace fetch accordingly.
const makeMockOrgGraph = (staff: Array<{ id: string; name: string; role: string; badgeNumber: string | null; department: string | null }> ): OrgGraph => {
  // Strategy: deterministic "chain" within same role to show full functionality.
  const officers = staff
    .filter((s) => s.role !== "PUBLIC")
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  // Create edges from each element to the next 2 levels down.
  const nodes = officers.map((s) => ({
    id: s.id,
    label: s.name,
    role: s.role,
    department: s.department,
    badgeNumber: s.badgeNumber,
  }));

  const edges: OrgGraph["edges"] = [];
  for (let i = 0; i < officers.length; i++) {
    const parent = officers[i];
    const childA = officers[i + 1];
    const childB = officers[i + 2];
    if (childA) edges.push({ from: parent.id, to: childA.id });
    if (childB) edges.push({ from: parent.id, to: childB.id });
    if (edges.length > 2000) break;
  }

  return { nodes, edges };
};

export function OrgChartSection() {
  const [loading, setLoading] = useState(true);
  const [graph, setGraph] = useState<OrgGraph | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        // Reuse staff endpoint we already have.
        const res = await fetch("/api/hr/staff");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const staff = (await res.json()) as Array<{
          id: string;
          name: string;
          role: string;
          badgeNumber: string | null;
          department: string | null;
        }>;

        const g = makeMockOrgGraph(staff);
        setGraph(g);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load org chart data");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const empty = useMemo(() => !loading && (!graph || graph.nodes.length === 0), [loading, graph]);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading org chart...</div>
    );
  }

  if (!graph || empty) {
    return (
      <div className="text-center py-8 text-muted-foreground">Org chart not available.</div>
    );
  }

  return <OrgChartViewer graph={graph} title="Staff Org Chart" />;
}

