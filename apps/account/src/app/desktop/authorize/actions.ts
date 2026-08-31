"use server";

import { requireSession } from "@khepree/auth/session";
import {
  buildDesktopCallbackUrl,
  DesktopAuthError,
  parseDesktopAuthorizeSearchParams,
} from "@khepree/desktop-auth";
import { clientIp, consumeRateLimit, RATE_LIMITS } from "@khepree/security";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getPlatform } from "@/lib/commerce";

export async function approveDesktopAuthorizeAction(formData: FormData) {
  const session = await requireSession();
  const headerStore = await headers();
  const ip =
    headerStore.get("cf-connecting-ip")?.trim() ||
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  const limited = await consumeRateLimit(`${ip}:desktop-authorize`, RATE_LIMITS.DESKTOP_AUTHORIZE);
  if (!limited.ok) {
    throw new DesktopAuthError("AUTH_REQUIRED", "Too many authorization attempts");
  }

  const params = parseDesktopAuthorizeSearchParams({
    client_id: formData.get("client_id")?.toString(),
    redirect_uri: formData.get("redirect_uri")?.toString(),
    code_challenge: formData.get("code_challenge")?.toString(),
    code_challenge_method: formData.get("code_challenge_method")?.toString(),
    state: formData.get("state")?.toString(),
  });

  const platform = getPlatform();
  const client = await platform.desktopAuth.resolveClient(params.clientId);
  platform.desktopAuth.assertClientActive(client);
  platform.desktopAuth.assertRedirectUriAllowed(client, params.redirectUri);

  const issued = await platform.desktopAuth.issueAuthCode({
    userId: session.user.id,
    client,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    redirectUri: params.redirectUri,
  });

  await platform.desktopAuth.recordAuthorized({
    userId: session.user.id,
    client,
    ipAddress: clientIp(new Request("http://local", { headers: headerStore })),
  });

  redirect(
    buildDesktopCallbackUrl(params.redirectUri, {
      code: issued.code,
      state: params.state,
    }),
  );
}
