import { afterEach, describe, expect, it } from "vitest";
import {
  mintSquirrelTicket,
  squirrelTicketLogRef,
  verifySquirrelTicket,
} from "./squirrel-ticket";

const SECRET = "test-squirrel-ticket-secret-with-enough-entropy";

afterEach(() => {
  process.env.SQUIRREL_UPDATE_TICKET_SECRET = SECRET;
});

describe("squirrel ticket", () => {
  it("mints and verifies feed and artifact tickets without embedding session tokens", () => {
    process.env.SQUIRREL_UPDATE_TICKET_SECRET = SECRET;
    const feed = mintSquirrelTicket(
      {
        kind: "feed",
        productId: "prod-1",
        channel: "stable",
        architecture: "x64",
        exp: Math.floor(Date.now() / 1000) + 600,
      },
      SECRET,
    );
    expect(feed).not.toMatch(/refresh/i);
    expect(feed.split(".")).toHaveLength(2);

    const payload = verifySquirrelTicket(
      feed,
      { kind: "feed", productId: "prod-1", channel: "stable", architecture: "x64" },
      SECRET,
    );
    expect(payload.kind).toBe("feed");
    expect(squirrelTicketLogRef(feed)).toBe(payload.jti);
  });

  it("rejects expired and wrong-scope tickets", () => {
    const artifact = mintSquirrelTicket(
      {
        kind: "artifact",
        productId: "prod-1",
        channel: "stable",
        architecture: "x64",
        releasePublicId: "rel_1",
        artifactPublicId: "rart_1",
        exp: Math.floor(Date.now() / 1000) - 10,
      },
      SECRET,
    );

    expect(() =>
      verifySquirrelTicket(
        artifact,
        {
          kind: "artifact",
          productId: "prod-1",
          channel: "stable",
          architecture: "x64",
          releasePublicId: "rel_1",
          artifactPublicId: "rart_1",
        },
        SECRET,
      ),
    ).toThrow(/expired/i);

    const valid = mintSquirrelTicket(
      {
        kind: "artifact",
        productId: "prod-1",
        channel: "stable",
        architecture: "x64",
        releasePublicId: "rel_1",
        artifactPublicId: "rart_1",
        exp: Math.floor(Date.now() / 1000) + 600,
      },
      SECRET,
    );

    expect(() =>
      verifySquirrelTicket(
        valid,
        {
          kind: "artifact",
          productId: "prod-1",
          channel: "stable",
          architecture: "x64",
          releasePublicId: "rel_other",
          artifactPublicId: "rart_1",
        },
        SECRET,
      ),
    ).toThrow(/release scope/i);
  });
});
