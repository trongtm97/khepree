import type { Metadata } from "next";
import { redirectUnscoped } from "@/lib/unscoped-redirect";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersRedirectPage() {
  await redirectUnscoped("customers");
}
