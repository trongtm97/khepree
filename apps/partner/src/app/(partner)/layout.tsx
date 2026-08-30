import { requirePartnerContext } from "@/lib/partner-session";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function PartnerLayout({ children }: { children: ReactNode }) {
  await requirePartnerContext();
  return children;
}
