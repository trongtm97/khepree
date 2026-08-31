import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

function resolveClientBaseUrl(baseURL?: string): string | undefined {
  if (baseURL) return baseURL;
  if (typeof window !== "undefined") return window.location.origin;
  return undefined;
}

export function createKhepreeAuthClient(baseURL?: string) {
  const resolved = resolveClientBaseUrl(baseURL);
  return createAuthClient({
    ...(resolved ? { baseURL: resolved } : {}),
    plugins: [twoFactorClient()],
  });
}

export type KhepreeAuthClient = ReturnType<typeof createKhepreeAuthClient>;
