import { NextResponse } from "next/server";
import { assertSafeObjectKey, getPublicObjectStorage } from "@khepree/storage";

export const runtime = "nodejs";

/** Serve public bucket objects when CDN cannot read private Vietnix buckets (`S3_PUBLIC_ACCESS_MODE=none`). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const segments = (await context.params).path;
  if (!segments?.length) {
    return new NextResponse("Not found", { status: 404 });
  }

  const objectKey = `pub/${segments.map((segment) => decodeURIComponent(segment)).join("/")}`;

  try {
    assertSafeObjectKey(objectKey);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const storage = getPublicObjectStorage();
  const head = await storage.headObject(objectKey, "public");
  if (!head) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = await storage.getObject(objectKey, "public");
  if (!body) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": head.contentType ?? "application/octet-stream",
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
