import { expect, test } from "@playwright/test";

const seminars = [
  {
    number: 32,
    title: "線形代数を読む会",
    details: {
      theme: "線形代数",
      purpose: "行列と線形写像の理解を深める",
      description: "教科書を読み、例題を発表する",
      goals: "基本定理を説明できる",
      method: "毎回一章を読み、参加者が発表する",
      materials: "線形代数の教科書",
      prerequisites: "高校数学",
      conditions: "継続して参加できる人",
      observation: "見学できます",
      lateJoin: "途中参加できます",
      schedule: "土曜日 14時",
      period: "通年",
      frequency: "月2回",
      format: "オンライン",
      venue: "オンライン会議",
      currentSize: "4人",
      capacity: "8人",
      organizer: "ゼミ主催者",
      remarks: "備考の内容も表示します",
    },
    recruitment: "open",
    phase: "active",
    acceptingApplications: true,
  },
  {
    number: 31,
    title: "認知科学の輪読会",
    details: { theme: "認知科学", purpose: "認知について学ぶ" },
    recruitment: "closed",
    phase: "ended",
    acceptingApplications: false,
  },
];

const localOrigin = new URL(
  process.env.E2E_BASE_URL ??
    `http://localhost:${process.env.E2E_PORT ?? 4321}`,
).origin;
const adminApi = "https://admin.atlasez.org/api/seminars";
const corsHeaders = {
  "access-control-allow-origin": localOrigin,
  "access-control-allow-credentials": "true",
};

