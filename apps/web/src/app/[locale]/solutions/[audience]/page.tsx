import { notFound, permanentRedirect } from "next/navigation";
import { isSupportedLocale, localePath } from "@/lib/i18n/config";

export default async function SolutionAudiencePage({
  params,
}: {
  params: Promise<{ locale: string; audience: string }>;
}) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) notFound();
  permanentRedirect(localePath(raw, "/products"));
}
