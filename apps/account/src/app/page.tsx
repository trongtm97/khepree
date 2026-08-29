import { redirect } from "next/navigation";
import { getSession } from "@khepree/auth/session";
import { AUTH_ROUTES, PROTECTED_ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

/** Server-side fallback when proxy is not hit. */
export default async function HomePage() {
  const session = await getSession();
  redirect(session ? PROTECTED_ROUTES.dashboard : AUTH_ROUTES.signIn);
}
