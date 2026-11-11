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
      remarks: "",
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

  test("検索と募集状況で絞り込み、運営サイトのフォームへ案内する", async ({
    page,
  }) => {
    await page.goto("seminars/");
    const cards = page.locator(".public-seminar-card");
    await expect(cards).toHaveCount(2);
    await expect(page.getByLabel("キーワード")).toBeVisible();
    await expect(page.getByLabel("募集状況")).toBeVisible();

    await page.getByLabel("キーワード").fill("線形代数");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("線形代数を読む会");
    await expect(
      cards.first().getByRole("link", { name: "参加を申請" }),
    ).toHaveAttribute(
      "href",
      "https://admin.atlasez.org/seminars/join/?number=32",
    );

    await page.getByLabel("キーワード").fill("");
    await page.getByLabel("募集状況").selectOption("closed");
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toContainText("認知科学の輪読会");
    await expect(
      cards.first().getByRole("link", { name: "参加を申請" }),
    ).toHaveCount(0);
  });

  test("詳細に目的、進め方、教材、条件、開催情報、主催者を表示する", async ({
    page,
  }) => {
    await page.goto("seminars/detail/?number=32");
    await expect(
      page.getByRole("heading", { name: "線形代数を読む会" }),
    ).toBeVisible();
    for (const value of [
      "目的",
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
  });

  test("掲載内容をHTMLとして解釈しない", async ({ page }) => {
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
    await expect(page.locator(".public-seminar-card h3")).toHaveText(
      '<img src=x onerror="alert(1)">',
    );
    await expect(page.locator(".public-seminar-card img")).toHaveCount(0);
  });
});
