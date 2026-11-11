import { describe, expect, it } from "vitest";
import worker from "../../src/worker";

type Row = {
  number: number;
  title: string;
  details: string;
  recruitment: "open" | "paused" | "closed";
  phase: "planned" | "active" | "paused" | "ended" | "unknown";
  host_id: string | null;
};

function fixture(rows: Row[]) {
  const queries: { sql: string; values: unknown[] }[] = [];
  const db = {
    prepare(sql: string) {
      const entry = { sql, values: [] as unknown[] };
      queries.push(entry);
      return {
        bind(...values: unknown[]) {
          entry.values = values;
          return this;
        },
        async all<T>() {
          return { results: rows as T[] };
        },
        async first<T>() {
          return (rows.find((row) => row.number === entry.values[0]) ??
            null) as T | null;
        },
      };
    },
  };
  return { db, queries };
}

const row: Row = {
  number: 32,
  title: "線形代数を読む会",
  details: JSON.stringify({ theme: "線形代数", organizer: "主催者名" }),
  recruitment: "open",
  phase: "active",
  host_id: "private-account-id",
};

async function fetch(
  url: string,
  database: ReturnType<typeof fixture>["db"],
  method = "GET",
) {
  return worker.fetch(
    new Request(url, { method }),
    {
      REPORTS: database,
      ASSETS: { fetch: async () => new Response(null, { status: 404 }) },
    } as never,
    { waitUntil: () => {} } as never,
  );
}

describe("公開ゼミAPI", () => {
  it("一覧には公開承認済みの項目だけを選んで返す", async () => {
    const { db, queries } = fixture([row]);
    const response = await fetch("https://atlasez.org/api/seminars", db);

    expect(response.status).toBe(200);
    expect(queries[0].sql).toContain("proposal_status='approved'");
    expect(queries[0].sql).not.toContain("applicant_profile");
    expect(queries[0].sql).not.toContain("operations_note");
    expect(await response.json()).toEqual({
      seminars: [
        {
          number: 32,
          title: "線形代数を読む会",
          details: { theme: "線形代数", organizer: "主催者名" },
          recruitment: "open",
          phase: "active",
          acceptingApplications: true,
        },
      ],
    });
  });

  it("承認済みの番号を返し、申請受付を終了したゼミは参加不可にする", async () => {
    const closed = { ...row, recruitment: "closed" as const };
    const { db, queries } = fixture([closed]);
    const response = await fetch("https://atlasez.org/api/seminars/32", db);

    expect(response.status).toBe(200);
    expect(queries[0].values).toEqual([32]);
    expect(await response.json()).toMatchObject({
      number: 32,
      acceptingApplications: false,
    });
  });

  it("数字以外の番号、未掲載番号、書き込みは受け付けない", async () => {
    const { db, queries } = fixture([]);
    expect(
      (await fetch("https://atlasez.org/api/seminars/hidden", db)).status,
    ).toBe(404);
    expect(
      (await fetch("https://atlasez.org/api/seminars/999", db)).status,
    ).toBe(404);
    expect(
      (await fetch("https://atlasez.org/api/seminars", db, "POST")).status,
    ).toBe(405);
    expect(queries).toHaveLength(1);
  });
});
