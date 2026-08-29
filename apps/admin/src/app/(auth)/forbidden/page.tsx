import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Forbidden" };

export default function ForbiddenPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Forbidden</h1>
      <p className="text-sm text-khepree-slate/70">Your role cannot perform this action.</p>
      <Link className="text-sm text-khepree-teal underline" href="/dashboard">
        Dashboard
      </Link>
    </div>
  );
}
