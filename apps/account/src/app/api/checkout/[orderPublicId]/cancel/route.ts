import { requireSession } from "@khepree/auth/session";
import { isCommerceError } from "@khepree/commerce";
import { getCommerce } from "@/lib/commerce";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ orderPublicId: string }> },
) {
  const session = await requireSession();
  const { orderPublicId } = await context.params;

  try {
    const order = await getCommerce().cancelOrderForOwner({
      orderPublicId,
      owner: { type: "user", userId: session.user.id },
      actorUserId: session.user.id,
    });
    return Response.json({ data: { status: order.status, orderPublicId: order.publicId } });
  } catch (error) {
    if (isCommerceError(error)) {
      const status =
        error.code === "NOT_FOUND" ? 404 : error.code === "INVALID_TRANSITION" ? 409 : 400;
      return Response.json({ error: { code: error.code, message: error.message } }, { status });
    }
    throw error;
  }
}
