import { defineConfig } from "@playwright/test";

const staging = process.env.E2E_MODE === "staging";

const STAGING_BASE_URL_KEYS = [
  "WEB_BASE_URL",
  "ACCOUNT_BASE_URL",
  "ADMIN_BASE_URL",
  "PARTNER_BASE_URL",
] as const;

if (staging) {
  const missing = STAGING_BASE_URL_KEYS.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(
      `E2E_MODE=staging requires deployed base URLs: ${missing.join(", ")}. ` +
        "Do not run Playwright against localhost without a running stack.",
    );
  }
}

function baseUrl(envKey: string, fallback: string): string {
  const value = process.env[envKey]?.trim();
  return value && value.length > 0 ? value.replace(/\/$/, "") : fallback;
}

const defaults = {
  web: "http://localhost:3000",
  account: "http://localhost:3001",
  admin: "http://localhost:3002",
  partner: "http://localhost:3003",
} as const;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: staging ? 1 : 0,
  timeout: 30_000,
  use: {
    trace: staging ? "on-first-retry" : "off",
    channel: process.platform === "win32" ? "msedge" : "chrome",
  },
  projects: [
    { name: "web", use: { baseURL: baseUrl("WEB_BASE_URL", defaults.web) } },
    { name: "account", use: { baseURL: baseUrl("ACCOUNT_BASE_URL", defaults.account) } },
    { name: "admin", use: { baseURL: baseUrl("ADMIN_BASE_URL", defaults.admin) } },
    { name: "partner", use: { baseURL: baseUrl("PARTNER_BASE_URL", defaults.partner) } },
  ],
});
