import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

export function createKhepreeAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    plugins: [twoFactorClient()],
  });
}

export type KhepreeAuthClient = ReturnType<typeof createKhepreeAuthClient>;
