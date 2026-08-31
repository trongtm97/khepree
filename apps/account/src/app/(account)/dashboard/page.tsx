import { requireSession } from "@khepree/auth/session";
import { Card, CardDescription, CardTitle } from "@khepree/ui";
import Link from "next/link";
import type { Metadata } from "next";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";
import { PROTECTED_ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await requireSession();
  const locale = await accountLocaleFromCookies(session.locale);
  const copy = accountMessages(locale).dashboard;
  const firstName = session.user.name.split(" ")[0] ?? session.user.name;

  const cards = [
    { href: PROTECTED_ROUTES.products, ...copy.products },
    { href: PROTECTED_ROUTES.licenses, ...copy.licenses },
    { href: PROTECTED_ROUTES.devices, ...copy.devices },
    { href: PROTECTED_ROUTES.billing, ...copy.billing },
  ] as const;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          {copy.title.replace("{name}", firstName)}
        </h1>
        <p className="mt-1 text-sm text-khepree-slate/70">{copy.intro}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group block">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardTitle>{card.title}</CardTitle>
              <CardDescription className="mt-2">{card.description}</CardDescription>
              <p className="mt-4 text-sm font-medium text-khepree-teal">{card.cta}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
