import { EmptyState, PageHeader, PartnerShell } from "@khepree/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Partner — Khepree",
};

export default function PartnerHomePage() {
  return (
    <PartnerShell>
      <PageHeader
        title="Partner dashboard"
        description="Reseller and affiliate shell — partner domain ships after entitlement core."
      />
      <div className="mt-8">
        <EmptyState
          title="Partner portal placeholder"
          description="Referrals, commissions, and wallet views will be available in a future phase."
        />
      </div>
    </PartnerShell>
  );
}
