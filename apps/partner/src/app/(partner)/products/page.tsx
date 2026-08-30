import type { Metadata } from "next";
import { redirectUnscoped } from "@/lib/unscoped-redirect";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsRedirectPage() {
  await redirectUnscoped("products");
}
