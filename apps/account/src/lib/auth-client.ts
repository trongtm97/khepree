"use client";

import { createKhepreeAuthClient } from "@khepree/auth/client";

export const authClient = createKhepreeAuthClient(
  process.env.NEXT_PUBLIC_ACCOUNT_URL ?? "http://localhost:3001",
);
