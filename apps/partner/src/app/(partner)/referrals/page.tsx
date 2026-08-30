import type { Metadata } from "next";
import { redirectUnscoped } from "@/lib/unscoped-redirect";

export const metadata: Metadata = { title: "Referrals" };

export default async function ReferralsRedirectPage() {
  await redirectUnscoped("referrals");
}
