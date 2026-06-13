/**
 * Optional AI integration layer.
 *
 * Supports two providers:
 *   - Ollama  (local, self-hosted)   — set OLLAMA_BASE_URL
 *   - OpenRouter (cloud, pay-per-use) — set OPENROUTER_API_KEY
 *
 * Neither is required. Call isConfigured() before using any AI feature;
 * all callers must degrade gracefully when AI is unavailable.
 *
 * Usage:
 *   import { ai } from "@/lib/ai";
 *   if (ai.isConfigured()) {
 *     const text = await ai.complete("Summarise this incident: ...");
 *   }
 */

export type AIProvider = "ollama" | "openrouter";

interface AIConfig {
  provider: AIProvider;
  baseUrl: string;
  model: string;
  apiKey?: string;
}

function resolveConfig(): AIConfig | null {
  const ollamaUrl = process.env.OLLAMA_BASE_URL;
  if (ollamaUrl) {
    return {
      provider: "ollama",
      baseUrl: ollamaUrl.replace(/\/$/, ""),
      model: process.env.OLLAMA_MODEL ?? "llama3.2",
    };
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    return {
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
      apiKey: openRouterKey,
    };
  }

  return null;
}

class AIService {
  private config: AIConfig | null;

  constructor() {
    this.config = resolveConfig();
  }

  isConfigured(): boolean {
    return this.config !== null;
  }

  getProvider(): AIProvider | null {
    return this.config?.provider ?? null;
  }

  /**
   * Send a prompt and return the completion text.
   * Throws if AI is not configured.
   */
  async complete(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.config) throw new Error("AI is not configured");

    if (this.config.provider === "ollama") {
      return this.ollamaComplete(prompt, systemPrompt);
    }
    return this.openRouterComplete(prompt, systemPrompt);
  }

  private async ollamaComplete(prompt: string, systemPrompt?: string): Promise<string> {
    const cfg = this.config!;
    const messages = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });

    const res = await fetch(`${cfg.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: cfg.model, messages, stream: false }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama error ${res.status}: ${text}`);
    }

    const data = await res.json() as { message?: { content?: string } };
    return data.message?.content ?? "";
  }

  private async openRouterComplete(prompt: string, systemPrompt?: string): Promise<string> {
    const cfg = this.config!;
    const messages = [];
    if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
    messages.push({ role: "user", content: prompt });

    const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
        "HTTP-Referer": "https://tpt-police.app",
        "X-Title": "TPT Police",
      },
      body: JSON.stringify({ model: cfg.model, messages }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${text}`);
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content ?? "";
  }
}

// Singleton — re-evaluated once per process. Safe in Next.js serverless.
export const ai = new AIService();
