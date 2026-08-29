import { getEnv, isEmailConfigured } from "@khepree/config";
import { createEmailAdapter } from "@khepree/email";

const env = getEnv();

export function getAuthBaseUrl(): string {
  return env.BETTER_AUTH_URL ?? env.ACCOUNT_URL ?? "http://localhost:3001";
}

export function getTrustedOrigins(): string[] {
  return Array.from(
    new Set(
      [env.BETTER_AUTH_URL, env.ACCOUNT_URL, env.APP_URL, env.ADMIN_URL, env.PARTNER_URL].filter(
        (v): v is string => Boolean(v),
      ),
    ),
  );
}

export async function sendAuthEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const adapter = createEmailAdapter();
  await adapter.send(input);

  if (!isEmailConfigured()) {
    console.info(
      `[khepree:auth:email] Provider not configured — preview only (status: ${adapter.status})`,
    );
  }
}

export function verificationEmailContent(url: string, name?: string | null) {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return {
    subject: "Verify your Khepree email",
    text: `${greeting}\n\nVerify your email address:\n${url}\n\nIf you did not create an account, you can ignore this message.`,
    html: `<p>${greeting}</p><p>Verify your email address:</p><p><a href="${url}">${url}</a></p><p>If you did not create an account, you can ignore this message.</p>`,
  };
}

export function resetPasswordEmailContent(url: string, name?: string | null) {
  const greeting = name ? `Hi ${name},` : "Hi,";
  return {
    subject: "Reset your Khepree password",
    text: `${greeting}\n\nReset your password:\n${url}\n\nIf you did not request this, you can ignore this message.`,
    html: `<p>${greeting}</p><p>Reset your password:</p><p><a href="${url}">${url}</a></p><p>If you did not request this, you can ignore this message.</p>`,
  };
}
