import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 4321);
const baseURL = `${(process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`).replace(/\/$/, "")}/`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    baseURL,
  },
  webServer: {
    command: "node scripts/serve-dist.mjs",
    port,
    env: { PORT: String(port) },
    // Reuse only by explicit request; otherwise a different local app on the
    // default port can make tests pass or fail against the wrong checkout.
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
  },
});
