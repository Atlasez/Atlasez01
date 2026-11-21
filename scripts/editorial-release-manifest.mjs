import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const ARTICLE_ROOT = "src/content/articles";
const ARTICLE_ID = /^[a-z0-9-]{1,120}$/;
const VERSION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STATUSES = new Set(["draft", "in-review", "published"]);

async function markdownFiles(root, current = root) {
  const entries = await readdir(current, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) return markdownFiles(root, absolute);
      return entry.isFile() && entry.name.endsWith(".md") ? [absolute] : [];
    }),
  );
  return paths.flat().sort();
}

export function parseArticleFrontmatter(markdown, articlePath) {
  const normalized = markdown.replace(/^\uFEFF/, "");
  const opening = normalized.match(/^---\s*\r?\n/);
  if (!opening) throw new Error(`${articlePath}: frontmatter がありません。`);
  const start = opening[0].length;
  const end = normalized.indexOf("\n---", start);
  if (end < 0)
    throw new Error(`${articlePath}: frontmatter が閉じていません。`);
  const frontmatter = parseYaml(normalized.slice(start, end));
  if (
    !frontmatter ||
    typeof frontmatter !== "object" ||
    Array.isArray(frontmatter)
  )
    throw new Error(
      `${articlePath}: frontmatter がオブジェクトではありません。`,
    );
  return frontmatter;
}

export function createEditorialReleaseManifest(
  entries,
  commitSha,
  changedPaths = [],
) {
  if (!/^[0-9a-f]{40}$/i.test(commitSha))
    throw new Error("記事版マニフェストのCommit SHAが不正です。");
  const seenArticleIds = new Set();
  const seenPaths = new Set();
  const normalizedEntries = entries
    .map((entry) => {
      const articleId = String(entry.articleId ?? "").trim();
      const articlePath = String(entry.path ?? "").replaceAll("\\", "/");
      const status = String(entry.status ?? "");
      const rawVersionId = entry.editorialVersionId;
      const versionId =
        rawVersionId == null || rawVersionId === ""
          ? null
          : String(rawVersionId).trim();

      if (!ARTICLE_ID.test(articleId))
        throw new Error(`${articlePath || "記事"}: articleId が不正です。`);
      if (
        !/^src\/content\/articles\/[a-z]{3}\/[a-z0-9-]+(?:\/[a-z0-9-]+)+\.md$/.test(
          articlePath,
        )
      )
        throw new Error(`${articlePath}: 記事パスが不正です。`);
      if (!STATUSES.has(status))
        throw new Error(`${articlePath}: status が不正です。`);
      if (versionId && !VERSION_ID.test(versionId))
        throw new Error(`${articlePath}: editorialVersionId が不正です。`);
      if (seenArticleIds.has(articleId))
        throw new Error(
          `${articlePath}: articleId が重複しています（${articleId}）。`,
        );
      if (seenPaths.has(articlePath))
        throw new Error(`${articlePath}: 記事パスが重複しています。`);
      seenArticleIds.add(articleId);
      seenPaths.add(articlePath);
      return { articleId, path: articlePath, status, versionId };
    })
    .sort((left, right) => left.path.localeCompare(right.path));

  const entryByPath = new Map(
    normalizedEntries.map((entry) => [entry.path, entry]),
  );
  for (const change of changedPaths) {
    const changedPath =
      typeof change === "string" ? change : String(change.path ?? "");
    const status = typeof change === "string" ? "modified" : change.status;
    const normalizedPath = changedPath.replaceAll("\\", "/");
    const changed = entryByPath.get(normalizedPath);
    if (status === "deleted") {
      if (changed)
        throw new Error(
          `${changedPath}: 削除された記事がマニフェストに残っています。`,
        );
      continue;
    }
    if (!changed)
      throw new Error(
        `${changedPath}: 変更された記事がマニフェストにありません。`,
      );
    if (!changed.versionId)
      throw new Error(
        `${changedPath}: 変更された記事に editorialVersionId がありません。`,
      );
  }

  return {
    schemaVersion: 1,
    commitSha: commitSha.toLowerCase(),
    entries: normalizedEntries,
  };
}

