import { marketingPublicUrl, type SupportedLocale } from "@khepree/config";
import type { AccountMessages } from "./messages";

export function mapAuthError(
  message: string | undefined | null,
  copy: AccountMessages["auth"],
): string {
  if (!message) return copy.errors.generic;
  const lower = message.toLowerCase();

  if (lower.includes("invalid") && (lower.includes("password") || lower.includes("credential"))) {
    return copy.errors.invalidCredentials;
  }
  if (lower.includes("already") || lower.includes("exists") || lower.includes("duplicate")) {
    return copy.errors.emailExists;
  }
  if (lower.includes("password") && (lower.includes("short") || lower.includes("weak"))) {
    return copy.errors.weakPassword;
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return copy.errors.network;
  }
  if (lower.includes("google") || lower.includes("oauth") || lower.includes("social")) {
    return copy.errors.googleFailed;
  }

  return copy.errors.generic;
}

/** Maps Better Auth OAuth callback ?error= values to user-facing copy. */
export function mapOAuthCallbackError(
  code: string | null | undefined,
  copy: AccountMessages["auth"],
): string | null {
  if (!code) return null;
  const lower = code.toLowerCase().replace(/-/g, "_");
  if (lower === "access_denied" || lower === "user_cancelled" || lower === "cancelled") {
    return copy.errors.googleCancelled;
  }
  if (lower.includes("account_not_linked") || lower.includes("not_linked")) {
    return copy.errors.accountNotLinked;
  }
  if (lower.includes("google") || lower.includes("oauth") || lower.includes("social")) {
    return copy.errors.googleFailed;
  }
  return copy.errors.googleFailed;
}

export type AuthCopy = AccountMessages["auth"];

export function marketingLegalUrl(locale: SupportedLocale, doc: "terms" | "privacy"): string {
  return `${marketingPublicUrl()}/${locale}/${doc}`;
}
