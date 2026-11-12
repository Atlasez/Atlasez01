import { defineConfig } from "@playwright/test";

const e2ePort = Number(process.env.E2E_PORT ?? 4321);
const baseURL = `${(process.env.E2E_BASE_URL ?? `http://localhost:${e2ePort}`).replace(/\/$/, "")}/`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    baseURL,
  },
  webServer: {
    command: "node scripts/serve-dist.mjs",
    port: e2ePort,
    env: { PORT: String(e2ePort) },
    reuseExistingServer: true,
  },
});
