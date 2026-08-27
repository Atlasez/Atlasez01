import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

function resolveCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return process.env.CF_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "unknown";
  }
}

await mkdir("public", { recursive: true });
await writeFile(
  "public/build-info.json",
  `${JSON.stringify({
    repository: process.env.GITHUB_REPOSITORY ?? "Atlasez/Atlasez01",
    commit: resolveCommit(),
    ref: process.env.GITHUB_REF_NAME ?? process.env.CF_BRANCH ?? "unknown",
    builtAt: new Date().toISOString(),
  })}\n`,
);
