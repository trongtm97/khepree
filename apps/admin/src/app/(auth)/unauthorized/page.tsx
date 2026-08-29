import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Not authorized" };

export default function UnauthorizedPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Not authorized</h1>
      <p className="text-sm text-khepree-slate/70">
        This account does not have an admin role. Admin is internal — there is no public sign-up.
      </p>
      <Link className="text-sm text-khepree-teal underline" href="/sign-in">
        Back to sign in
      </Link>
    </div>
  );
}
