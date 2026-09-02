import { getEnv, type Env } from "./env";

export type SquirrelFeedChannel = "stable" | "beta" | "alpha";

/** Artifact download ticket TTL — long enough for large nupkg over slow links. */
export const SQUIRREL_ARTIFACT_TICKET_TTL_SECONDS = 3600;

/** Feed access ticket TTL — desktop app refreshes before autoUpdater checks. */
export const SQUIRREL_FEED_TICKET_TTL_SECONDS = 900;

export function isSquirrelFeedChannelEnabled(
  channel: SquirrelFeedChannel,
  env: Env = getEnv(),
): boolean {
  if (channel === "stable") return true;
  if (channel === "beta") return env.SQUIRREL_BETA_FEED_ENABLED === "true";
  return false;
}

export function squirrelUpdateTicketSecret(env: Env = getEnv()): string | null {
  const dedicated = env.SQUIRREL_UPDATE_TICKET_SECRET?.trim();
  if (dedicated && !dedicated.includes("CHANGE_ME")) return dedicated;
  const auth = env.BETTER_AUTH_SECRET?.trim();
  if (auth && auth.length >= 32) return auth;
  return null;
}
