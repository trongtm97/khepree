import { afterEach, describe, expect, it } from "vitest";
import { accountSignInUrl, accountSignUpUrl } from "./urls";

afterEach(() => {
  delete process.env.ACCOUNT_URL;
  delete process.env.NEXT_PUBLIC_ACCOUNT_URL;
});

describe("account auth URLs", () => {
  it("builds sign-in and sign-up paths from ACCOUNT_URL", () => {
    process.env.ACCOUNT_URL = "https://account.khepree.com";
    expect(accountSignInUrl()).toBe("https://account.khepree.com/sign-in");
    expect(accountSignUpUrl()).toBe("https://account.khepree.com/sign-up");
  });
});
