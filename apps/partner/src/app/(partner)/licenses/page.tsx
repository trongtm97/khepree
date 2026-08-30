import type { Metadata } from "next";
import { redirectUnscoped } from "@/lib/unscoped-redirect";

export const metadata: Metadata = { title: "Licenses" };

export default async function LicensesRedirectPage() {
  await redirectUnscoped("licenses");
}
