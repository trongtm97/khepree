import { getEnv, isEmailConfigured, mailFromAddress, emitAlert, createLogger } from "@khepree/config";
import type { EmailAdapter, SendEmailInput } from "./index";
import { SmtpEmailAdapter } from "./smtp-adapter";

const log = createLogger("email");

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
    private readonly from: string,
    private readonly replyTo: string | undefined,
    private readonly apiKey: string,
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
        ...(this.replyTo ? { reply_to: this.replyTo } : {}),
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!response.ok) {
      emitAlert("error", "email_send_failed", { status: response.status, to: input.to });
      log.error({ event: "email_send_failed", status: response.status, to: input.to });
      throw new Error(`Resend rejected email (${response.status})`);
    }
    const body = (await response.json()) as { id?: string };
    return { id: body.id ?? crypto.randomUUID() };
  }
}

function createProductionEmailAdapter(env: ReturnType<typeof getEnv>): EmailAdapter {
  const from = mailFromAddress(env);
  if (!from) {
    throw new Error("Production email requires MAIL_FROM or EMAIL_FROM");
  }
  const replyTo = env.MAIL_REPLY_TO?.trim() || undefined;

  if (env.EMAIL_PROVIDER === "smtp") {
    if (!env.SMTP_HOST || !env.SMTP_PORT) {
      throw new Error("Production SMTP requires SMTP_HOST and SMTP_PORT");
    }
    return new SmtpEmailAdapter(
      from,
      replyTo,
      env.SMTP_HOST,
      env.SMTP_PORT,
      env.SMTP_SECURE === "true",
      env.SMTP_USER?.trim() || undefined,
      env.SMTP_PASS?.trim() || undefined,
    );
  }

  if (env.EMAIL_PROVIDER === "resend") {
    if (!env.EMAIL_PROVIDER_API_KEY) {
      throw new Error("Production Resend requires EMAIL_PROVIDER_API_KEY");
    }
    return new ResendEmailAdapter(from, replyTo, env.EMAIL_PROVIDER_API_KEY);
  }

  throw new Error(`Production email provider ${env.EMAIL_PROVIDER} is not configured`);
}

export function createEmailAdapter(): EmailAdapter {
  const env = getEnv();
  const provider = env.EMAIL_PROVIDER ?? "dev";

  if (env.NODE_ENV === "production") {
    if (provider === "dev" || !isEmailConfigured(env)) {
      throw new Error(
        "Production email is not configured (EMAIL_PROVIDER=resend|smtp with complete settings)",
      );
    }
    return createProductionEmailAdapter(env);
  }

  if (provider === "smtp" && isEmailConfigured(env)) {
    return createProductionEmailAdapter(env);
  }

  if (provider === "resend" && isEmailConfigured(env) && env.EMAIL_PROVIDER_API_KEY) {
    return createProductionEmailAdapter(env);
  }

  return new DevPreviewEmailAdapter();
}

export { SmtpEmailAdapter } from "./smtp-adapter";
