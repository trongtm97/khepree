import type { Metadata } from "next";
import { redirectUnscoped } from "@/lib/unscoped-redirect";

export const metadata: Metadata = { title: "Commissions" };

export default async function CommissionsRedirectPage() {
  await redirectUnscoped("commissions");
}
