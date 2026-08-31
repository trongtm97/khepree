import { requireSession, type AuthenticatedSession } from "@khepree/auth/session";
import {
  hasAnyPermission,
  hasPermission,
  type Permission,
} from "@khepree/security";
import { redirect } from "next/navigation";
import { adminAuthBaseUrl } from "./admin";

export async function requireAdmin(permission?: Permission): Promise<AuthenticatedSession> {
  const session = await requireSession("/sign-in", adminAuthBaseUrl());
  const ctx = { globalRole: session.globalRole };
  if (!hasPermission(ctx, "admin.access")) {
    redirect("/unauthorized");
  }
  if (permission && !hasPermission(ctx, permission)) {
    redirect("/forbidden");
  }
  return session;
}

export async function requireAdminAny(permissions: Permission[]): Promise<AuthenticatedSession> {
  const session = await requireAdmin();
  if (!hasAnyPermission({ globalRole: session.globalRole }, permissions)) {
    redirect("/forbidden");
  }
  return session;
}
