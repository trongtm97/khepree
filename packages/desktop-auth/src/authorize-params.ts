import { DESKTOP_PKCE_METHOD } from "@khepree/config";
import { DesktopAuthError } from "./errors";

export interface DesktopAuthorizeParams {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state: string;
}

export function buildDesktopAuthorizePath(params: DesktopAuthorizeParams): string {
  const search = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code_challenge: params.codeChallenge,
    code_challenge_method: params.codeChallengeMethod,
    state: params.state,
  });
  return `/desktop/authorize?${search.toString()}`;
}

export function parseDesktopAuthorizeSearchParams(
  input: Record<string, string | string[] | undefined>,
): DesktopAuthorizeParams {
  const read = (key: string) => {
    const value = input[key];
    if (Array.isArray(value)) return value[0]?.trim() ?? "";
    return typeof value === "string" ? value.trim() : "";
  };

  const clientId = read("client_id");
  const redirectUri = read("redirect_uri");
  const codeChallenge = read("code_challenge");
  const codeChallengeMethod = read("code_challenge_method") || DESKTOP_PKCE_METHOD;
  const state = read("state");

  if (!clientId) throw new DesktopAuthError("AUTH_REQUIRED", "client_id is required");
  if (!redirectUri) throw new DesktopAuthError("REDIRECT_URI_INVALID", "redirect_uri is required");
  if (!codeChallenge) throw new DesktopAuthError("PKCE_INVALID", "code_challenge is required");
  if (codeChallengeMethod !== DESKTOP_PKCE_METHOD) {
    throw new DesktopAuthError("PKCE_INVALID", "Unsupported code_challenge_method");
  }
  if (!state) throw new DesktopAuthError("AUTH_REQUIRED", "state is required");

  return { clientId, redirectUri, codeChallenge, codeChallengeMethod, state };
}

export function buildDesktopCallbackUrl(
  redirectUri: string,
  input: { code: string; state: string },
): string {
  const url = new URL(redirectUri);
  url.searchParams.set("code", input.code);
  url.searchParams.set("state", input.state);
  return url.toString();
}
