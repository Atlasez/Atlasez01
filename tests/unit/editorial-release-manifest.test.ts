import { describe, expect, it, vi } from "vitest";
import {
  changedArticlePaths,
  createEditorialReleaseManifest,
  parseGitChangedArticlePaths,
} from "../../scripts/editorial-release-manifest.mjs";
import {
  deployEditorialRelease,
  parseUploadedVersionId,
} from "../../scripts/deploy-editorial-release.mjs";

const commitSha = "a".repeat(40);
const versionId = "c3aa94a0-fd78-4d4a-bf88-7284c5cebf57";
const article = {
  articleId: "ja-math-set-theory-sets",
  path: "src/content/articles/jpn/mathematics/set-theory/sets.md",
  status: "published",
  editorialVersionId: versionId,
};

describe("公開候補の記事版マニフェスト", () => {
  it("全記事の状態とD1版IDを安定した順序で保存する", () => {
    const manifest = createEditorialReleaseManifest(
      [
        {
          ...article,
          articleId: "ja-math-relations",
          path: "src/content/articles/jpn/mathematics/set-theory/relations.md",
        },
        article,
      ],
      commitSha,
    );

    expect(manifest).toEqual({
      schemaVersion: 1,
      commitSha,
      entries: [
        {
          articleId: "ja-math-relations",
          path: "src/content/articles/jpn/mathematics/set-theory/relations.md",
          status: "published",
          versionId,
        },
        {
          articleId: article.articleId,
          path: article.path,
          status: article.status,
          versionId,
        },
      ],
    });
  });

  it("変更された記事は保存済みの版IDを必須にする", () => {
    expect(() =>
      createEditorialReleaseManifest(
        [{ ...article, editorialVersionId: null }],
        commitSha,
        [article.path],
      ),
    ).toThrow("変更された記事に editorialVersionId がありません");
  });

  it("削除された記事は候補マニフェストから消えていれば許可する", () => {
    const deletedPath =
      "src/content/articles/jpn/mathematics/set-theory/deleted.md";
    expect(
      createEditorialReleaseManifest([article], commitSha, [
        { path: deletedPath, status: "deleted" },
      ]).entries,
    ).toHaveLength(1);
  });

  it("重複記事IDと不正な版IDを候補に含めない", () => {
    expect(() =>
      createEditorialReleaseManifest(
        [
          article,
          {
            ...article,
            path: "src/content/articles/jpn/mathematics/set-theory/other.md",
          },
        ],
        commitSha,
      ),
    ).toThrow("articleId が重複");
    expect(() =>
      createEditorialReleaseManifest(
        [{ ...article, editorialVersionId: "not-a-version" }],
        commitSha,
      ),
    ).toThrow("editorialVersionId が不正");
  });

  it("PRの浅いチェックアウトでもGitHub比較結果から変更記事を検査する", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL) =>
      Response.json({
        files: [
          { filename: article.path, status: "modified" },
          { filename: "docs/PUBLISH.md", status: "modified" },
        ],
      }),
    );
    const paths = await changedArticlePaths(commitSha, {
      env: {
        GITHUB_BASE_REF: "main",
        GITHUB_REPOSITORY: "Atlasez/Atlasez01",
      },
      execFileSyncImpl: () => {
        throw new Error("shallow checkout");
      },
      fetchImpl,
    });

    expect(paths).toEqual([{ path: article.path, status: "modified" }]);
    expect(String(fetchImpl.mock.calls[0][0])).toContain("/compare/main...");
  });

  it("削除と改名をGitのname-status出力から区別する", () => {
    const deletedPath =
      "src/content/articles/jpn/mathematics/set-theory/deleted.md";
    const renamedPath =
      "src/content/articles/jpn/mathematics/set-theory/renamed.md";
    const paths = parseGitChangedArticlePaths(
      `D\0${deletedPath}\0R100\0${article.path}\0${renamedPath}\0`,
    );

    expect(paths).toEqual([
      { path: deletedPath, status: "deleted" },
      { path: renamedPath, status: "renamed" },
    ]);
  });

  it("GitHub比較APIの初回応答に含まれる100件超のファイルを一度で読む", async () => {
    const files = Array.from({ length: 150 }, (_, index) => ({
      filename: `src/content/articles/jpn/mathematics/set-theory/article-${index}.md`,
      status: "modified",
    }));
    const fetchImpl = vi.fn(async () => Response.json({ files }));
    const paths = await changedArticlePaths(commitSha, {
      env: {
        GITHUB_BASE_REF: "main",
        GITHUB_REPOSITORY: "Atlasez/Atlasez01",
      },
      execFileSyncImpl: () => {
        throw new Error("shallow checkout");
      },
      fetchImpl,
    });

    expect(paths).toHaveLength(150);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("GitHub比較APIの300件上限に達したら変更検査を停止する", async () => {
    await expect(
      changedArticlePaths(commitSha, {
        env: {
          GITHUB_BASE_REF: "main",
          GITHUB_REPOSITORY: "Atlasez/Atlasez01",
        },
        execFileSyncImpl: () => {
          throw new Error("shallow checkout");
        },
        fetchImpl: async () =>
          Response.json({
            files: Array.from({ length: 300 }, (_, index) => ({
              filename: `src/content/articles/jpn/mathematics/set-theory/article-${index}.md`,
              status: "modified",
            })),
          }),
      }),
    ).rejects.toThrow("変更ファイル上限に達しました");
  });

  it("PR変更一覧を取得できない場合はマニフェスト生成を停止する", async () => {
    await expect(
      changedArticlePaths(commitSha, {
        env: {
          GITHUB_BASE_REF: "main",
          GITHUB_REPOSITORY: "Atlasez/Atlasez01",
        },
        execFileSyncImpl: () => {
          throw new Error("shallow checkout");
        },
        fetchImpl: async () => new Response("unavailable", { status: 503 }),
      }),
    ).rejects.toThrow("compare API: HTTP 503");
  });
});

