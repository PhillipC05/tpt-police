// ── Types ──────────────────────────────────────────────────────────────

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  provider: "resend" | "mailjet" | "log" | "none";
  error?: string;
}

// ── Configuration ──────────────────────────────────────────────────────

interface EmailConfig {
  resendApiKey: string | undefined;
  mailjetApiKey: string | undefined;
  mailjetSecretKey: string | undefined;
  fromAddress: string;
  fromName: string;
}

function getConfig(): EmailConfig {
  return {
    resendApiKey: process.env.RESEND_API_KEY,
    mailjetApiKey: process.env.MAILJET_API_KEY,
    mailjetSecretKey: process.env.MAILJET_SECRET_KEY,
    fromAddress: process.env.EMAIL_FROM ?? "noreply@tptpolice.gov",
    fromName: process.env.EMAIL_FROM_NAME ?? "TPT Police",
  };
}

// ── Resend Provider ────────────────────────────────────────────────────

async function sendViaResend(
  payload: EmailPayload,
  config: EmailConfig,
): Promise<EmailResult> {
  const to = Array.isArray(payload.to) ? payload.to.join(",") : payload.to;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${config.fromName} <${config.fromAddress}>`,
      to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text ?? undefined,
      reply_to: payload.replyTo ?? undefined,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      success: false,
      provider: "resend",
      error: `Resend API error (${response.status}): ${errorBody}`,
    };
  }

  const data = await response.json();
  return {
    success: true,
    messageId: data.id,
    provider: "resend",
  };
}

// ── Mailjet Provider ────────────────────────────────────────────────────

async function sendViaMailjet(
  payload: EmailPayload,
  config: EmailConfig,
): Promise<EmailResult> {
  const toList = (Array.isArray(payload.to) ? payload.to : [payload.to]).map(
    (email) => ({ Email: email }),
  );

  const basicAuth = Buffer.from(
    `${config.mailjetApiKey}:${config.mailjetSecretKey}`,
  ).toString("base64");

  const response = await fetch(
    "https://api.mailjet.com/v3.1/send",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Messages: [
          {
            From: {
              Email: config.fromAddress,
              Name: config.fromName,
            },
            To: toList,
            Subject: payload.subject,
            HTMLPart: payload.html,
            TextPart: payload.text ?? undefined,
            ReplyTo: payload.replyTo
              ? { Email: payload.replyTo }
              : undefined,
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      success: false,
      provider: "mailjet",
      error: `Mailjet API error (${response.status}): ${errorBody}`,
    };
  }

  const data = await response.json();
  const messageId =
    data.Messages?.[0]?.To?.[0]?.MessageID?.toString() ?? undefined;
  return {
    success: true,
    messageId,
    provider: "mailjet",
  };
}

// ── Logger (fallback when no provider is configured) ────────────────────

async function sendViaLog(
  payload: EmailPayload,
  _config: EmailConfig,
): Promise<EmailResult> {
  console.log("[EMAIL LOGGER] Email would be sent:", {
    to: payload.to,
    subject: payload.subject,
    htmlLength: payload.html.length,
    textLength: payload.text?.length ?? 0,
  });
  return {
    success: true,
    provider: "log",
    messageId: `log-${Date.now()}`,
  };
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Send an email using the configured provider.
 *
 * Provider priority: Resend > Mailjet > Log (dev fallback)
 * - If RESEND_API_KEY is set, uses Resend
 * - Else if MAILJET_API_KEY + MAILJET_SECRET_KEY are set, uses Mailjet
 * - Else logs to console (safe for development)
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const config = getConfig();

  try {
    if (config.resendApiKey) {
      return await sendViaResend(payload, config);
    }

    if (config.mailjetApiKey && config.mailjetSecretKey) {
      return await sendViaMailjet(payload, config);
    }

    return await sendViaLog(payload, config);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      provider: "none",
      error: `Unexpected email error: ${message}`,
    };
  }
}

/**
 * Check which email provider is currently configured.
 */
export function getActiveProvider(): "resend" | "mailjet" | "log" | "none" {
  const c = getConfig();
  if (c.resendApiKey) return "resend";
  if (c.mailjetApiKey && c.mailjetSecretKey) return "mailjet";
  return "log";
}