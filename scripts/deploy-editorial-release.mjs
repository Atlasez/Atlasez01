import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function parseUploadedVersionId(output) {
  const text = String(output).replace(/\u001b\[[0-9;]*m/g, "");
  const labeled = [
    ...text.matchAll(
      /^\s*(?:New\s+)?Version ID:\s*([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\s*$/gim,
    ),
  ];
  if (labeled.length === 1) return labeled[0][1].toLowerCase();
  if (labeled.length > 1)
    throw new Error(
      `Wrangler upload結果のVersion IDが一意ではありません（${labeled.length}件）。`,
    );
  const matches = [
    ...text.matchAll(
      /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
    ),
  ];
  const ids = [...new Set(matches.map(([value]) => value.toLowerCase()))];
  if (ids.length !== 1)
    throw new Error(
      `Wrangler upload結果から候補Version IDを一意に特定できません（${ids.length}件）。`,
    );
  return ids[0];
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      const value = chunk.toString();
      stdout += value;
      process.stdout.write(value);
    });
    child.stderr.on("data", (chunk) => {
      const value = chunk.toString();
      stderr += value;
      process.stderr.write(value);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(`${stdout}\n${stderr}`);
      else
        reject(
          new Error(
            `${command} ${args.join(" ")} が終了コード ${code} で失敗しました。`,
          ),
        );
    });
  });
}

async function signedHeaders(secret, body) {
  const timestamp = String(Date.now());
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const hex = [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return {
    "content-type": "application/json",
    "x-atlasez-release-timestamp": timestamp,
    "x-atlasez-release-signature": `sha256=${hex}`,
  };
}

async function sendReleaseEvent(endpoint, secret, path, payload, options = {}) {
  const url = `${endpoint.replace(/\/$/, "")}/${path}`;
  const body = JSON.stringify(payload);
  const attempts = options.attempts ?? 6;
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleepImpl = options.sleepImpl ?? sleep;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: await signedHeaders(secret, body),
      body,
      cache: "no-store",
    });
    const responseBody = await response.json().catch(() => ({}));
    if (response.ok && responseBody.ok === true) return responseBody;
    if (response.ok)
      throw new Error(`公開リリースAPI ${path} は成功応答を返しませんでした。`);
    const retryable =
      response.status >= 500 ||
      (options.retryInactive &&
        response.status === 409 &&
        responseBody.code === "release_candidate_not_active");
    if (!retryable || attempt === attempts)
      throw new Error(
        `公開リリースAPI ${path} が失敗しました（HTTP ${response.status} / ${responseBody.code ?? "unknown"}）。`,
      );
    const delay = options.retryInactive
      ? 5_000
      : Math.min(10_000, 1_000 * 2 ** (attempt - 1));
    console.warn(
      `公開リリースAPI ${path} を再試行します（${attempt}/${attempts}、${delay}ms）。`,
    );
    await sleepImpl(delay);
  }
  throw new Error(`公開リリースAPI ${path} の再試行が終了しました。`);
}

/**
 * @param {object} options
 * @param {Record<string, string | undefined>} [options.env]
 * @param {(command: string, args: string[]) => Promise<string>} [options.runCommand]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(ms: number) => Promise<void>} [options.sleepImpl]
 * @param {(file: string, encoding: "utf8") => Promise<string>} [options.readFileImpl]
 */
export async function deployEditorialRelease({
  env = process.env,
  runCommand = run,
  fetchImpl = fetch,
  sleepImpl = sleep,
  readFileImpl = readFile,
} = {}) {
  const endpoint = env.EDITORIAL_RELEASE_ENDPOINT?.trim();
  const secret = env.EDITORIAL_RELEASE_WEBHOOK_SECRET?.trim();
  const commitSha = (
    env.WORKERS_CI_COMMIT_SHA ??
    env.GITHUB_SHA ??
    ""
  ).toLowerCase();
  const branch = env.WORKERS_CI_BRANCH ?? env.GITHUB_REF_NAME ?? "";
  const repository = env.ATLASEZ_REPOSITORY ?? env.GITHUB_REPOSITORY ?? "";
  if (!endpoint || !secret)
    throw new Error(
      "EDITORIAL_RELEASE_ENDPOINT と EDITORIAL_RELEASE_WEBHOOK_SECRET が必要です。",
    );
  if (
    branch !== "main" ||
    repository !== "Atlasez/Atlasez01" ||
    !/^[0-9a-f]{40}$/i.test(commitSha)
  )
    throw new Error(
      "mainのCloudflare Workers Builds環境を確認できません。公開処理を停止しました。",
    );

  const [buildInfo, manifest] = await Promise.all([
    readFileImpl("dist/build-info.json", "utf8").then(JSON.parse),
    readFileImpl(".release/editorial-publication-manifest.json", "utf8").then(
      JSON.parse,
    ),
  ]);
  if (
    buildInfo.repository !== repository ||
    buildInfo.ref !== branch ||
    typeof buildInfo.commit !== "string" ||
    buildInfo.commit.toLowerCase() !== commitSha ||
    typeof manifest.commitSha !== "string" ||
    manifest.commitSha.toLowerCase() !== commitSha ||
    manifest.schemaVersion !== 1 ||
    !Array.isArray(manifest.entries)
  )
    throw new Error(
      "ビルド情報と記事版マニフェストが一致しません。公開処理を停止しました。",
    );

  const uploadOutput = await runCommand("npx", [
    "wrangler",
    "versions",
    "upload",
    "--config",
    "wrangler.jsonc",
    "--name",
    "atlasez01",
    "--strict",
    "--keep-vars",
    "--tag",
    `main-${commitSha}`,
    "--message",
    `Editorial candidate ${commitSha}`,
  ]);
  const versionId = parseUploadedVersionId(uploadOutput);
  const candidate = {
    repository,
    workerName: "atlasez01",
    commitSha,
    versionId,
    manifest,
  };

  // Step ④ must complete before the candidate can receive production traffic.
  await sendReleaseEvent(endpoint, secret, "candidate", candidate, {
    fetchImpl,
    sleepImpl,
  });

  await runCommand("npx", [
    "wrangler",
    "versions",
    "deploy",
    `${versionId}@100%`,
    "--config",
    "wrangler.jsonc",
    "--name",
    "atlasez01",
    "--yes",
  ]);

  // The ADMIN Worker reads Cloudflare's active Deployment and records step ⑥.
  await sendReleaseEvent(
    endpoint,
    secret,
    "activated",
    { versionId },
    {
      attempts: 12,
      retryInactive: true,
      fetchImpl,
      sleepImpl,
    },
  );
  console.log(
    `Cloudflare候補 ${versionId} の100%配信とD1公開履歴を照合しました。`,
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)
)
  await deployEditorialRelease();
