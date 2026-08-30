import { describe, expect, it } from "vitest";
import { marketingReferralBaseUrl } from "./create-platform";

describe("createKhepreePlatform", () => {
  it("builds Vietnam-first referral URLs", () => {
    expect(marketingReferralBaseUrl("http://localhost:3000")).toBe("http://localhost:3000/vi");
    expect(marketingReferralBaseUrl("http://localhost:3000/", "en")).toBe("http://localhost:3000/en");
  });
});
