import type { Metadata } from "next";
import { redirectUnscoped } from "@/lib/unscoped-redirect";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersRedirectPage() {
  await redirectUnscoped("orders");
}
