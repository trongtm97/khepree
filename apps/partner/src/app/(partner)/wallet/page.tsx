import { Card, CardDescription, CardTitle } from "@khepree/ui";
import type { Metadata } from "next";
import { PartnerEmpty } from "@/components/partner-empty";
import { formatMoney } from "@/lib/format";
import { getPartnerService } from "@/lib/partner";
import { requirePartnerContext } from "@/lib/partner-session";
import { signedLedgerDelta } from "@khepree/reseller";

export const metadata: Metadata = { title: "Wallet" };

export default async function WalletPage() {
  const { session, actor } = await requirePartnerContext();
  if (!actor) {
    return (
      <PartnerEmpty
        title="No partner membership"
        description="This account is not linked to a partner organization."
      />
    );
  }
  const { wallet, transactions } = await getPartnerService().listWallet(
    session.user.id,
    actor.partner.id,
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Cached balance is derived from the ledger. Partners cannot credit this wallet.
        </p>
      </header>
      <Card>
        <CardTitle>Balance</CardTitle>
        <p className="mt-3 text-2xl font-semibold tabular-nums">
          {formatMoney(wallet.balanceMinor, wallet.currency)}
        </p>
        <CardDescription className="mt-2">{transactions.length} ledger rows</CardDescription>
      </Card>
      {transactions.length === 0 ? (
        <PartnerEmpty
          title="No wallet activity"
          description="Credits arrive from paid commissions or Khepree finance. Debits are reseller issues."
        />
      ) : (
        <ul className="divide-y divide-khepree-mist rounded-lg border border-khepree-mist bg-khepree-white">
          {transactions.map((tx) => {
            const signed = signedLedgerDelta(tx.type, tx.amountMinor);
            return (
              <li key={tx.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{tx.type}</p>
                  <p className="text-khepree-slate/70">{tx.publicId}</p>
                </div>
                <p className="tabular-nums">
                  {signed < 0n ? "−" : "+"}
                  {formatMoney(tx.amountMinor, wallet.currency)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
