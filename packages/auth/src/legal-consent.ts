import { and, eq } from "drizzle-orm";
import { requireDb, userConsents } from "@khepree/db";

/** Bump when marketing terms/privacy change materially. */
export const LEGAL_DOCUMENT_VERSION = "2026-08-30";

const REQUIRED_TYPES = ["TERMS", "PRIVACY"] as const;

export async function hasRequiredLegalConsent(userId: string): Promise<boolean> {
  const db = requireDb();
  const rows = await db
    .select({ documentType: userConsents.documentType })
    .from(userConsents)
    .where(
      and(
        eq(userConsents.userId, userId),
        eq(userConsents.documentVersion, LEGAL_DOCUMENT_VERSION),
      ),
    );

  const accepted = new Set(rows.map((row) => row.documentType));
  return REQUIRED_TYPES.every((type) => accepted.has(type));
}

export async function recordLegalConsents(userId: string): Promise<void> {
  const db = requireDb();
  const now = new Date();

  for (const documentType of REQUIRED_TYPES) {
    await db
      .insert(userConsents)
      .values({
        userId,
        documentType,
        documentVersion: LEGAL_DOCUMENT_VERSION,
        acceptedAt: now,
      })
      .onConflictDoNothing();
  }
}
