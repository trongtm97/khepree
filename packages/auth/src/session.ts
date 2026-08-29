import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasPermission, type Permission, type PermissionContext } from "@khepree/security";
import type { GlobalRole } from "@khepree/types";
import { memberships, requireDb, userProfiles } from "@khepree/db";
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
    token: string;
  };
  globalRole: GlobalRole;
  orgIds: string[];
}

export async function getSession(): Promise<AuthenticatedSession | null> {
  const auth = getAuth();
  const headerStore = await headers();
  const result = await auth.api.getSession({ headers: headerStore });

  if (!result?.user || !result.session) return null;

  const db = requireDb();
  const [profile] = await db
    .select({ globalRole: userProfiles.globalRole })
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
      token: result.session.token,
    },
    globalRole: profile?.globalRole ?? "USER",
    orgIds: orgRows.map((row) => row.organizationId),
  };
}

export async function requireSession(redirectTo = "/sign-in"): Promise<AuthenticatedSession> {
  const session = await getSession();
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
): Promise<AuthenticatedSession> {
  const session = await requireSession();
  const ctx: PermissionContext = { globalRole: session.globalRole };
  if (!hasPermission(ctx, permission)) {
    redirect(redirectTo);
  }
  return session;
}

export async function getOptionalSession(): Promise<AuthenticatedSession | null> {
  try {
    return await getSession();
  } catch {
    return null;
  }
}

export interface SessionRow {
  id: string;
  token: string;
  createdAt?: Date | string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function listActiveSessions(): Promise<SessionRow[]> {
  const auth = getAuth();
  const headerStore = await headers();
  const result = await auth.api.listSessions({ headers: headerStore });
  return (result ?? []) as SessionRow[];
}
