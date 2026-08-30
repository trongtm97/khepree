import { findActiveUrlRedirect } from "@khepree/db";
import { normalizeRedirectPath } from "@khepree/catalog";

export async function matchPublicRedirect(
  pathname: string,
): Promise<{ toPath: string; status: 301 | 308 } | null> {
  const fromPath = normalizeRedirectPath(pathname);
  const row = await findActiveUrlRedirect(fromPath);
  if (!row) return null;
  const status = row.status === 301 ? 301 : 308;
  return { toPath: row.toPath, status };
}
