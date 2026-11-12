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
  ).toHaveAttribute("href", "https://admin.atlasez.org/seminars/member/");

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
