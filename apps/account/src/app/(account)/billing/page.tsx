import type { Metadata } from "next";
import { AccountEmptyPage } from "@/lib/empty-page";

export const metadata: Metadata = { title: "Billing" };

export default function BillingPage() {
  return (
    <AccountEmptyPage
      title="Billing"
      description="No billing history yet"
    />
  );
}
