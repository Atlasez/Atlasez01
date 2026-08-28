import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

function resolveCommit() {
  const injectedCommit =
    process.env.WORKERS_CI_COMMIT_SHA ??
    process.env.CF_COMMIT_SHA ??
    process.env.GITHUB_SHA;
  if (injectedCommit) return injectedCommit;

  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
}

await mkdir("public", { recursive: true });
await writeFile(
  "public/build-info.json",
  `${JSON.stringify({
    repository:
      process.env.ATLASEZ_REPOSITORY ??
      process.env.GITHUB_REPOSITORY ??
      "Atlasez/Atlasez01",
    commit: resolveCommit(),
    ref:
      process.env.WORKERS_CI_BRANCH ??
      process.env.GITHUB_REF_NAME ??
      process.env.CF_BRANCH ??
      "unknown",
    builtAt: new Date().toISOString(),
  })}\n`,
);
