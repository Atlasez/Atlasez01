import { expect, test } from "@playwright/test";

test("募集ページは活動中プロジェクトごとの応募フォームへ案内する", async ({
  page,
}) => {
  await page.goto("join/");

  const applications = page.locator("[data-application-projects]");
  await expect(applications.locator("[data-application-project]")).toHaveCount(
    2,
  );
  await expect(
    applications.locator('[data-application-project="atlas"] a'),
  ).toHaveAttribute("href", "https://admin.atlasez.org/apply/atlas/");
  await expect(
    applications.locator('[data-application-project="seminar-platform"] a'),
  ).toHaveAttribute(
    "href",
    "https://admin.atlasez.org/apply/seminar-platform/",
  );
  const intakeNote = page.locator("[data-application-intake-note]");
  await expect(intakeNote).toContainText(
    "応募にはGoogleアカウントでのログインが必要です。ログイン後、プロジェクト別の応募を送信する前に基本プロフィールを保存します。",
  );
  await expect(
    intakeNote.getByRole("link", { name: "プライバシーポリシー" }),
  ).toHaveAttribute("href", "/privacy-policy/");

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("プライバシーポリシーは記事報告の送信先と保持期限を説明する", async ({
  page,
}) => {
  await page.goto("privacy-policy/");

  const reportSection = page.getByRole("heading", {
    name: "記事の問題報告で取得する情報",
  });
  await expect(reportSection).toBeVisible();
  const paragraph = reportSection.locator("+ p");
  await expect(paragraph).toContainText("重複を防ぐため");
  await expect(paragraph).toContainText("7日間保存");
  await expect(paragraph).toContainText("30日間保存");
  await expect(paragraph).toContainText("最終更新から180日後");
  await expect(paragraph).toContainText(
    "未解決報告の返信先には自動削除期限がなく",
  );
  await expect(paragraph).toContainText("運営Worker内部API");
  await expect(paragraph).toContainText("現在の状態と運営メモ");
  await expect(paragraph).toContainText(
    "記事名・記事URL・分野・カテゴリ・報告種別",
  );
  await expect(paragraph).toContainText("Time Travel snapshot");
  await expect(paragraph).not.toContainText("対応履歴");
});
