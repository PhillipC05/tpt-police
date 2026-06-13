import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ai } from "@/lib/ai";

/**
 * Returns the current AI configuration status (provider name, model, no secrets).
 * AI credentials are read from environment variables, not stored in the DB.
 * This endpoint lets the admin UI show whether AI is active and which provider.
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!["SUPER_ADMIN", "PROVINCE_ADMIN", "CITY_ADMIN", "PRECINCT_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const configured = ai.isConfigured();
  const provider = ai.getProvider();
  const model = provider === "ollama"
    ? (process.env.OLLAMA_MODEL ?? "llama3.2")
    : (process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini");

  return NextResponse.json({
    configured,
    provider: provider ?? null,
    model: configured ? model : null,
    baseUrl: provider === "ollama" ? (process.env.OLLAMA_BASE_URL ?? null) : null,
  });
}
