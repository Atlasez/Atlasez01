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

test("プライバシーポリシーは記事報告の送信先と未決定の保持方針を説明する", async ({
  page,
}) => {
  await page.goto("privacy-policy/");

  const reportSection = page.getByRole("heading", {
    name: "記事の問題報告で取得する情報",
  });
  await expect(reportSection).toBeVisible();
  const paragraph = reportSection.locator("+ p");
  await expect(paragraph).toContainText(
    "同じ内容の報告は作成後7日以内は受け付けない",
  );
  await expect(paragraph).toContainText(
    "Secretが設定されていない場合は問題報告を受け付けません",
  );
  await expect(paragraph).toContainText(
    "現在の運営Worker定期処理では、これらの記事報告ハッシュや返信先を自動削除していません",
  );
  await expect(paragraph).toContainText("保持期間と削除手順は未決定");
  await expect(paragraph).toContainText(
    "法令への適合性と公開前の最終文言は専門家に確認します",
  );
  await expect(paragraph).not.toContainText("7日間保存");
  await expect(paragraph).not.toContainText("30日間保存");
  await expect(paragraph).not.toContainText("180日後");
  await expect(paragraph).toContainText("運営Worker内部API");
  await expect(paragraph).toContainText("現在の状態と運営メモ");
  await expect(paragraph).toContainText(
    "記事名・記事URL・分野・カテゴリ・報告種別",
  );
  await expect(paragraph).toContainText("Time Travel snapshot");
  await expect(paragraph).not.toContainText("対応履歴");
});