async function mockAdminApi(
  page: import("@playwright/test").Page,
  session: { signedIn: boolean; email?: string },
  onRequest?: (path: string, payload: Record<string, string>) => void,
) {
  await page.route(`${adminApi}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS")
      return route.fulfill({
        status: 204,
        headers: {
          ...corsHeaders,
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    if (url.pathname === "/api/seminars/session")
      return route.fulfill({
        json: session,
        headers: corsHeaders,
      });
    if (request.method() === "POST") {
      const payload = request.postDataJSON() as Record<string, string>;
      onRequest?.(url.pathname, payload);
      return route.fulfill({
        status: 201,
        json: { number: 33, id: "application-1" },
        headers: corsHeaders,
      });
    }
    return route.fulfill({
      status: 404,
      json: { error: "見つかりませんでした。" },
      headers: corsHeaders,
    });
  });
}

test.describe("ゼミの公開ページ", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/seminars**", async (route) => {
      const url = new URL(route.request().url());
      const match = /\/api\/seminars\/(\d+)$/.exec(url.pathname);
      if (match) {
        const seminar = seminars.find(
          (item) => item.number === Number(match[1]),
        );
        await route.fulfill(
          seminar
            ? { json: seminar }
            : { status: 404, json: { error: "見つかりませんでした。" } },
        );
        return;
      }
      await route.fulfill({ json: { seminars } });
    });
  });

  test("検索と募集状況で絞り込み、公開サイト内の申請先へ案内する", async ({
    page,
  }) => {
    await mockAdminApi(page, { signedIn: true, email: "reader@atlasez.test" });
    await page.goto("seminars/");
    const cards = page.locator(".public-seminar-card");
    await expect(cards).toHaveCount(2);
    await expect(page.locator(".public-seminar-group")).toHaveCount(2);
    await expect(
      page.getByRole("heading", { name: "募集中 1件" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "募集終了 1件" }),
    ).toBeVisible();
    await expect(page.getByLabel("キーワード")).toBeVisible();
    await expect(page.getByLabel("募集状況")).toBeVisible();
    await expect(page.getByLabel("開催状況")).toBeVisible();
    await expect(
      page.getByText("ログイン中：reader@atlasez.test"),
    ).toBeVisible();

    await page.getByLabel("キーワード").fill("線形代数");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("線形代数を読む会");
    await expect(
      cards.first().getByRole("link", { name: "参加を申請" }),
    ).toHaveAttribute("href", "/seminars/join/?number=32");
    await expect(
      page.getByRole("link", { name: "ゼミを企画する" }),
    ).toHaveAttribute("href", "/seminars/propose/");
    await expect(
      page.getByRole("link", { name: "ゼミに参加を申請する" }),
    ).toHaveAttribute("href", "/seminars/join/");

    await page.getByLabel("キーワード").fill("");
    await page.getByLabel("募集状況").selectOption("closed");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("認知科学の輪読会");
    await expect(
      cards.first().getByRole("link", { name: "参加を申請" }),
    ).toHaveCount(0);
  });

  test("ログインせずに終了したゼミを確認し、開催状況で絞り込める", async ({
    page,
  }) => {
    await mockAdminApi(page, { signedIn: false });
    await page.goto("seminars/");

    const cards = page.locator(".public-seminar-card");
    await expect(cards).toHaveCount(2);
    await expect(
      page.getByText("ログインせずにゼミを閲覧できます。"),
    ).toBeVisible();
    await expect(cards.nth(1)).toContainText("終了");

    await page.getByLabel("開催状況").selectOption("ended");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("認知科学の輪読会");
  });

  test("詳細にゼミ情報と公開サイト内の参加申請先を表示する", async ({
    page,
  }) => {
    await mockAdminApi(page, { signedIn: false });
    await page.goto("seminars/detail/?number=32");
    await expect(
      page.getByRole("heading", { name: "線形代数を読む会" }),
    ).toBeVisible();
    for (const value of [
      "目的",
      "レベル",
      "内容",
      "到達目標",
      "進め方",
      "教材",
      "前提知識",
      "参加条件",
      "見学",
      "途中参加",
      "日時",
      "形式",
      "場所",
      "定員",
      "主催者",
    ]) {
      await expect(page.locator("dt", { hasText: value })).toBeVisible();
    }
    await expect(page.getByText("ゼミ番号 0000032")).toBeVisible();
    await expect(page.getByText("備考の内容も表示します")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "このゼミに参加申請" }),
    ).toHaveAttribute("href", "/seminars/join/?number=32");
  });

  test("企画内容を公開サイトのフォームから送信できる", async ({ page }) => {
    let submittedPath = "";
    let submittedPayload: Record<string, string> = {};
    await mockAdminApi(
      page,
      { signedIn: true, email: "organizer@atlasez.test" },
      (path, payload) => {
        submittedPath = path;
        submittedPayload = payload;
      },
    );
    await page.goto("seminars/propose/");
    await page.getByLabel("氏名（必須）", { exact: true }).fill("企画者");
    await page.getByLabel("ゼミ名（必須）", { exact: true }).fill("解析ゼミ");
    for (const field of [
      "theme",
      "level",
      "purpose",
      "description",
      "goals",
      "method",
      "materials",
      "prerequisites",
      "conditions",
      "observation",
      "lateJoin",
      "schedule",
      "period",
      "frequency",
      "format",
      "venue",
      "currentSize",
      "capacity",
      "organizer",
    ]) {
      await page
        .locator(`[data-application-form] [name="${field}"]`)
        .fill("申請内容");
    }
    await page.getByRole("button", { name: "企画を送信する" }).click();
    await expect(
      page.getByRole("heading", { name: "企画を受け付けました" }),
    ).toBeVisible();
    expect(submittedPath).toBe("/api/seminars/proposals");
    expect(submittedPayload).toMatchObject({
      title: "解析ゼミ",
      name: "企画者",
      purpose: "申請内容",
    });
    expect(submittedPayload.submissionKey).toMatch(/^[0-9a-f-]{36}$/i);
  });

  test("未ログイン時の申請リンクは申請ページへ戻る", async ({ page }) => {
    await mockAdminApi(page, { signedIn: false });
    await page.goto("seminars/join/?number=32");
    await expect(
      page.getByRole("link", { name: "ログイン", exact: true }).last(),
    ).toHaveAttribute(
      "href",
      "https://admin.atlasez.org/auth/google/login?returnTo=https%3A%2F%2Fatlasez.org%2Fseminars%2Fjoin%2F%3Fnumber%3D32",
    );
  });

  test("参加申請は希望するゼミと連絡内容を主催者へ送信する", async ({
    page,
  }) => {
    let submittedPath = "";
    let submittedPayload: Record<string, string> = {};
    await mockAdminApi(
      page,
      { signedIn: true, email: "applicant@atlasez.test" },
      (path, payload) => {
        submittedPath = path;
        submittedPayload = payload;
      },
    );
    await page.goto("seminars/join/?number=32");
    await page.getByLabel("氏名（必須）", { exact: true }).fill("参加希望者");
    await page.locator('[name="hostNote"]').fill("見学を希望します。");
    await page.getByRole("button", { name: "参加を申請する" }).click();
    await expect(
      page.getByRole("heading", { name: "参加申請を受け付けました" }),
    ).toBeVisible();
    expect(submittedPath).toBe("/api/seminars/32/join");
    expect(submittedPayload).toMatchObject({
      number: "32",
      name: "参加希望者",
      hostNote: "見学を希望します。",
    });
  });

  test("掲載内容をHTMLとして解釈しない", async ({ page }) => {
    await mockAdminApi(page, { signedIn: false });
    await page.route("**/api/seminars", (route) =>
      route.fulfill({
        json: {
          seminars: [
            {
              ...seminars[0],
              title: '<img src=x onerror="alert(1)">',
            },
          ],
        },
      }),
    );
    await page.goto("seminars/");
    await expect(page.locator(".public-seminar-card h4")).toHaveText(
      '<img src=x onerror="alert(1)">',
    );
    await expect(page.locator(".public-seminar-card img")).toHaveCount(0);
  });
});
