import { requireSession } from "@khepree/auth/session";
import { getUserOrgMemberships } from "@khepree/auth";
import { Card, CardDescription, CardTitle } from "@khepree/ui";
import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await requireSession();
  const orgMemberships = await getUserOrgMemberships(session.user.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">Update your personal information.</p>
      </header>

      <ProfileForm name={session.user.name} email={session.user.email} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Organizations</h2>
        {orgMemberships.length === 0 ? (
          <p className="text-sm text-khepree-slate/70">
            Personal account only. Organization membership will appear here when invited.
          </p>
        ) : (
          <ul className="space-y-2">
            {orgMemberships.map((m) => (
              <li key={m.orgName}>
                <Card>
                  <CardTitle className="text-base">{m.orgName}</CardTitle>
                  <CardDescription className="capitalize">{m.role.toLowerCase()}</CardDescription>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
