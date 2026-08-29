import { eq } from "drizzle-orm";
import { memberships, organizations, requireDb, userProfiles } from "@khepree/db";
import type { Database } from "@khepree/db";

export async function ensureUserProfile(
  db: Database,
  input: { userId: string; name?: string | null },
): Promise<void> {
  const existing = await db
    .select({ id: userProfiles.id })
    .from(userProfiles)
    .where(eq(userProfiles.userId, input.userId))
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(userProfiles).values({
    userId: input.userId,
  });
}

export async function ensureUserProfileById(userId: string): Promise<void> {
  const db = requireDb();
  await ensureUserProfile(db, { userId });
}

export async function getUserOrgMemberships(userId: string) {
  const db = requireDb();
  return db
    .select({
      orgName: organizations.name,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, userId));
}
