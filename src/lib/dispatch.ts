const DISPATCH_API_URL = process.env.DISPATCH_API_URL!;
const DISPATCH_API_KEY = process.env.DISPATCH_API_KEY!;

async function dispatchFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${DISPATCH_API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": DISPATCH_API_KEY,
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Dispatch API error: ${res.status}`);
  return res.json();
}

export const DispatchService = {
  getActiveIncidents: (tenantId: string) =>
    dispatchFetch(`/incidents?tenantId=${tenantId}&status=active`),

  getIncident: (id: string) => dispatchFetch(`/incidents/${id}`),

  getUnitStatuses: (tenantId: string) =>
    dispatchFetch(`/units?tenantId=${tenantId}`),

  notifyCase: (incidentId: string, caseId: string) =>
    dispatchFetch(`/incidents/${incidentId}/case`, {
      method: "POST",
      body: JSON.stringify({ caseId }),
    }),
};
