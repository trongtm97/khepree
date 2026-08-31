import Link from "next/link";
import type { AccountMessages } from "@/lib/messages";

export function DesktopReturnLink({
  displayName,
  returnUri,
  copy,
}: {
  displayName: string;
  returnUri: string;
  copy: AccountMessages;
}) {
  return (
    <p className="text-sm text-khepree-slate/80">
      <a href={returnUri} className="font-medium text-khepree-teal hover:underline">
        {copy.products.detail.returnToApp.replace("{app}", displayName)}
      </a>
      {" · "}
      <Link href="/products" className="font-medium text-khepree-teal hover:underline">
        {copy.nav.products}
      </Link>
    </p>
  );
}
