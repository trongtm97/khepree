import { requireSession } from "@khepree/auth/session";
import { Card, CardDescription, CardTitle } from "@khepree/ui";
import Link from "next/link";
import type { Metadata } from "next";
import { PROTECTED_ROUTES } from "@/lib/routes";

export const metadata: Metadata = { title: "Dashboard" };

const cards = [
  {
    href: PROTECTED_ROUTES.products,
    title: "Your Products",
    description: "Software you own or subscribe to.",
    empty: "No products yet.",
  },
  {
    href: PROTECTED_ROUTES.licenses,
    title: "Active Licenses",
    description: "License keys and entitlements.",
    empty: "No active licenses.",
  },
  {
    href: PROTECTED_ROUTES.devices,
    title: "Devices",
    description: "Registered devices for your licenses.",
    empty: "No devices registered.",
  },
  {
    href: PROTECTED_ROUTES.billing,
    title: "Billing",
    description: "Invoices and payment methods.",
    empty: "No billing history yet.",
  },
] as const;

export default async function DashboardPage() {
  const session = await requireSession();
  const firstName = session.user.name.split(" ")[0] ?? session.user.name;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Welcome, {firstName}</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          Manage your Khepree account, products, and security.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group block">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardTitle>{card.title}</CardTitle>
              <CardDescription className="mt-2">{card.description}</CardDescription>
              <p className="mt-4 text-sm text-khepree-slate/60">{card.empty}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
