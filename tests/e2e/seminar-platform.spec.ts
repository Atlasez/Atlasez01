import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const sampleSeminar = {
  number: 32,
  title: "解析力学ゼミ",
  details: {
    theme: "解析力学の基礎と応用",
    purpose: "力学を数理的に理解する。",
    description: "ラグランジュ形式とハミルトン形式を学ぶ。",
    goals: "変分原理を使って運動方程式を導く。",
    method: "輪読と発表を組み合わせます。",
    materials: "解析力学の入門書",
    prerequisites: "微積分の基礎",
    conditions: "継続して参加できる方",
    observation: "見学可",
    lateJoin: "途中参加可",
    schedule: "毎週土曜日",
    format: "オンライン",
    venue: "Google Meet",
    capacity: "10名",
    organizer: "主催者",
  },
  recruitment: "open",
  phase: "active",
  acceptingApplications: true,
};

async function mockSeminarApi(page: import("@playwright/test").Page) {
  await page.route(
    "https://admin.atlasez.org/api/seminars**",
    async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      const body =
        pathname === "/api/seminars/session"
          ? { signedIn: false, canReview: false }
          : pathname === "/api/seminars"
            ? { seminars: [sampleSeminar] }
            : pathname === "/api/seminars/32"
              ? sampleSeminar
              : { error: "Not found" };
      await route.fulfill({
        status: pathname.endsWith("/missing") ? 404 : 200,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin":
            route.request().headers().origin ?? "http://localhost:4345",
          "access-control-allow-credentials": "true",
        },
        body: JSON.stringify(body),
      });
    },
  );
}

