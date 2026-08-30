import { cache } from "react";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, isSupportedLocale } from "@khepree/config";
import { hasPermission, type Permission, type PermissionContext } from "@khepree/security";
import type { GlobalRole } from "@khepree/types";
import { memberships, requireDb, session as sessionTable, userProfiles } from "@khepree/db";
import { getAuth } from "./server";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  twoFactorEnabled?: boolean;
}

export interface AuthenticatedSession {
  user: SessionUser;
  session: {
    id: string;
  };
  globalRole: GlobalRole;
  locale: string;
  orgIds: string[];
}

export const getSession = cache(async function getSession(
  authBaseURL?: string,
): Promise<AuthenticatedSession | null> {
  const auth = getAuth(authBaseURL);
  const headerStore = await headers();
  const result = await auth.api.getSession({ headers: headerStore });

  if (!result?.user || !result.session) return null;

  const db = requireDb();
  const [profile] = await db
    .select({ globalRole: userProfiles.globalRole, locale: userProfiles.locale })
    .from(userProfiles)
    .where(eq(userProfiles.userId, result.user.id))
    .limit(1);

  const orgRows = await db
    .select({ organizationId: memberships.organizationId })
    .from(memberships)
    .where(eq(memberships.userId, result.user.id));

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      emailVerified: result.user.emailVerified,
      image: result.user.image,
      twoFactorEnabled: Boolean(result.user.twoFactorEnabled),
    },
    session: {
      id: result.session.id,
    },
    globalRole: profile?.globalRole ?? "USER",
    locale: isSupportedLocale(profile?.locale) ? profile.locale : DEFAULT_LOCALE,
    orgIds: orgRows.map((row) => row.organizationId),
  };
});

export async function requireSession(
  redirectTo = "/sign-in",
  authBaseURL?: string,
): Promise<AuthenticatedSession> {
  const session = await getSession(authBaseURL);
  if (!session) {
    redirect(redirectTo);
  }
  return session;
}

export async function requireUser(): Promise<SessionUser> {
  const session = await requireSession();
  return session.user;
}

export async function requirePermission(
  permission: Permission,
  redirectTo = "/dashboard",
  authBaseURL?: string,
): Promise<AuthenticatedSession> {
  const session = await requireSession(redirectTo, authBaseURL);
  const ctx: PermissionContext = { globalRole: session.globalRole };
  if (!hasPermission(ctx, permission)) {
    redirect(redirectTo);
  }
  return session;
}

export async function getOptionalSession(authBaseURL?: string): Promise<AuthenticatedSession | null> {
  return getSession(authBaseURL);
}

export interface SessionRow {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date | string;
  isCurrent?: boolean;
}

export async function listActiveSessions(): Promise<SessionRow[]> {
  const auth = getAuth();
  const headerStore = await headers();
  const [sessions, current] = await Promise.all([
    auth.api.listSessions({ headers: headerStore }),
    auth.api.getSession({ headers: headerStore }),
  ]);
  const currentId = current?.session?.id;

  return (sessions ?? []).map((row) => ({
    id: row.id,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    isCurrent: row.id === currentId,
  }));
}

/** Server-only: resolve session token for revoke API (better-auth 1.7.x is token-based). */
async function getInternalSessionToken(sessionId: string, userId: string): Promise<string | null> {
  const db = requireDb();
  const [row] = await db
    .select({ token: sessionTable.token })
    .from(sessionTable)
    .where(and(eq(sessionTable.id, sessionId), eq(sessionTable.userId, userId)))
    .limit(1);

  return row?.token ?? null;
}

export async function revokeSessionById(sessionId: string): Promise<void> {
  const current = await getSession();
  if (!current) {
    throw new Error("Unauthorized");
  }

  const token = await getInternalSessionToken(sessionId, current.user.id);
  if (!token) {
    throw new Error("Session not found");
  }

  const auth = getAuth();
  const headerStore = await headers();
  await auth.api.revokeSession({ body: { token }, headers: headerStore });
}

export async function revokeOtherActiveSessions(): Promise<void> {
  const current = await getSession();
  if (!current) {
    throw new Error("Unauthorized");
  }

  const auth = getAuth();
  const headerStore = await headers();
  await auth.api.revokeOtherSessions({ headers: headerStore });
}
