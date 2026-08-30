import type { Metadata } from "next";
import { redirectUnscoped } from "@/lib/unscoped-redirect";

export const metadata: Metadata = { title: "Team" };

export default async function TeamRedirectPage() {
  await redirectUnscoped("team");
}
