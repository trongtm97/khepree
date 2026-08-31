import { SENSITIVE_ACTION_MAX_AGE_SECONDS } from "@khepree/config";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { requireDb, session as sessionTable } from "@khepree/db";
import type { AuthenticatedSession } from "./session";
import { getSession, requireSession } from "./session";

export class AuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

/** Server-enforced recent authentication for sensitive self-service actions. */
export async function assertRecentAuth(
  maxAgeSeconds = SENSITIVE_ACTION_MAX_AGE_SECONDS,
  authBaseURL?: string,
): Promise<AuthenticatedSession> {
  const session = await requireSession("/sign-in", authBaseURL);
  const db = requireDb();
  const [row] = await db
    .select({ updatedAt: sessionTable.updatedAt, createdAt: sessionTable.createdAt })
    .from(sessionTable)
    .where(and(eq(sessionTable.id, session.session.id), eq(sessionTable.userId, session.user.id)))
    .limit(1);

  if (!row) {
    throw new AuthError("RECENT_AUTH_REQUIRED", "Recent authentication required");
  }

  const anchor = row.updatedAt ?? row.createdAt;
  const elapsed = (Date.now() - anchor.getTime()) / 1000;
  if (elapsed > maxAgeSeconds) {
    throw new AuthError("RECENT_AUTH_REQUIRED", "Recent authentication required");
  }

  return session;
}

/** Returns whether the current session satisfies recent-auth without throwing. */
export async function hasRecentAuth(
  maxAgeSeconds = SENSITIVE_ACTION_MAX_AGE_SECONDS,
  authBaseURL?: string,
): Promise<boolean> {
  const session = await getSession(authBaseURL);
  if (!session) return false;

  const db = requireDb();
  const [row] = await db
    .select({ updatedAt: sessionTable.updatedAt, createdAt: sessionTable.createdAt })
    .from(sessionTable)
    .where(and(eq(sessionTable.id, session.session.id), eq(sessionTable.userId, session.user.id)))
    .limit(1);

  if (!row) return false;
  const anchor = row.updatedAt ?? row.createdAt;
  const elapsed = (Date.now() - anchor.getTime()) / 1000;
  return elapsed <= maxAgeSeconds;
}

/** Bump session updatedAt after successful step-up (password/MFA reconfirm). */
export async function touchSessionForStepUp(sessionId: string, userId: string): Promise<void> {
  const db = requireDb();
  await db
    .update(sessionTable)
    .set({ updatedAt: new Date() })
    .where(and(eq(sessionTable.id, sessionId), eq(sessionTable.userId, userId)));
}

export async function recentAuthRedirectTarget(nextPath: string): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "https";
  const base = host ? `${proto}://${host}` : "";
  const next = encodeURIComponent(nextPath.startsWith("/") ? nextPath : `/${nextPath}`);
  return `${base}/sign-in?next=${next}&stepUp=1`;
}
