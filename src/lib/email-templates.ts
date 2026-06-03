/**
 * Email templates for the TPT Police platform.
 */

// ── Tip Acknowledgment ─────────────────────────────────────────────────

interface TipAcknowledgmentData {
  reference: string;
  tipType: string;
  description: string;
  isAnonymous: boolean;
  contactEmail?: string;
  contactPhone?: string;
  submittedAt: string;
}

export function buildTipAcknowledgmentEmail(
  data: TipAcknowledgmentData,
): { subject: string; html: string; text: string } {
  const subject = `[TPT Police] Tip Acknowledgment \u2014 Reference #${data.reference}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .card { background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { border-bottom: 3px solid #1e40af; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { color: #1e40af; font-size: 24px; margin: 0; }
    .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 600; }
    .label { color: #71717a; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .value { color: #18181b; font-size: 16px; margin-bottom: 16px; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #71717a; }
    .footer a { color: #1e40af; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>Tip Acknowledgment</h1>
      </div>
      <p>Thank you for submitting a tip to TPT Police. Your cooperation helps keep our community safe.</p>
      <p style="margin-bottom: 24px;">Please keep the following reference number for your records:</p>
      <div style="text-align: center; margin: 24px 0;">
        <div style="font-size: 32px; font-weight: 700; color: #1e40af; letter-spacing: 0.1em;">#${data.reference}</div>
      </div>
      <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;" />
      <div class="label">Tip Category</div>
      <div class="value"><span class="badge">${escapeHtml(data.tipType)}</span></div>
      <div class="label">Description</div>
      <div class="value">${escapeHtml(data.description)}</div>
      <div class="label">Submitted</div>
      <div class="value">${data.submittedAt}</div>
${
  data.isAnonymous
    ? `<div class="label">Privacy</div>
      <div class="value">Your tip was submitted anonymously. We cannot follow up directly unless you provided contact information.</div>`
    : `<div class="label">Contact Email</div>
      <div class="value">${data.contactEmail ?? "Not provided"}</div>
      <div class="label">Contact Phone</div>
      <div class="value">${data.contactPhone ?? "Not provided"}</div>`
}
      <div class="footer">
        <p>This is an automated acknowledgment. Do not reply directly to this email.</p>
        <p>If you have additional information regarding this tip, please submit a new tip referencing #${data.reference}.</p>
        <p>\u00a9 ${new Date().getFullYear()} TPT Police. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `
TPT Police \u2014 Tip Acknowledgment
================================

Thank you for submitting a tip to TPT Police. Your cooperation helps keep our community safe.

Please keep the following reference number for your records:

Reference: #${data.reference}

Tip Category: ${data.tipType}
Description: ${data.description}
Submitted: ${data.submittedAt}
${
  data.isAnonymous
    ? "Privacy: Your tip was submitted anonymously."
    : `Contact Email: ${data.contactEmail ?? "Not provided"}
Contact Phone: ${data.contactPhone ?? "Not provided"}`
}

This is an automated acknowledgment. Do not reply directly to this email.

If you have additional information regarding this tip, please submit a new tip referencing #${data.reference}.

\u00a9 ${new Date().getFullYear()} TPT Police. All rights reserved.
`;

  return { subject, html, text };
}

// ── Scheduled Report Email ──────────────────────────────────────────────

interface ScheduledReportEmailData {
  reportTitle: string;
  tenantName: string;
  period: string;
  metrics: Array<{ label: string; value: string | number }>;
  format: string;
  generatedAt: string;
  downloadUrl?: string;
}

export function buildScheduledReportEmail(
  data: ScheduledReportEmailData,
): { subject: string; html: string; text: string } {
  const subject = `[TPT Police] Scheduled Report: ${data.reportTitle}`;

  const metricsRows = data.metrics
    .map(
      (m) => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; color: #71717a; font-size: 14px;">${escapeHtml(m.label)}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e4e4e7; font-weight: 600; font-size: 14px;">${m.value}</td>
      </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .card { background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { border-bottom: 3px solid #1e40af; padding-bottom: 16px; margin-bottom: 24px; }
    .header h1 { color: #1e40af; font-size: 24px; margin: 0; }
    .meta { color: #71717a; font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { text-align: left; padding: 8px 12px; background: #f4f4f5; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #71717a; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e4e4e7; font-size: 14px; color: #71717a; }
    .btn { display: inline-block; background: #1e40af; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>${escapeHtml(data.reportTitle)}</h1>
        <p style="color: #71717a; margin: 4px 0 0;">${escapeHtml(data.tenantName)}</p>
      </div>
      <div class="meta">
        <strong>Period:</strong> ${data.period}<br />
        <strong>Format:</strong> ${data.format.toUpperCase()}<br />
        <strong>Generated:</strong> ${data.generatedAt}
      </div>
      <table>
        <thead>
          <tr><th>Metric</th><th>Value</th></tr>
        </thead>
        <tbody>
          ${metricsRows}
        </tbody>
      </table>
      ${
        data.downloadUrl
          ? `<div style="text-align: center;"><a href="${data.downloadUrl}" class="btn">Download Full Report</a></div>`
          : ""
      }
      <div class="footer">
        <p>This is an automated report from TPT Police Analytics.</p>
        <p>To update your report preferences, log in to the TPT Police platform.</p>
        <p>\u00a9 ${new Date().getFullYear()} TPT Police. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `
TPT Police — Scheduled Report
=============================

Report: ${data.reportTitle}
Tenant: ${data.tenantName}
Period: ${data.period}
Format: ${data.format.toUpperCase()}
Generated: ${data.generatedAt}

Metrics:
${data.metrics.map((m) => `  ${m.label}: ${m.value}`).join("\n")}

${data.downloadUrl ? `Download: ${data.downloadUrl}` : ""}

This is an automated report from TPT Police Analytics.
To update your report preferences, log in to the TPT Police platform.

© ${new Date().getFullYear()} TPT Police. All rights reserved.
`;

  return { subject, html, text };
}

// ── Utility ────────────────────────────────────────────────────────────

const AMP = "&".concat("amp;");
const LT = "&".concat("lt;");
const GT = "&".concat("gt;");
const QUOT = "&".concat("quot;");
const HASH_039 = "&".concat("#039;");

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, AMP)
    .replace(/</g, LT)
    .replace(/>/g, GT)
    .replace(/"/g, QUOT)
    .replace(/'/g, HASH_039);
}