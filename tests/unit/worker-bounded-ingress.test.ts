import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../../src/worker";

const emptyEnvironment = {
  ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
  REPORTS: { prepare: vi.fn() },
};

function streamingRequest(
  path: string,
  chunkBytes: number,
  totalChunks: number,
) {
  let pulled = 0;
  let cancelled = false;
  const chunk = new Uint8Array(chunkBytes);
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (pulled >= totalChunks) {
        controller.close();
        return;
      }
      pulled += 1;
      controller.enqueue(chunk);
    },
    cancel() {
      cancelled = true;
    },
  });
  const request = new Request(`https://atlas.example${path}`, {
    method: "POST",
    headers: {
      origin: "https://atlas.example",
      "content-type": "application/json",
    },
    body,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
  return {
    request,
    totalChunks,
    get pulled() {
      return pulled;
    },
    get cancelled() {
      return cancelled;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("public Worker bounded JSON ingress", () => {
  it("cancels oversized report and analytics streams before D1", async () => {
    for (const [path, chunkBytes] of [
      ["/api/article-reports", 32_000],
      ["/api/article-analytics", 8_000],
    ] as const) {
      const streamed = streamingRequest(path, chunkBytes, 10);
      const response = await worker.fetch(
        streamed.request,
        emptyEnvironment as never,
        { waitUntil: vi.fn() } as never,
      );

      expect(response.status).toBe(413);
      expect(streamed.cancelled).toBe(true);
      expect(streamed.pulled).toBeLessThan(streamed.totalChunks);
    }
    expect(emptyEnvironment.REPORTS.prepare).not.toHaveBeenCalled();
  });

  it("rejects null, arrays, and primitive JSON before D1", async () => {
    for (const path of ["/api/article-reports", "/api/article-analytics"])
      for (const body of ["null", "[]", '"text"']) {
        const request = new Request(`https://atlas.example${path}`, {
          method: "POST",
          headers: {
            origin: "https://atlas.example",
            "content-type": "application/json",
          },
          body,
        });
        const response = await worker.fetch(
          request,
          emptyEnvironment as never,
          { waitUntil: vi.fn() } as never,
        );
        expect(response.status).toBe(400);
      }
    expect(emptyEnvironment.REPORTS.prepare).not.toHaveBeenCalled();
  });

  it("accepts valid multibyte JSON at the report and analytics byte limits", async () => {
    const prepare = vi.fn((query: string) => ({
      bind() {
        return this;
      },
      first: async () => (query.includes("COUNT(*)") ? { count: 0 } : null),
      run: async () => ({}),
    }));
    const env = {
      ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
      REPORTS: { prepare },
      REPORT_IP_HASH_SALT: "test-salt",
    };
    const cases = [
      {
        path: "/api/article-reports",
        maxBytes: 64_000,
        payload: {
          articleTitle: "東京の記事",
          articleUrl: "https://atlas.example/atlas/ja/example/",
          articleId: "example",
          subject: "mathematics",
          category: "algebra",
          reportType: "error",
          details: "説明",
          locale: "ja",
          openedAt: Date.now() - 2_000,
        },
      },
      {
        path: "/api/article-analytics",
        maxBytes: 16_000,
        payload: {
          articleId: "example",
          articleTitle: "東京の記事",
          subject: "mathematics",
          category: "algebra",
          locale: "ja",
          event: "view",
        },
      },
    ];

    for (const item of cases) {
      const json = JSON.stringify(item.payload);
      const body = `${json}${" ".repeat(item.maxBytes - new TextEncoder().encode(json).byteLength)}`;
      const response = await worker.fetch(
        new Request(`https://atlas.example${item.path}`, {
          method: "POST",
          headers: {
            origin: "https://atlas.example",
            "content-type": "application/json",
            "content-length": String(new TextEncoder().encode(body).byteLength),
          },
          body,
        }),
        env as never,
        { waitUntil: vi.fn() } as never,
      );
      expect(response.status).toBe(201);
    }
    expect(prepare).toHaveBeenCalled();
  });
});
