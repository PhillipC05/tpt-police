"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { buildTopDownLayout, type OrgGraph } from "@/lib/org-chart";
import { Filter, Network, RefreshCw } from "lucide-react";

export function OrgChartViewer({ graph, title }: { graph: OrgGraph; title?: string }) {
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return graph;

    const nodeMatches = new Set(
      graph.nodes
        .filter((n) => {
          return (
            n.label.toLowerCase().includes(q) ||
            n.role.toLowerCase().includes(q) ||
            (n.department ?? "").toLowerCase().includes(q) ||
            (n.badgeNumber ?? "").toLowerCase().includes(q)
          );
        })
        .map((n) => n.id),
    );

    // Keep edges where both ends exist in filtered nodes.
    const edges = graph.edges.filter((e) => nodeMatches.has(e.from) && nodeMatches.has(e.to));
    const nodes = graph.nodes.filter((n) => nodeMatches.has(n.id));

    return { nodes, edges };
  }, [graph, filter]);

  const { placed, width, height } = useMemo(() => {
    return buildTopDownLayout(filtered);
  }, [filtered]);

  const placedById = useMemo(() => new Map(placed.map((p) => [p.id, p] as const)), [placed]);

  const viewEdges = useMemo(() => {
    // For each edge, connect the nearest bottom/top anchors.
    return filtered.edges
      .map((e) => {
        const from = placedById.get(e.from);
        const to = placedById.get(e.to);
        if (!from || !to) return null;

        const x1 = from.x + 110;
        const y1 = from.y + 48;
        const x2 = to.x + 110;
        const y2 = to.y;

        return { ...e, x1, y1, x2, y2 };
      })
      .filter(Boolean) as Array<{
      from: string;
      to: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    }>;
  }, [filtered.edges, placedById]);

  const nodeCard = (id: string) => {
    const n = placedById.get(id);
    if (!n) return null;
    return (
      <g key={n.id} transform={`translate(${n.x},${n.y})`}>
        <rect x={0} y={0} width={220} height={96} rx={12} fill="hsl(var(--card))" stroke="hsl(var(--border))" />
        <text x={110} y={28} textAnchor="middle" fill="hsl(var(--foreground))" fontSize={13} fontWeight={600}>
          {n.label}
        </text>
        <text x={110} y={48} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>
          {n.role}
        </text>
        {n.badgeNumber ? (
          <text x={110} y={68} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>
            #{n.badgeNumber}
          </text>
        ) : null}
        {n.department ? (
          <text x={110} y={86} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize={11}>
            {n.department}
          </text>
        ) : null}
      </g>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            {title ?? "Org Chart"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">Top-down hierarchy rendering (dependency-free).</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">Nodes: {filtered.nodes.length}</Badge>
          <Badge variant="outline">Links: {filtered.edges.length}</Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div className="relative w-full sm:w-72">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name, role, badge, department..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => setFilter("")} className="w-full sm:w-auto">
            <RefreshCw className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>

        <div className="w-full overflow-auto rounded-md border">
          <svg width={width} height={height} className="block bg-background">
            <defs>
              <marker
                id="arrow"
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,6 L9,3 z" fill="hsl(var(--muted-foreground))" />
              </marker>
            </defs>

            {/* Edges */}
            {viewEdges.map((e) => (
              <path
                key={`${e.from}-${e.to}`}
                d={`M${e.x1},${e.y1} C${e.x1},${(e.y1 + e.y2) / 2} ${e.x2},${(e.y1 + e.y2) / 2} ${e.x2},${e.y2}`}
                fill="none"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
              />
            ))}

            {/* Nodes */}
            {placed.map((p) => nodeCard(p.id))}
          </svg>
        </div>


        {filtered.nodes.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">No nodes match the filter.</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

