import { describe, expect, it } from "vitest";
import { DevPreviewEmailAdapter } from "./adapter";

describe("DevPreviewEmailAdapter", () => {
  it("returns preview id without claiming delivery", async () => {
    const adapter = new DevPreviewEmailAdapter();
    const result = await adapter.send({
      to: "user@example.com",
      subject: "Reset password",
      text: "http://localhost:3001/reset-password?token=abc",
      html: "<p>reset</p>",
    });

    expect(adapter.status).toBe("mock");
    expect(result.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
