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

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});
