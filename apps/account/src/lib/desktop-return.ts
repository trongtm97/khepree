import { pickDesktopAppReturnUri } from "@khepree/desktop-auth";
import { getPlatform } from "@/lib/commerce";

export async function resolveDesktopReturnLink(clientId: string | undefined) {
  if (!clientId?.trim()) return null;
  const client = await getPlatform().desktopAuth.resolveClient(clientId.trim()).catch(() => null);
  if (!client || client.status !== "active") return null;
  const returnUri = pickDesktopAppReturnUri(client.allowedRedirectUris);
  if (!returnUri) return null;
  return { displayName: client.displayName, returnUri };
}
