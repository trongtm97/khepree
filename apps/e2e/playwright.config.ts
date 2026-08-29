import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: 0,
  timeout: 30_000,
  use: {
    trace: "off",
    channel: process.platform === "win32" ? "msedge" : "chrome",
  },
  projects: [
    { name: "web", use: { baseURL: "http://localhost:3000" } },
    { name: "account", use: { baseURL: "http://localhost:3001" } },
    { name: "admin", use: { baseURL: "http://localhost:3002" } },
    { name: "partner", use: { baseURL: "http://localhost:3003" } },
  ],
});
