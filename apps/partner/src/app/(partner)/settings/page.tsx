import type { Metadata } from "next";
import { redirectUnscoped } from "@/lib/unscoped-redirect";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsRedirectPage() {
  await redirectUnscoped("settings");
}
