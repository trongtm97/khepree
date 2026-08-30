import { getEnv, isEmailConfigured, DEFAULT_LOCALE, isSupportedLocale } from "@khepree/config";
import { createEmailAdapter, renderTransactionalEmail } from "@khepree/email";

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

export function verificationEmailContent(url: string, name?: string | null, locale = DEFAULT_LOCALE) {
  const copy = renderTransactionalEmail("verify_email", isSupportedLocale(locale) ? locale : DEFAULT_LOCALE);
  const greeting = name ? (locale === "en" ? `Hi ${name},` : `Xin chào ${name},`) : copy.text;
  return {
    subject: copy.subject,
    text: `${greeting}\n${url}`,
    html: `<p>${greeting}</p><p><a href="${url}">${url}</a></p>`,
  };
}

export function resetPasswordEmailContent(url: string, name?: string | null, locale = DEFAULT_LOCALE) {
  const copy = renderTransactionalEmail("password_reset", isSupportedLocale(locale) ? locale : DEFAULT_LOCALE);
  const greeting = name ? (locale === "en" ? `Hi ${name},` : `Xin chào ${name},`) : copy.text;
  return {
    subject: copy.subject,
    text: `${greeting}\n${url}`,
    html: `<p>${greeting}</p><p><a href="${url}">${url}</a></p>`,
  };
}
