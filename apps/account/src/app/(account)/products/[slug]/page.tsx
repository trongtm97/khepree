import { requireSession } from "@khepree/auth/session";
import { getEnv } from "@khepree/config";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildAccountProductHubView } from "@/lib/account-product-hub";
import { getPlatform } from "@/lib/commerce";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";
import { ProductHubPage } from "./product-hub-view";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: slug };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ clientId?: string }>;
}) {
  const session = await requireSession();
  const { slug } = await params;
  const query = await searchParams;
  const locale = await accountLocaleFromCookies(session.locale);
  const copy = accountMessages(locale);
  const env = getEnv();
  const accountUrl = env.ACCOUNT_URL || "http://localhost:3001";

  let validatedDesktopClientId: string | undefined;
  if (query.clientId) {
    const client = await getPlatform().desktopAuth.resolveClient(query.clientId).catch(() => null);
    if (client?.status === "active") validatedDesktopClientId = client.clientId;
  }

  const view = await buildAccountProductHubView(getPlatform(), {
    userId: session.user.id,
    slug,
    locale,
    accountUrl,
    validatedDesktopClientId,
  });

  if (!view) notFound();

  return <ProductHubPage view={view} copy={copy} />;
}
