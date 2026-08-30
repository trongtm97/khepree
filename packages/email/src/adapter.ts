import { getEnv, isEmailConfigured } from "@khepree/config";
import type { EmailAdapter, SendEmailInput } from "./index";

/** Development-only — logs email content; never claims production delivery. */
export class DevPreviewEmailAdapter implements EmailAdapter {
  readonly status = "mock" as const;

  async send(input: SendEmailInput): Promise<{ id: string }> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("DevPreviewEmailAdapter cannot send mail in production");
    }
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

export class ResendEmailAdapter implements EmailAdapter {
  readonly status = "configured" as const;

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(input: SendEmailInput): Promise<{ id: string }> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!response.ok) {
      throw new Error(`Resend rejected email (${response.status})`);
    }
    const body = (await response.json()) as { id?: string };
    return { id: body.id ?? crypto.randomUUID() };
  }
}

export function createEmailAdapter(): EmailAdapter {
  const env = getEnv();
  const provider = process.env.EMAIL_PROVIDER ?? env.EMAIL_PROVIDER ?? "dev";
  if (env.NODE_ENV === "production") {
    if (provider !== "resend" || !isEmailConfigured(env) || !env.EMAIL_PROVIDER_API_KEY || !env.EMAIL_FROM) {
      throw new Error("Production email is not configured (EMAIL_PROVIDER=resend plus EMAIL_FROM and EMAIL_PROVIDER_API_KEY)");
    }
    return new ResendEmailAdapter(env.EMAIL_PROVIDER_API_KEY, env.EMAIL_FROM);
  }
  if (provider === "resend" && isEmailConfigured(env) && env.EMAIL_PROVIDER_API_KEY && env.EMAIL_FROM) {
    return new ResendEmailAdapter(env.EMAIL_PROVIDER_API_KEY, env.EMAIL_FROM);
  }
  return new DevPreviewEmailAdapter();
}
