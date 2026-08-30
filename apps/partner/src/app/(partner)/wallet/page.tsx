import type { Metadata } from "next";
import { redirectUnscoped } from "@/lib/unscoped-redirect";

export const metadata: Metadata = { title: "Wallet" };

export default async function WalletRedirectPage() {
  await redirectUnscoped("wallet");
}
