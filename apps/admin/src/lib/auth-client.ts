"use client";

import { createKhepreeAuthClient } from "@khepree/auth/client";

export const authClient = createKhepreeAuthClient(
  process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3002",
);
