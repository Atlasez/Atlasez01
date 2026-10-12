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
});
