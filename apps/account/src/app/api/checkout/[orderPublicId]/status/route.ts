import { requireSession } from "@khepree/auth/session";
import { getCommerce } from "@/lib/commerce";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ orderPublicId: string }> },
) {
  const session = await requireSession();
  const { orderPublicId } = await context.params;
  const commerce = getCommerce();
  const order = await commerce.getOrderForOwner(orderPublicId, {
    type: "user",
    userId: session.user.id,
  });
  if (!order) {
    return Response.json({ error: { code: "NOT_FOUND", message: "Order not found" } }, { status: 404 });
  }
  return Response.json({ data: { status: order.status, orderPublicId: order.publicId } });
}
