import { getSession } from "@khepree/auth/session";
import {
  buildDesktopAuthorizePath,
  isDesktopAuthError,
  parseDesktopAuthorizeSearchParams,
} from "@khepree/desktop-auth";
import { Alert, Button, Card, CardDescription, CardTitle } from "@khepree/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPlatform } from "@/lib/commerce";
import { AUTH_ROUTES } from "@/lib/routes";
import { approveDesktopAuthorizeAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Authorize desktop app" };

export default async function DesktopAuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;

  let params;
  try {
    params = parseDesktopAuthorizeSearchParams(raw);
  } catch (error) {
    const code = isDesktopAuthError(error) ? error.code : "AUTH_REQUIRED";
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
        <Card className="w-full space-y-4 p-6">
          <CardTitle>Cannot authorize desktop app</CardTitle>
          <CardDescription>The authorization request is invalid ({code}).</CardDescription>
          <Link href={AUTH_ROUTES.signIn} className="text-sm text-khepree-teal hover:underline">
            Back to sign in
          </Link>
        </Card>
      </main>
    );
  }

  const session = await getSession();
  if (!session) {
    redirect(`${AUTH_ROUTES.signIn}?next=${encodeURIComponent(buildDesktopAuthorizePath(params))}`);
  }

  const platform = getPlatform();
  let client;
  try {
    client = await platform.desktopAuth.resolveClient(params.clientId);
    platform.desktopAuth.assertClientActive(client);
    platform.desktopAuth.assertRedirectUriAllowed(client, params.redirectUri);
  } catch (error) {
    const code = isDesktopAuthError(error) ? error.code : "AUTH_REQUIRED";
    return (
      <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
        <Card className="w-full space-y-4 p-6">
          <CardTitle>Cannot authorize desktop app</CardTitle>
          <CardDescription>This desktop client or redirect URI is not allowed ({code}).</CardDescription>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
      <Card className="w-full space-y-6 p-6">
        <div>
          <CardTitle>Authorize {client.displayName}</CardTitle>
          <CardDescription className="mt-2">
            Signed in as <span className="font-medium text-khepree-ink">{session.user.email}</span>.
            This desktop app will receive a one-time code — not your password.
          </CardDescription>
        </div>

        <Alert variant="info">
          After approval, you will return to the desktop app. Entitlement is checked separately; you can purchase a
          plan later if access is missing.
        </Alert>

        <form action={approveDesktopAuthorizeAction} className="space-y-4">
          <input type="hidden" name="client_id" value={params.clientId} />
          <input type="hidden" name="redirect_uri" value={params.redirectUri} />
          <input type="hidden" name="code_challenge" value={params.codeChallenge} />
          <input type="hidden" name="code_challenge_method" value={params.codeChallengeMethod} />
          <input type="hidden" name="state" value={params.state} />
          <Button type="submit" className="w-full">
            Authorize
          </Button>
        </form>

        <p className="text-center text-sm text-khepree-slate/70">
          <Link href="/dashboard" className="text-khepree-teal hover:underline">
            Cancel
          </Link>
        </p>
      </Card>
    </main>
  );
}
