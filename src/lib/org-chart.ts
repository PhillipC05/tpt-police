export type OrgNode = {
  id: string;
  label: string;
  role: string;
  department?: string | null;
  badgeNumber?: string | null;
};

export type OrgEdge = {
  from: string;
  to: string;
};

export type OrgGraph = {
  nodes: OrgNode[];
  edges: OrgEdge[];
};

/**
 * Deterministic, dependency-free layout for a top-down org chart.
 * Computes x/y positions for each node based on depth and sibling index.
 */
export function buildTopDownLayout(graph: OrgGraph, rootId?: string) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n] as const));
  const children = new Map<string, string[]>();

  for (const e of graph.edges) {
    const list = children.get(e.from) ?? [];
    list.push(e.to);
    children.set(e.from, list);
  }

  // Determine roots (or use provided rootId)
  const indeg = new Map<string, number>();
  for (const n of graph.nodes) indeg.set(n.id, 0);
  for (const e of graph.edges) indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);

  const roots = Array.from(indeg.entries())
    .filter(([, v]) => v === 0)
    .map(([id]) => id);

  const effectiveRoot = rootId && byId.has(rootId) ? rootId : roots[0];

  // If we can't find any root (cycle/missing relations), just pick first node
  const start = effectiveRoot ?? graph.nodes[0]?.id;
  if (!start) return { placed: [] as Array<OrgPlacedNode>, width: 0, height: 0 };

  // Compute depth via DFS (protect against cycles)
  const depth = new Map<string, number>();
  const visited = new Set<string>();

  const dfs = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    const d = depth.get(id) ?? 0;
    const kids = (children.get(id) ?? []).slice().sort((a, b) => (byId.get(a)?.label ?? a).localeCompare(byId.get(b)?.label ?? b));
    for (const k of kids) {
      if (!depth.has(k)) depth.set(k, d + 1);
      else depth.set(k, Math.max(depth.get(k) ?? 0, d + 1));
      dfs(k);
    }
  };
  depth.set(start, 0);
  dfs(start);

  const levels = new Map<number, string[]>();
  for (const [id, d] of depth.entries()) {
    const list = levels.get(d) ?? [];
    list.push(id);
    levels.set(d, list);
  }

  // Assign x positions within each depth level
  const placed: OrgPlacedNode[] = [];
  const H_SPACING = 210; // px between nodes on the same depth
  const V_SPACING = 120; // px between depths

  const maxLevel = Math.max(...Array.from(levels.keys()));
  for (let d = 0; d <= maxLevel; d++) {
    const ids = (levels.get(d) ?? []).slice();
    ids.sort((a, b) => (byId.get(a)?.label ?? a).localeCompare(byId.get(b)?.label ?? b));

    ids.forEach((id, idx) => {
      const node = byId.get(id);
      if (!node) return;
      placed.push({
        id,
        label: node.label,
        role: node.role,
        department: node.department,
        badgeNumber: node.badgeNumber,
        depth: d,
        x: idx * H_SPACING,
        y: d * V_SPACING,
      });
    });
  }

  const width = placed.reduce((m, p) => Math.max(m, p.x), 0) + 240;
  const height = (maxLevel + 1) * V_SPACING + 80;

  return { placed, width, height };
}

type OrgPlacedNode = OrgNode & { depth: number; x: number; y: number };

