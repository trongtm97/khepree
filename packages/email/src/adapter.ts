import { isEmailConfigured } from "@khepree/config";
import type { EmailAdapter, SendEmailInput } from "./index";

/** Development-only — logs email content; never claims production delivery. */
export class DevPreviewEmailAdapter implements EmailAdapter {
  readonly status = "mock" as const;

  async send(input: SendEmailInput): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    console.info("\n[khepree:email:dev-preview] ─────────────────────────");
    console.info("Status: NOT SENT (development preview only)");
    console.info(`To: ${input.to}`);
    console.info(`Subject: ${input.subject}`);
    if (input.text) console.info(`Text:\n${input.text}`);
    console.info(`HTML length: ${input.html.length} chars`);
    console.info("─────────────────────────────────────────────────\n");
    return { id };
  }
}

export function createEmailAdapter(): EmailAdapter {
  if (isEmailConfigured()) {
    // ponytail: production provider wired in Phase 05+ — dev preview until then
    return new DevPreviewEmailAdapter();
  }
  return new DevPreviewEmailAdapter();
}
