import { redirect } from "next/navigation";
import { createEmptyStudioProductAction } from "@/app/(admin)/products/studio-actions";
import { requireAdmin } from "@/lib/admin-session";

export default async function NewProductPage() {
  await requireAdmin("catalog.write");
  const result = await createEmptyStudioProductAction();
  if (result.redirectTo) redirect(result.redirectTo);
  redirect("/products");
}
