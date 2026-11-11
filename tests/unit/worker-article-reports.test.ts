import { describe, expect, it, vi } from "vitest";
import worker from "../../src/worker";

describe("article report privacy safeguards", () => {
  it("fails closed before D1 access when the IP hash salt is absent", async () => {
    const prepare = vi.fn();
    const waitUntil = vi.fn();
    const request = new Request("https://atlasez.org/api/article-reports", {
      method: "POST",
      headers: {
        origin: "https://atlasez.org",
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.10",
      },
      body: JSON.stringify({
        articleTitle: "検証用の記事",
        articleUrl: "https://atlasez.org/atlas/ja/math/test/",
        articleId: "test-article",
        subject: "mathematics",
        category: "algebra",
        reportType: "other",
        details: "隔離テストの報告内容",
        locale: "ja",
        openedAt: Date.now() - 2_000,
      }),
    });

    const response = await worker.fetch(
      request,
      {
        ASSETS: { fetch: vi.fn() },
        REPORTS: { prepare },
      } as never,
      { waitUntil } as never,
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error:
        "現在、問題報告を受け付けられません。時間をおいて再度お試しください。",
    });
    expect(prepare).not.toHaveBeenCalled();
    expect(waitUntil).not.toHaveBeenCalled();
  });

  it("accepts the same report again only after the seven-day dedupe window", async () => {
    vi.useFakeTimers();
    const now = new Date("2026-10-12T12:00:00.000Z");
    vi.setSystemTime(now);
    const rows: Array<{
      id: string;
      reporter_hash: string;
      content_hash: string;
      created_at: string;
    }> = [];
    const prepare = vi.fn((query: string) => {
      let bindings: unknown[] = [];
      return {
        bind(...values: unknown[]) {
          bindings = values;
          return this;
        },
        async first() {
          if (query.includes("COUNT(*) AS count FROM article_reports")) {
            const [reporterHash, since] = bindings as [string, string];
            return {
              count: rows.filter(
                (row) =>
                  row.reporter_hash === reporterHash && row.created_at >= since,
              ).length,
            };
          }
          if (
            query.includes(
              "SELECT id FROM article_reports WHERE content_hash = ? AND created_at >= ?",
            )
          ) {
            const [contentHash, since] = bindings as [string, string];
            return (
              rows.find(
                (row) =>
                  row.content_hash === contentHash && row.created_at >= since,
              ) ?? null
            );
          }
          return null;
        },
        async run() {
          if (query.includes("INSERT INTO article_reports")) {
            rows.push({
              id: String(bindings[0]),
              reporter_hash: String(bindings[10]),
              content_hash: String(bindings[11]),
              created_at: String(bindings[12]),
            });
          }
          return { meta: { changes: 1 } };
        },
      };
    });
    const pending: Promise<unknown>[] = [];
    const waitUntil = (promise: Promise<unknown>) => pending.push(promise);
    const submit = () =>
      worker.fetch(
        new Request("https://atlasez.org/api/article-reports", {
          method: "POST",
          headers: {
            origin: "https://atlasez.org",
            "content-type": "application/json",
            "cf-connecting-ip": "203.0.113.10",
          },
          body: JSON.stringify({
            articleTitle: "検証用の記事",
            articleUrl: "https://atlasez.org/atlas/ja/math/test/",
            articleId: "test-article",
            subject: "mathematics",
            category: "algebra",
            reportType: "other",
            details: "隔離テストの報告内容",
            locale: "ja",
            openedAt: Date.now() - 2_000,
          }),
        }),
        {
          ASSETS: { fetch: vi.fn() },
          REPORTS: { prepare },
          REPORT_IP_HASH_SALT: "test-only-salt",
        } as never,
        { waitUntil } as never,
      );

    try {
      const accepted = await submit();
      expect(accepted.status).toBe(201);
      expect(rows).toHaveLength(1);

      rows[0].created_at = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1_000,
      ).toISOString();
      const atBoundary = await submit();
      expect(atBoundary.status).toBe(409);
      expect(rows).toHaveLength(1);

      rows[0].created_at = new Date(
        now.getTime() - 7 * 24 * 60 * 60 * 1_000 - 1,
      ).toISOString();
      const afterWindow = await submit();
      expect(afterWindow.status).toBe(201);
      expect(rows).toHaveLength(2);
      await Promise.all(pending);
    } finally {
      vi.useRealTimers();
    }
  });
});
