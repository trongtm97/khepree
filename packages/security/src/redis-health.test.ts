import { describe, expect, it, vi } from "vitest";
import { pingRedis } from "./redis-health";

vi.mock("redis", () => ({
  createClient: () => ({
    isOpen: false,
    async connect() {
      this.isOpen = true;
    },
    async ping() {
      return "PONG";
    },
    async quit() {
      this.isOpen = false;
    },
  }),
}));

describe("pingRedis", () => {
  it("returns true when redis responds", async () => {
    await expect(pingRedis("redis://localhost:6379")).resolves.toBe(true);
  });
});