describe("Cloudflare候補Version IDの取得", () => {
  it("WranglerのUpload出力からUUIDを一意に取得する", () => {
    expect(
      parseUploadedVersionId(`Uploaded atlasez01\nVersion ID: ${versionId}\n`),
    ).toBe(versionId);
    expect(
      parseUploadedVersionId(
        `Current Version ID: 11111111-1111-4111-8111-111111111111\nNew Version ID: ${versionId}\n`,
      ),
    ).toBe(versionId);
  });

  it("IDの欠落や複数候補を停止する", () => {
    expect(() => parseUploadedVersionId("Uploaded atlasez01")).toThrow(
      "一意に特定できません",
    );
    expect(() =>
      parseUploadedVersionId(
        `${versionId}\n11111111-1111-4111-8111-111111111111`,
      ),
    ).toThrow("一意に特定できません");
  });
});

describe("公開候補の二段階配信", () => {
  const env = {
    EDITORIAL_RELEASE_ENDPOINT:
      "https://admin.example.test/api/internal/editorial-release",
    EDITORIAL_RELEASE_WEBHOOK_SECRET: "test-secret",
    WORKERS_CI_COMMIT_SHA: commitSha,
    WORKERS_CI_BRANCH: "main",
    ATLASEZ_REPOSITORY: "Atlasez/Atlasez01",
  };
  const readFileImpl = async (file: unknown) =>
    String(file) === "dist/build-info.json"
      ? JSON.stringify({
          repository: "Atlasez/Atlasez01",
          ref: "main",
          commit: commitSha,
        })
      : JSON.stringify({
          schemaVersion: 1,
          commitSha,
          entries: [{ ...article, versionId }],
        });

  it("D1候補記録に失敗したら本番切替を呼ばない", async () => {
    const commands: string[][] = [];
    const deployFetch = vi.fn(async () =>
      Response.json(
        { error: "database unavailable", code: "database_unavailable" },
        { status: 503 },
      ),
    );
    await expect(
      deployEditorialRelease({
        env,
        readFileImpl,
        sleepImpl: async () => undefined,
        fetchImpl: deployFetch,
        runCommand: async (_command: string, args: string[]) => {
          commands.push(args);
          return `Version ID: ${versionId}`;
        },
      }),
    ).rejects.toThrow("公開リリースAPI candidate が失敗しました");

    expect(commands).toHaveLength(1);
    expect(commands[0]).toContain("upload");
    expect(commands.some((args) => args.includes("deploy"))).toBe(false);
    expect(deployFetch).toHaveBeenCalledTimes(6);
  });

  it("曖昧な原稿対応では制限した記事パスを診断に残し、本番切替しない", async () => {
    const commands: string[][] = [];
    const ambiguousPath =
      "src/content/articles/jpn/mathematics/group-theory/new-article.md";
    const deployFetch = vi.fn(async () =>
      Response.json(
        {
          error: `公開記事に一致する運営原稿が複数あります（${ambiguousPath}）。\n${"x".repeat(400)}`,
          code: "release_article_ambiguous",
        },
        { status: 409 },
      ),
    );

    let message = "";
    try {
      await deployEditorialRelease({
        env,
        readFileImpl,
        sleepImpl: async () => undefined,
        fetchImpl: deployFetch,
        runCommand: async (_command: string, args: string[]) => {
          commands.push(args);
          return `Version ID: ${versionId}`;
        },
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain(ambiguousPath);
    expect(message).not.toContain("\n");
    expect(message.length).toBeLessThan(500);
    expect(deployFetch).toHaveBeenCalledTimes(1);
    expect(commands).toHaveLength(1);
    expect(commands[0]).toContain("upload");
    expect(commands.some((args) => args.includes("deploy"))).toBe(false);
  });

  it("D1候補保存を待ってから配信し、その後に履歴を記録する", async () => {
    const steps: string[] = [];
    const deployFetch = vi.fn(async (input: RequestInfo | URL) => {
      steps.push(
        String(input).endsWith("/candidate")
          ? "candidate-recorded"
          : "activation-recorded",
      );
      return Response.json({ ok: true });
    });
    const runCommand = async (_command: string, args: string[]) => {
      if (args.includes("upload")) {
        steps.push("candidate-uploaded");
        return `Version ID: ${versionId}`;
      }
      steps.push("version-activated");
      return "Deployment created";
    };
    await deployEditorialRelease({
      env,
      readFileImpl,
      runCommand,
      fetchImpl: deployFetch,
    });

    expect(steps).toEqual([
      "candidate-uploaded",
      "candidate-recorded",
      "version-activated",
      "activation-recorded",
    ]);
  });
});
