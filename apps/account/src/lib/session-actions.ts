"use server";

import { revokeOtherActiveSessions, revokeSessionById } from "@khepree/auth/session";
import { revalidatePath } from "next/cache";

export async function revokeSessionAction(sessionId: string) {
  await revokeSessionById(sessionId);
  revalidatePath("/sessions");
  revalidatePath("/security");
}

export async function revokeOtherSessionsAction() {
  await revokeOtherActiveSessions();
  revalidatePath("/sessions");
  revalidatePath("/security");
}