function currentCommitSha() {
  const supplied =
    process.env.WORKERS_CI_COMMIT_SHA ?? process.env.CF_COMMIT_SHA;
  if (supplied) return supplied;
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

function gitOutput(execFileSyncImpl, args) {
  try {
    return execFileSyncImpl("git", args, { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

export function parseGitChangedArticlePaths(output) {
  const fields = String(output).split("\0").filter(Boolean);
  const changes = [];
  for (let index = 0; index < fields.length;) {
    const status = fields[index++];
    if (/^[RC]\d*$/.test(status)) {
      const previousPath = fields[index++];
      const nextPath = fields[index++];
      if (nextPath?.startsWith(`${ARTICLE_ROOT}/`) && nextPath.endsWith(".md"))
        changes.push({ path: nextPath, status: "renamed" });
      else if (
        previousPath?.startsWith(`${ARTICLE_ROOT}/`) &&
        previousPath.endsWith(".md")
      )
        changes.push({ path: previousPath, status: "deleted" });
      continue;
    }
    const changedPath = fields[index++];
    if (
      !changedPath?.startsWith(`${ARTICLE_ROOT}/`) ||
      !changedPath.endsWith(".md")
    )
      continue;
    changes.push({
      path: changedPath,
      status:
        status === "D" ? "deleted" : status === "A" ? "added" : "modified",
    });
  }
  return changes;
}

async function githubCompareFiles({
  repository,
  base,
  commitSha,
  fetchImpl,
  token,
}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository))
    throw new Error("記事変更を検証するGitHubリポジトリを特定できません。");

  const [owner, name] = repository.split("/");
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Atlasez-editorial-release-manifest",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const url = new URL(
    `https://api.github.com/repos/${owner}/${name}/compare/${encodeURIComponent(base)}...${encodeURIComponent(commitSha)}`,
  );
  url.searchParams.set("per_page", "100");
  const response = await fetchImpl(url, { headers });
  if (!response.ok)
    throw new Error(
      `記事変更をGitHubで検証できません（compare API: HTTP ${response.status}）。`,
    );
  const result = await response.json();
  if (!Array.isArray(result.files))
    throw new Error("GitHub compare APIの変更ファイル一覧が不正です。");
  if (result.files.length >= 300)
    throw new Error(
      "GitHub compare APIの変更ファイル上限に達しました。変更範囲を分割して再検証してください。",
    );
  const changed = [];
  for (const file of result.files) {
    if (typeof file.filename !== "string")
      throw new Error("GitHub compare APIの変更ファイル名が不正です。");
    if (
      !file.filename.startsWith(`${ARTICLE_ROOT}/`) ||
      !file.filename.endsWith(".md")
    )
      continue;
    changed.push({
      path: file.filename,
      status: file.status === "removed" ? "deleted" : file.status,
    });
  }
  return changed;
}

export async function changedArticlePaths(
  commitSha,
  {
    env = process.env,
    execFileSyncImpl = execFileSync,
    fetchImpl = fetch,
  } = {},
) {
  const branch = env.WORKERS_CI_BRANCH ?? env.GITHUB_REF_NAME ?? "";
  const pullRequestBase = env.GITHUB_BASE_REF ?? "";
  if (branch !== "main" && !pullRequestBase) return [];

  let base = env.WORKERS_CI_BASE_SHA ?? "";
  if (!base && branch === "main") {
    base = gitOutput(execFileSyncImpl, ["rev-parse", `${commitSha}^`]) ?? "";
  }
  if (!base && pullRequestBase) base = pullRequestBase;

  if (base) {
    const gitBase = /^[0-9a-f]{40}$/i.test(base)
      ? base
      : `refs/remotes/origin/${base}`;
    const diff = gitOutput(execFileSyncImpl, [
      "diff",
      "--name-status",
      "-z",
      `${gitBase}...${commitSha}`,
      "--",
      ARTICLE_ROOT,
    ]);
    if (diff !== null) return parseGitChangedArticlePaths(diff);
  }

  const repository = env.GITHUB_REPOSITORY ?? env.ATLASEZ_REPOSITORY ?? "";
  let apiBase = base || pullRequestBase;
  if (!apiBase && branch === "main") {
    const match = repository.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
    if (!match)
      throw new Error("記事変更を検証するGitHubリポジトリを特定できません。");
    const response = await fetchImpl(
      `https://api.github.com/repos/${match[1]}/${match[2]}/commits/${encodeURIComponent(commitSha)}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "Atlasez-editorial-release-manifest",
          ...(env.GITHUB_TOKEN
            ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` }
            : {}),
        },
      },
    );
    if (!response.ok)
      throw new Error(
        `記事変更の親CommitをGitHubで確認できません（commit API: HTTP ${response.status}）。`,
      );
    const commit = await response.json();
    apiBase = commit.parents?.[0]?.sha ?? "";
  }

  if (!apiBase) throw new Error("記事変更の比較元Commitを特定できません。");
  return githubCompareFiles({
    repository,
    base: apiBase,
    commitSha,
    fetchImpl,
    token: env.GITHUB_TOKEN,
  });
}

export async function buildEditorialReleaseManifest({
  articleRoot = ARTICLE_ROOT,
  commitSha = currentCommitSha(),
  changedPaths = null,
} = {}) {
  const files = await markdownFiles(articleRoot);
  const entries = await Promise.all(
    files.map(async (absolutePath) => {
      const relativePath = path
        .relative(".", absolutePath)
        .replaceAll("\\", "/");
      const metadata = parseArticleFrontmatter(
        await readFile(absolutePath, "utf8"),
        relativePath,
      );
      return {
        articleId: metadata.articleId,
        path: relativePath,
        status: metadata.status,
        editorialVersionId: metadata.editorialVersionId ?? null,
      };
    }),
  );
  const resolvedChangedPaths =
    changedPaths ?? (await changedArticlePaths(commitSha));
  return createEditorialReleaseManifest(
    entries,
    commitSha,
    resolvedChangedPaths,
  );
}

export async function writeEditorialReleaseManifest() {
  const manifest = await buildEditorialReleaseManifest();
  await mkdir(".release", { recursive: true });
  await writeFile(
    ".release/editorial-publication-manifest.json",
    `${JSON.stringify(manifest)}\n`,
  );
  console.log(
    `公開記事の版マニフェストを作成しました: ${manifest.entries.length}件 / ${manifest.commitSha}`,
  );
  return manifest;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    path.resolve(new URL(import.meta.url).pathname)
)
  await writeEditorialReleaseManifest();
