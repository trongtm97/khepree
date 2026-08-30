import nodemailer from "nodemailer";
import { emitAlert, createLogger } from "@khepree/config";
import type { EmailAdapter, SendEmailInput } from "./index";

const log = createLogger("email");

export class SmtpEmailAdapter implements EmailAdapter {
  readonly status = "configured" as const;

  constructor(
    private readonly from: string,
    private readonly replyTo: string | undefined,
    private readonly host: string,
    private readonly port: number,
    private readonly secure: boolean,
    private readonly user: string | undefined,
    private readonly pass: string | undefined,
  ) {}

  async send(input: SendEmailInput): Promise<{ id: string }> {
    const transport = nodemailer.createTransport({
      host: this.host,
      port: this.port,
      secure: this.secure,
      ...(this.user && this.pass ? { auth: { user: this.user, pass: this.pass } } : {}),
    });

    try {
      const info = await transport.sendMail({
        from: this.from,
        ...(this.replyTo ? { replyTo: this.replyTo } : {}),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      return { id: info.messageId || crypto.randomUUID() };
    } catch (error) {
      emitAlert("error", "email_send_failed", { provider: "smtp", to: input.to });
      log.error({ event: "email_send_failed", provider: "smtp", to: input.to });
      throw error instanceof Error ? error : new Error("SMTP send failed");
    }
  }
}
