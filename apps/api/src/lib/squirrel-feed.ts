import {
  apiPublicUrl,
  isDesktopPublicUpdateProduct,
  isSquirrelFeedChannelEnabled,
  SQUIRREL_ARTIFACT_TICKET_TTL_SECONDS,
  SQUIRREL_FEED_TICKET_TTL_SECONDS,
} from "@khepree/config";
import {
  createProductService,
  createSquirrelFeedService,
  mintSquirrelTicket,
  sanitizeSquirrelNupkgFilename,
  squirrelTicketLogRef,
  verifySquirrelTicket,
} from "@khepree/catalog";
import type { ReleaseArchitecture, ReleaseChannel } from "@khepree/db";
import { createLogger } from "@khepree/config";
import { getReleaseService } from "./catalog-services";

const log = createLogger("api.squirrel");

export function parseSquirrelFeedTarget(input: {
  architecture?: string;
  channel?: string;
}):
  | { architecture: ReleaseArchitecture; channel: ReleaseChannel }
  | "ARCHITECTURE_INVALID"
  | "CHANNEL_INVALID" {
  const architecture = (input.architecture?.trim() || "x64") as ReleaseArchitecture;
  if (architecture !== "x64" && architecture !== "arm64") return "ARCHITECTURE_INVALID";
  const channel = (input.channel?.trim() || "stable") as ReleaseChannel;
  if (channel !== "stable" && channel !== "beta" && channel !== "alpha") return "CHANNEL_INVALID";
  return { architecture, channel };
}

export function parseSquirrelFeedPath(input: {
  productSlug: string;
  architecture: string;
  channel: string;
}):
  | {
      productSlug: string;
      architecture: ReleaseArchitecture;
      channel: ReleaseChannel;
    }
  | "ARCHITECTURE_INVALID"
  | "CHANNEL_INVALID" {
  if (input.architecture !== "x64" && input.architecture !== "arm64") {
    return "ARCHITECTURE_INVALID";
  }
  if (input.channel !== "stable" && input.channel !== "beta" && input.channel !== "alpha") {
    return "CHANNEL_INVALID";
  }
  return {
    productSlug: input.productSlug.trim(),
    architecture: input.architecture,
    channel: input.channel,
  };
}

export function buildSquirrelFeedBaseUrl(input: {
  productSlug: string;
  architecture: ReleaseArchitecture;
  channel: ReleaseChannel;
  feedTicket?: string;
}): string {
  const apiBase = apiPublicUrl() ?? "http://localhost:3004";
  const base = `${apiBase.replace(/\/$/, "")}/api/v1/squirrel/feed/${encodeURIComponent(input.productSlug)}/windows/${input.architecture}/${input.channel}`;
  if (!input.feedTicket) return base;
  const url = new URL(base);
  url.searchParams.set("ft", input.feedTicket);
  return url.toString();
}

export function buildSquirrelArtifactDownloadUrl(input: {
  ticket: string;
  fileName: string;
}): string {
  const safeName = sanitizeSquirrelNupkgFilename(input.fileName);
  if (!safeName) throw new Error("Unsafe artifact filename");
  const apiBase = apiPublicUrl() ?? "http://localhost:3004";
  return `${apiBase.replace(/\/$/, "")}/api/v1/squirrel/artifact/${encodeURIComponent(input.ticket)}/${encodeURIComponent(safeName)}`;
}

export function mintSquirrelFeedTicket(input: {
  productId: string;
  channel: ReleaseChannel;
  architecture: ReleaseArchitecture;
  sessionPublicId?: string;
}): { ticket: string; expiresAt: Date } {
  const exp = Math.floor(Date.now() / 1000) + SQUIRREL_FEED_TICKET_TTL_SECONDS;
  const ticket = mintSquirrelTicket({
    kind: "feed",
    productId: input.productId,
    channel: input.channel,
    architecture: input.architecture,
    sessionPublicId: input.sessionPublicId,
    exp,
  });
  return { ticket, expiresAt: new Date(exp * 1000) };
}

