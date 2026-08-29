import type { Metadata } from "next";
import { AccountEmptyPage } from "@/lib/empty-page";

export const metadata: Metadata = { title: "Licenses" };

export default function LicensesPage() {
  return (
    <AccountEmptyPage
      title="Licenses"
      description="No active licenses"
    />
  );
}
