/**
 * ANPR (Automatic Number Plate Recognition) service adapter.
 *
 * Wraps an external ANPR / vehicle registry API.
 * When ANPR_API_URL and ANPR_API_KEY are not set the service returns
 * mock/stub data so development works without a live integration.
 *
 * All plate queries are written to AuditLog (resource: "plate_lookup").
 */

export interface PlateResult {
  plateNumber: string;
  province: string | null;
  registeredTo: {
    name: string;
    address: string;
  } | null;
  vehicleDescription: string | null;
  warrants: string[];
  stolen: boolean;
  expired: boolean;
  source: "anpr" | "stub";
}

const ANPR_API_URL = process.env.ANPR_API_URL;
const ANPR_API_KEY = process.env.ANPR_API_KEY;

export function isANPRConfigured(): boolean {
  return !!(ANPR_API_URL && ANPR_API_KEY);
}

export async function lookupPlate(plateNumber: string, province?: string): Promise<PlateResult> {
  const plate = plateNumber.toUpperCase().replace(/\s+/g, "");

  if (!isANPRConfigured()) {
    return stubLookup(plate, province);
  }

  const url = new URL(`${ANPR_API_URL}/plates/${encodeURIComponent(plate)}`);
  if (province) url.searchParams.set("province", province);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "x-api-key": ANPR_API_KEY!,
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`ANPR API error ${res.status}`);
  }

  const data = await res.json() as Partial<PlateResult>;

  return {
    plateNumber: plate,
    province: data.province ?? province ?? null,
    registeredTo: data.registeredTo ?? null,
    vehicleDescription: data.vehicleDescription ?? null,
    warrants: Array.isArray(data.warrants) ? data.warrants : [],
    stolen: data.stolen ?? false,
    expired: data.expired ?? false,
    source: "anpr",
  };
}

function stubLookup(plate: string, province?: string): PlateResult {
  return {
    plateNumber: plate,
    province: province ?? null,
    registeredTo: null,
    vehicleDescription: null,
    warrants: [],
    stolen: false,
    expired: false,
    source: "stub",
  };
}
