import { getEnv } from "@khepree/config";
import { revalidatePath, updateTag } from "next/cache";

function isAuthorized(request: Request): boolean {
  const secret = getEnv().OUTBOX_WORKER_SECRET;
  if (!secret || secret.includes("CHANGE_ME")) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Internal ISR purge — called from admin after product publish. */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { tags?: string[]; paths?: string[] } = {};
  try {
    body = (await request.json()) as { tags?: string[]; paths?: string[] };
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  for (const tag of body.tags ?? []) updateTag(tag);
  for (const path of body.paths ?? []) revalidatePath(path);

  return Response.json({ ok: true, tags: body.tags?.length ?? 0, paths: body.paths?.length ?? 0 });
}
