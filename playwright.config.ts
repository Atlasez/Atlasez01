import { defineConfig } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 4321);
if (!Number.isInteger(port) || port < 1 || port > 65_535)
  throw new Error("E2E_PORTは1から65535の整数で指定してください。");
const baseURL = `${(process.env.E2E_BASE_URL ?? `http://localhost:${port}`).replace(/\/$/, "")}/`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    baseURL,
  },
  webServer: {
    command: `PORT=${port} node scripts/serve-dist.mjs`,
    port,
    reuseExistingServer: true,
  },
});
