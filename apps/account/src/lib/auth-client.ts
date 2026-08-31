"use client";

import { createKhepreeAuthClient } from "@khepree/auth/client";

/** Same-origin — avoids baking localhost into the client bundle when NEXT_PUBLIC_* is unset at build. */
export const authClient = createKhepreeAuthClient();
