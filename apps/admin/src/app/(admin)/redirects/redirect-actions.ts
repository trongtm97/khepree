"use server";

import { isSafeRedirectPath, normalizeRedirectPath } from "@khepree/catalog";
import { insertUrlRedirect, deleteUrlRedirect } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { requireAdmin } from "@/lib/admin-session";

export async function createRedirectAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin("content.write");
  if (!hasPermission({ globalRole: session.globalRole }, "content.write")) {
    return { error: "Forbidden" };
  }
  const fromPath = normalizeRedirectPath(String(formData.get("fromPath") ?? ""));
  const toPath = normalizeRedirectPath(String(formData.get("toPath") ?? ""));
  const status = Number(formData.get("status") ?? 308);
  if (!isSafeRedirectPath(fromPath) || !isSafeRedirectPath(toPath)) {
    return { error: "Đường dẫn phải bắt đầu bằng / và không được là URL ngoài." };
  }
  if (status !== 301 && status !== 308) return { error: "Status phải là 301 hoặc 308" };
  await insertUrlRedirect({
    fromPath,
    toPath,
    status,
    note: String(formData.get("note") ?? "").trim() || null,
  });
  revalidatePath("/redirects");
  return { notice: "Đã tạo chuyển hướng" };
}

export async function deleteRedirectAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin("content.write");
  if (!hasPermission({ globalRole: session.globalRole }, "content.write")) {
    return { error: "Forbidden" };
  }
  const id = String(formData.get("id") ?? "");
  await deleteUrlRedirect(id);
  revalidatePath("/redirects");
  return { notice: "Đã xóa chuyển hướng" };
}
