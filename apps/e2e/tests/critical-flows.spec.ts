import { expect, test } from "@playwright/test";

const enabled = process.env.E2E === "1";

test.beforeEach(() => {
  test.skip(!enabled, "Set E2E=1 and start apps (pnpm test:e2e)");
});

test.describe("marketing site", () => {
  test("root redirects to Vietnamese without indexing a duplicate home", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "web");
    await page.goto("/");
    await expect(page).toHaveURL(/\/vi(\/|$|\?)/);
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  });

  test("English locale remains available", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "web");
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("body")).not.toContainText("TypeError");
  });

  test("browses products", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "web");
    await page.goto("/en/products");
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("at Object.");
  });

  test("home does not leak stack traces", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "web");
    await page.goto("/en");
    await expect(page.locator("body")).not.toContainText("TypeError");
  });
});

test.describe("account", () => {
  test.beforeEach(async ({ context }, testInfo) => {
    test.skip(testInfo.project.name !== "account");
    await context.addCookies([
      { name: "khepree_locale", value: "vi", domain: "localhost", path: "/" },
    ]);
  });

  test("signup and login pages render", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /chào mừng bạn quay lại/i })).toBeVisible();
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: /tạo tài khoản khepree/i })).toBeVisible();
  });

  test("account access redirects when logged out", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/);
    await page.goto("/licenses");
    await expect(page).toHaveURL(/sign-in/);
  });

  test("dev checkout mock requires auth", async ({ page }) => {
    await page.goto("/checkout/mock/ord_missing");
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("admin restrictions", () => {
  test("has no public signup and gates the console", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "admin");
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /admin sign in/i })).toBeVisible();
    await expect(page.locator("body")).toContainText(/no public sign-up/i);
    await expect(page.getByRole("link", { name: /sign up/i })).toHaveCount(0);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("partner", () => {
  test("login and permission gate", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "partner");
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { name: /partner sign in/i })).toBeVisible();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/);
    await page.goto("/wallet");
    await expect(page).toHaveURL(/sign-in/);
  });
});