test("公開ゼミ一覧を検索し、詳細とログイン導線を確認できる", async ({
  page,
}) => {
  await mockSeminarApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("seminars/");

  await expect(
    page.getByRole("heading", { name: "ゼミプラットフォーム" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "解析力学ゼミ" })).toBeVisible();
  await expect(
    page.locator("header").getByRole("link", {
      name: "参加者ページ",
      exact: true,
    }),
  ).toHaveAttribute("href", "/seminars/member/");

  const loginHref = await page
    .locator("header")
    .getByRole("link", { name: "Googleでログイン" })
    .getAttribute("href");
  expect(new URL(loginHref!).searchParams.get("returnTo")).toBe(
    "/seminars/member/",
  );

  await page.getByLabel("ゼミ名・テーマ・教材で検索").fill("解析力学");
  await expect(page.locator("[data-seminar-card]")).toHaveCount(1);
  await page.getByLabel("ゼミ名・テーマ・教材で検索").fill("該当なし");
  await expect(
    page.getByText(
      "条件に合うゼミはありません。検索語や募集状況を変えてお試しください。",
    ),
  ).toBeVisible();

  await page.getByLabel("ゼミ名・テーマ・教材で検索").fill("");
  await page.getByRole("link", { name: "詳細を見る" }).click();
  await expect(
    page.getByRole("heading", { name: "解析力学ゼミ" }),
  ).toBeVisible();
  await expect(page.getByText("進め方", { exact: true })).toBeVisible();

  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(axe.violations.map((violation) => violation.id)).toEqual([]);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("seminars/");
  await expect(
    page.getByRole("heading", { name: "ゼミプラットフォーム" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});

test("企画フォームへのログイン後に公開ページへ戻る", async ({ page }) => {
  await mockSeminarApi(page);
  await page.goto("seminars/propose/");
  await expect(
    page.getByText("フォームの送信にはGoogleログインが必要です。"),
  ).toBeVisible();
  const loginHref = await page
    .locator("#main")
    .getByRole("link", { name: "Googleでログイン" })
    .getAttribute("href");
  expect(new URL(loginHref!).searchParams.get("returnTo")).toBe(
    "https://atlasez.org/seminars/propose/",
  );
});

test("従来のプロジェクト案内から公開ゼミ一覧へ進める", async ({ page }) => {
  await page.goto("projects/semi-platform/");
  await expect(
    page.getByRole("link", { name: "ゼミ一覧・企画・参加申請" }),
  ).toHaveAttribute("href", "/seminars/");
});

test("参加者ページで活動を確認し、ゼミ資料をアップロードできる", async ({
  page,
}) => {
  const activities = [
    {
      id: "next-event",
      number: 32,
      seminar_title: sampleSeminar.title,
      phase: "active",
      kind: "event",
      title: "次回の輪読",
      description: "第2章を読みます。",
      due_at: "2099-01-01T10:00:00.000Z",
      completed_at: null,
      options: [],
      choice: null,
      assignee: null,
      canComplete: 0,
      counts: {},
    },
    {
      id: "prepare-task",
      number: 32,
      seminar_title: sampleSeminar.title,
      phase: "active",
      kind: "task",
      title: "資料を予習する",
      description: "該当箇所を読んでください。",
      due_at: "2099-01-01T09:00:00.000Z",
      completed_at: null,
      options: [],
      choice: null,
      assignee: "参加者",
      canComplete: 0,
      counts: {},
    },
    {
      id: "schedule-poll",
      number: 32,
      seminar_title: sampleSeminar.title,
      phase: "active",
      kind: "poll",
      title: "次回候補日",
      description: "都合のよい日を選んでください。",
      due_at: "2099-01-01T08:00:00.000Z",
      completed_at: null,
      options: ["金曜日", "土曜日"],
      choice: null,
      assignee: null,
      canComplete: 0,
      counts: { 0: 1, 1: 0 },
    },
    {
      id: "important-notice",
      number: 32,
      seminar_title: sampleSeminar.title,
      phase: "active",
      kind: "notice",
      title: "連絡：教室変更",
      description: "会場が変わりました。",
      due_at: null,
      completed_at: null,
      options: [],
      choice: null,
      assignee: null,
      canComplete: 0,
      counts: {},
    },
  ];
  let uploaded = false;
  await page.route(
    "https://admin.atlasez.org/api/seminars**",
    async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const cors = {
        "access-control-allow-origin":
          request.headers().origin ?? "http://localhost:4345",
        "access-control-allow-credentials": "true",
      };
      if (path.endsWith("/session")) {
        return route.fulfill({
          json: {
            signedIn: true,
            email: "member@example.test",
            canReview: false,
          },
          headers: cors,
        });
      }
      if (path.endsWith("/dashboard")) {
        return route.fulfill({
          json: {
            memberships: [
              {
                number: 32,
                title: sampleSeminar.title,
                phase: "active",
                isHost: true,
              },
            ],
            proposals: [],
            applications: [
              {
                number: 9,
                title: "多様体の基礎ゼミ",
                status: "pending",
                created_at: "2026-11-11T00:00:00.000Z",
                decided_at: null,
                decision_note: "",
              },
            ],
            activities,
          },
          headers: cors,
        });
      }
      if (path.endsWith("/32/workspace")) {
        return route.fulfill({
          json: {
            seminar: sampleSeminar,
            isHost: true,
            activities: [],
            applications: [],
            materials: uploaded
              ? [
                  {
                    id: "file-id",
                    filename: "handout.txt",
                    bytes: 12,
                    created_at: "2026-11-12T00:00:00.000Z",
                    canManage: 1,
                  },
                ]
              : [],
          },
          headers: cors,
        });
      }
      if (path.endsWith("/32/materials")) {
        if (request.method() === "OPTIONS") {
          return route.fulfill({
            status: 204,
            headers: {
              ...cors,
              "access-control-allow-methods":
                "GET, POST, PATCH, DELETE, OPTIONS",
              "access-control-allow-headers":
                "content-type, x-seminar-filename",
            },
          });
        }
        expect(request.headers()["content-type"]).toBe(
          "application/octet-stream",
        );
        expect(request.headers()["x-seminar-filename"]).toBe("handout.txt");
        uploaded = true;
        return route.fulfill({
          status: 201,
          json: { ok: true },
          headers: cors,
        });
      }
      return route.fulfill({
        status: 404,
        json: { error: "Not found" },
        headers: cors,
      });
    },
  );

  await page.goto("seminars/member/");
  await expect(
    page.getByRole("heading", { name: "参加者ページ" }),
  ).toBeVisible();
  await expect(
    page.locator("header").getByRole("link", {
      name: "参加者ページ",
      exact: true,
    }),
  ).toHaveAttribute("href", "/seminars/member/");
  const loginHref = await page
    .locator("[data-seminar-login]")
    .getAttribute("href");
  expect(new URL(loginHref!).searchParams.get("returnTo")).toBe(
    "https://atlasez.org/seminars/member/",
  );
  for (const heading of [
    "参加中のゼミ",
    "次回予定",
    "準備・担当",
    "回答待ちの日程調整",
    "重要な連絡",
    "参加申請・企画の状況",
    "過去の活動",
  ])
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  await expect(page.getByText("次回の輪読")).toBeVisible();
  await expect(page.getByText("参加申請 ・ 審査待ち")).toBeVisible();

  await page.getByRole("link", { name: sampleSeminar.title }).first().click();
  await expect(
    page.getByRole("heading", { name: sampleSeminar.title }),
  ).toBeVisible();
  await page.locator('input[name="file"]').setInputFiles({
    name: "handout.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("seminar handout"),
  });
  await page.getByRole("button", { name: "アップロード" }).click();
  await expect(page.getByRole("link", { name: "handout.txt" })).toBeVisible();
});