export function mintSquirrelArtifactTicket(input: {
  productId: string;
  channel: ReleaseChannel;
  architecture: ReleaseArchitecture;
  releasePublicId: string;
  artifactPublicId: string;
  sessionPublicId?: string;
}): string {
  return mintSquirrelTicket({
    kind: "artifact",
    productId: input.productId,
    channel: input.channel,
    architecture: input.architecture,
    releasePublicId: input.releasePublicId,
    artifactPublicId: input.artifactPublicId,
    sessionPublicId: input.sessionPublicId,
    exp: Math.floor(Date.now() / 1000) + SQUIRREL_ARTIFACT_TICKET_TTL_SECONDS,
  });
}

export async function resolveSquirrelProductId(productSlug: string): Promise<string | null> {
  return createProductService().resolveProductIdBySlug(productSlug);
}

export function assertSquirrelFeedAccess(input: {
  productId: string;
  channel: ReleaseChannel;
  architecture: ReleaseArchitecture;
  feedTicket: string | null;
  sessionPublicId?: string;
}): void {
  if (!isSquirrelFeedChannelEnabled(input.channel)) {
    throw Object.assign(new Error("Channel disabled"), { code: "CHANNEL_DISABLED" });
  }
  if (isDesktopPublicUpdateProduct(input.productId)) return;
  if (!input.feedTicket?.trim()) {
    throw Object.assign(new Error("Feed ticket required"), { code: "FEED_TICKET_REQUIRED" });
  }
  verifySquirrelTicket(
    input.feedTicket,
    {
      kind: "feed",
      productId: input.productId,
      channel: input.channel,
      architecture: input.architecture,
      sessionPublicId: input.sessionPublicId,
    },
  );
}

export async function buildSquirrelFeedResponse(input: {
  productId: string;
  productSlug: string;
  architecture: ReleaseArchitecture;
  channel: ReleaseChannel;
  feedTicket: string | null;
  sessionPublicId?: string;
}): Promise<{ body: string; releaseVersion: string | null; noUpdate: boolean }> {
  try {
    assertSquirrelFeedAccess(input);
  } catch (error) {
    if (error instanceof Error && (error as { code?: string }).code === "CHANNEL_DISABLED") {
      log.info({
        event: "squirrel.feed.check",
        productSlug: input.productSlug,
        channel: input.channel,
        architecture: input.architecture,
        result: "channel_disabled",
      });
      return { body: "", releaseVersion: null, noUpdate: true };
    }
    throw error;
  }

  const squirrel = createSquirrelFeedService();
  const releaseService = getReleaseService();
  const feed = await squirrel.buildFeed(releaseService, {
    productId: input.productId,
    architecture: input.architecture,
    channel: input.channel,
    buildArtifactUrl: ({ releasePublicId, artifactPublicId, fileName }) =>
      buildSquirrelArtifactDownloadUrl({
        ticket: mintSquirrelArtifactTicket({
          productId: input.productId,
          channel: input.channel,
          architecture: input.architecture,
          releasePublicId,
          artifactPublicId,
          sessionPublicId: input.sessionPublicId,
        }),
        fileName,
      }),
  });

  log.info({
    event: "squirrel.feed.check",
    productSlug: input.productSlug,
    channel: input.channel,
    architecture: input.architecture,
    releaseVersion: feed.release?.version ?? null,
    result: feed.body.trim() ? "has_update" : "no_update",
  });

  return {
    body: feed.body,
    releaseVersion: feed.release?.version ?? null,
    noUpdate: !feed.body.trim(),
  };
}

export function logSquirrelArtifactDownload(input: {
  ticketRef: string;
  fileName: string;
  result: "success" | "denied";
  reason?: string;
  releaseVersion?: string;
}) {
  log.info({
    event: "squirrel.artifact.download",
    ticketRef: input.ticketRef,
    fileName: input.fileName,
    releaseVersion: input.releaseVersion ?? null,
    result: input.result,
    reason: input.reason ?? null,
  });
}

export { squirrelTicketLogRef, verifySquirrelTicket };
