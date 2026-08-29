/** @khepree/email — transactional email adapter */
export type EmailStatus = "configured" | "not_configured" | "mock";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailAdapter {
  status: EmailStatus;
  send(input: SendEmailInput): Promise<{ id: string }>;
}

export class MockEmailAdapter implements EmailAdapter {
  status: EmailStatus = "mock";
  async send(input: SendEmailInput) {
    console.info("[email:mock]", input.to, input.subject);
    return { id: crypto.randomUUID() };
  }
}

export { createEmailAdapter, DevPreviewEmailAdapter } from "./adapter";

