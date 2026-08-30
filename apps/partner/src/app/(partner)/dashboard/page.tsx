import type { Metadata } from "next";
import { redirectUnscoped } from "@/lib/unscoped-redirect";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardRedirectPage() {
  await redirectUnscoped("dashboard");
}
