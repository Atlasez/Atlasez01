import { test, expect } from "@playwright/test";

/**
 * 主要画面のE2Eテスト。ビルド済みサイト（astro preview）に対して実行する。
 * 実行前に `npm run build` が必要。
 */

test.describe("公式サイト", () => {
  test("ホームに理念とナビゲーションが表示される", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator("h1")).toContainText("未来の学びを創る。");
    await expect(page.locator("h1")).toContainText("学びで未来を創る。");
    await expect(
      page.getByRole("link", { name: "学習サイト アトラス" }).first(),
    ).toBeVisible();
  });

  test("理念と組織構成を掲載する", async ({ page }) => {
    await page.goto("about/philosophy/");
    await expect(page.locator(".goal-list li")).toHaveCount(12);
    await expect(page.getByText("全ての人に開かれた学びを")).toBeVisible();

    await page.goto("about/organization/");
    await expect(page.getByAltText(/Atlasezの運営事務局/)).toBeVisible();
    await expect(page.getByAltText(/代表と副代表/)).toBeVisible();
  });

  test("組織サイトに運営紹介を掲載する", async ({ page }) => {
    await page.goto("about/");
    await page.getByRole("link", { name: "運営紹介" }).click();
    await expect(page).toHaveURL(/\/about\/members\/$/);
    await expect(page.locator("h1")).toHaveText("運営紹介");
    await expect(page.locator("[data-member]")).toHaveCount(98);
    await expect(page.getByText("釜口 悠太", { exact: true })).toBeVisible();
    await expect(page.locator(".member-row details")).toHaveCount(0);
    await expect(
      page
        .locator("[data-member]")
        .filter({ hasText: "福山 月" })
        .getByText(/iGEM/),
    ).toBeVisible();

    await page.getByLabel("プロジェクト").selectOption("cafe");
    await expect(page.locator("[data-member]:visible")).toHaveCount(4);
    await expect(page.locator("[data-member-count]")).toHaveText("4名を表示");
  });

  test("プロジェクト一覧に学習サイトが載っている", async ({ page }) => {
    await page.goto("projects/");
    await expect(
      page.getByRole("link", { name: /学習サイト「アトラス」/ }),
    ).toBeVisible();
  });

  test("お知らせの個別ページが開ける", async ({ page }) => {
    await page.goto("news/");
    await page.getByRole("link", { name: /ベータ版を公開/ }).click();
    await expect(page.locator("h1")).toContainText("ベータ版");
  });

  test("表示設定を右端に置き、応募導線を運営サイトへつなぐ", async ({
    page,
  }) => {
    await page.goto("./");
    const headerChildren = await page
      .locator(".org-header-inner > *")
      .evaluateAll((items) => items.map((item) => item.className));
    expect(headerChildren.indexOf("org-settings")).toBeGreaterThan(
      headerChildren.indexOf("org-nav"),
    );
    await expect(page.locator(".org-settings")).toBeVisible();

    await page.goto("join/");
    await expect(
      page.getByRole("link", { name: "応募フォームを開く（運営サイト）" }),
    ).toHaveAttribute("href", "https://admin.atlasez.org/apply/atlas/");
  });
});

test.describe("学習サイト", () => {
  test("総合ホームに分野と準備中の区別がある", async ({ page }) => {
    await page.goto("atlas/ja/");
    /*
      「数学」を役割と名前だけで引くと、隣の丸囲み ? （名前は「数学とは」）や
      リスト表示側の同名リンクにも当たってしまう。タイルのリンクだと分かる
      class で絞る。
    */
    const mathTile = page.locator("a.subject-link", { hasText: "数学" });
    await expect(mathTile).toBeVisible();
    await expect(mathTile).toHaveAttribute(
      "href",
      /\/atlas\/ja\/mathematics\//,
    );
    await expect(page.getByText("準備中").first()).toBeVisible();
  });

  test("上部検索欄が表示中のタブに連動し、全体検索へ切り替えられる", async ({
    page,
  }) => {
    await page.goto("atlas/ja/?view=tiles");
    const header = page.locator("[data-header-search]");
    const search = header.getByRole("searchbox");

    await expect(search).toHaveAttribute(
      "placeholder",
      "分野名・カテゴリ名で検索",
    );
    await expect(
      header.getByRole("button", { name: "全体で検索" }),
    ).toBeVisible();
    await search.fill("数学");
    await header.getByRole("button", { name: "検索", exact: true }).click();
    await expect(
      page.locator(
        "[data-view-panel='tiles'] [data-context-search-item]:visible",
      ),
    ).toHaveCount(1);

    await page.getByRole("tab", { name: "学習地図" }).click();
    await expect(search).toHaveAttribute("placeholder", "地図上の概念を検索");
    await expect(page.locator(".map-breadcrumb")).toHaveCount(0);
    await expect(page.locator("[data-map-search]")).toHaveCount(0);
    await search.fill("群の定義");
    await header.getByRole("button", { name: "検索", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /群論を折りたたむ/ }),
    ).toBeVisible();

    await header.getByRole("button", { name: "全体で検索" }).click();
    await expect(page).toHaveURL(
      /\/atlas\/ja\/search\/\?q=%E7%BE%A4%E3%81%AE%E5%AE%9A%E7%BE%A9/,
    );
  });

  test("漢字記事に専用の見出し・表スタイルが適用される", async ({ page }) => {
    await page.goto("atlas/ja/kanji/culture/musical-instruments/");
    await expect(page.locator(".article-body.kanji-article")).toBeVisible();
    await expect(
      page.locator(".article-body.kanji-article table").first(),
    ).toHaveCSS("border-style", "solid");
  });

  test("はじめての方へは専用ガイドに移動する", async ({ page }) => {
    await page.goto("atlas/ja/");
    const guide = page.getByRole("link", { name: "はじめての方へ" });
    await expect(guide).toHaveCSS("background-color", "rgb(23, 110, 166)");
    await expect(guide).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(
      page
        .locator("header")
        .getByRole("link", { name: "Atlasez", exact: true }),
    ).toHaveCount(0);
    const settings = page.locator("[data-settings-menu] > summary");
    await expect(settings).toHaveCSS("cursor", "pointer");
    expect(
      await settings.evaluate((element) =>
        getComputedStyle(element, "::before").content.replaceAll('"', ""),
      ),
    ).toBe("Aa");
    expect(
      await settings.evaluate((element) =>
        parseFloat(getComputedStyle(element, "::after").borderTopWidth),
      ),
    ).toBeGreaterThan(0);

    await guide.click();
    await expect(page).toHaveURL(/\/atlas\/ja\/guide\/$/);
    await expect(page.locator("h1")).toHaveText("はじめての方へ");
  });

  test("最近更新された記事を近日公開予定より先に表示する", async ({ page }) => {
    await page.goto("atlas/ja/");
    await expect(page.locator("aside.recent h2")).toHaveText([
      "最近更新された記事",
      "近日公開予定の記事",
    ]);
    await expect(page.locator(".recent-scroll")).toHaveCSS(
      "overflow-y",
      "scroll",
    );
    await expect(page.locator(".upcoming-list")).toHaveCSS(
      "overflow-y",
      "scroll",
    );
  });

  test("分野・カテゴリでも更新情報を右カラムの同じ位置に置く", async ({
    page,
  }) => {
    for (const path of [
      "atlas/ja/mathematics/",
      "atlas/ja/mathematics/group-theory/",
    ]) {
      await page.goto(path);
      const main = path.includes("group-theory")
        ? page.locator(".category-main")
        : page.locator(".subject-main");
      await expect(page.locator(".recent")).toBeVisible();
      await expect(page.locator(".recent h2")).toHaveCount(2);
      await expect(page.locator(".highlight-panel")).toHaveCount(0);
      const [mainBox, recentBox] = await Promise.all([
        main.boundingBox(),
        page.locator(".recent").boundingBox(),
      ]);
      expect(mainBox).not.toBeNull();
      expect(recentBox).not.toBeNull();
      expect(Math.abs((mainBox?.y ?? 0) - (recentBox?.y ?? 0))).toBeLessThan(8);
    }
  });

  test("学習地図で選んだカテゴリの表示タブへ遷移し、分野地図へ戻れる", async ({
    page,
  }) => {
    await page.goto("atlas/ja/?view=map");
    await expect(page.locator("[data-map-status]")).toContainText("カテゴリ");
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("atlas-map-category-change", {
          detail: {
            subject: "mathematics",
            categoryKey: "mathematics/group-theory",
            navigate: true,
          },
        }),
      );
    });
    await expect(page).toHaveURL(
      /\/atlas\/ja\/mathematics\/group-theory\/\?view=map$/,
    );
    await expect(page.locator("[data-category-breadcrumb]")).toContainText(
      "群論",
    );
    await page.getByRole("tab", { name: "リスト表示" }).click();
    await expect(page).toHaveURL(
      /\/atlas\/ja\/mathematics\/group-theory\/\?view=list$/,
    );
  });

  test("総合学習地図のカテゴリ直リンクはカテゴリ地図へ正規化する", async ({
    page,
  }) => {
    await page.goto(
      "atlas/ja/?view=map&category=mathematics%2Fgroup-theory&subject=mathematics",
    );
    await expect(page).toHaveURL(
      /\/atlas\/ja\/mathematics\/group-theory\/\?view=map$/,
    );
    await expect(page.locator(".category-main h1")).toHaveText("群論");
    await expect(page.locator("[data-category-breadcrumb]")).toContainText(
      "アトラス",
    );
    await expect(page.locator("[data-category-breadcrumb]")).toContainText(
      "数学",
    );
    await expect(page.locator("[data-category-breadcrumb]")).toContainText(
      "群論",
    );
  });

  test("総合学習地図では分野地図への補助リンクを表示しない", async ({
    page,
  }) => {
    await page.goto("atlas/ja/?view=map");
    await expect(page.locator("[data-map-subject-link]")).toHaveCount(0);
  });

  test("総合ホームの各表示にパンくずを表示しない", async ({ page }) => {
    for (const view of ["tiles", "list", "map"]) {
      await page.goto(`atlas/ja/?view=${view}`);
      await expect(page.locator("[data-home-map-breadcrumb]")).toHaveCount(0);
      await expect(page.locator(".home-main .breadcrumb")).toHaveCount(0);
    }
  });

  test("総合ホームのタイルから分野を開くとタイル表示になる", async ({
    page,
  }) => {
    // 分野ページに保存された表示設定があっても、タイルの導線はタイル表示を明示する。
    await page.goto("atlas/ja/mathematics/?view=list");
    await expect(page.getByRole("tab", { name: "リスト表示" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await page.goto("atlas/ja/?view=tiles");
    const mathematicsTile = page.locator(
      '[data-view-panel="tiles"] a.subject-name',
      { hasText: "数学" },
    );
    await expect(mathematicsTile).toHaveAttribute(
      "href",
      "/atlas/ja/mathematics/?view=tiles",
    );
    await mathematicsTile.click();
    await expect(page.getByRole("tab", { name: "タイル表示" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("総合リストを記事まで段階的に展開できる", async ({ page }) => {
    await page.goto("atlas/ja/?view=list");
    await expect(page.locator(".list-group[open]")).not.toHaveCount(0);

    const natural = page.locator(".list-group", { hasText: "自然科学" });
    const mathGenre = natural.locator(".list-genre", { hasText: "数理・情報" });
    await expect(mathGenre).toHaveAttribute("open", "");

    const mathematics = mathGenre.locator(".subject-list-details", {
      has: page.getByRole("link", { name: "数学", exact: true }),
    });
    await expect(
      mathematics.getByRole("link", { name: "数学", exact: true }),
    ).toHaveAttribute("href", /\/mathematics\/\?view=list$/);
    await expect(mathematics).toHaveAttribute("open", "");

    const groupTheory = mathematics.locator(".category-list-details", {
      has: page.getByRole("link", { name: "群論", exact: true }),
    });
    await expect(
      groupTheory.getByRole("link", { name: "群論", exact: true }),
    ).toHaveAttribute("href", /\/group-theory\/\?view=list$/);
    await expect(
      page.getByRole("link", { name: "群の定義", exact: true }),
    ).not.toBeVisible();
    await groupTheory.locator(":scope > summary").click();
    await expect(
      page.getByRole("link", { name: "群の定義", exact: true }),
    ).toBeVisible();
  });

  test("本文準備中の目次項目を記事一覧に表示する", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/set-theory/");
    await expect(
      page.getByText("すべての数学の土台。集合・写像・関係を扱う。"),
    ).toHaveCount(0);
    const planned = page
      .locator(".planned-article")
      .filter({ hasText: "集合族" });
    await expect(planned).toBeVisible();
    await expect(planned).toContainText("準備中");
    await expect(planned).not.toContainText("本文準備中の記事です");
    // 本文が無い準備中項目は、公開側から管理サイトへ直接誘導しない。
    await expect(planned.getByRole("link")).toHaveCount(0);
  });

  test("分野の目次にジャンル紹介文を表示しない", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/");
    await expect(
      page.getByText("すべての数学の土台。集合・写像・関係を扱う。"),
    ).toHaveCount(0);
    await expect(
      page.getByText("対称性を記述する代数系。定義から準同型定理まで。"),
    ).toHaveCount(0);
  });

  test("各分野トップでタイル・学習地図・リストを切り替えられる", async ({
    page,
  }) => {
    await page.goto("atlas/ja/mathematics/");

    await expect(page.locator("[data-subject-breadcrumb]")).toContainText(
      "アトラス",
    );
    expect(
      await page.locator(".subject-main").evaluate((main) => {
        const breadcrumb = main.querySelector("[data-subject-breadcrumb]");
        const heading = main.querySelector("h1");
        return Boolean(
          breadcrumb &&
          heading &&
          breadcrumb.compareDocumentPosition(heading) &
            Node.DOCUMENT_POSITION_FOLLOWING,
        );
      }),
    ).toBe(true);

    expect(await page.locator("[data-view-tab]").allTextContents()).toEqual([
      "タイル表示",
      "リスト表示",
      "学習地図",
    ]);

    await expect(page.getByRole("tab", { name: "タイル表示" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(
      page.getByRole("link", { name: /集合論.*記事/ }),
    ).toBeVisible();

    await page.getByRole("tab", { name: "学習地図" }).click();
    await expect(page.locator("[data-view-panel='map']")).toBeVisible();
    await expect(page.locator("[data-map-subject]")).toHaveCount(0);

    await page.getByRole("tab", { name: "リスト表示" }).click();
    await expect(page.locator(".toc-category-details[open]")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "群の定義", exact: true }),
    ).not.toBeVisible();

    const groupTheory = page.locator("[data-category='group-theory']");
    await groupTheory.locator("summary").click();
    await expect(groupTheory).toHaveAttribute("open", "");
    await expect(
      page.getByRole("link", { name: "群の定義", exact: true }),
    ).toBeVisible();

    await page.reload();
    await expect(page.getByRole("tab", { name: "リスト表示" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("記事ページに目次・前提記事が表示される", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/group-theory/group-definition/");
    await expect(page.locator("h1")).toContainText("群の定義");
    await expect(page.getByRole("navigation", { name: "目次" })).toBeVisible();
    await expect(page.getByText("前提記事")).toBeVisible();
    await expect(page.getByText("査読状況", { exact: true })).toHaveCount(0);
    await expect(page.getByText("未査読", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "参考文献" })).toBeVisible();
    await expect(page.getByText("事前演習（準備中）")).toHaveCount(0);
    await expect(page.getByText("この記事の問題を報告")).toBeVisible();
    await expect(page.locator(".back-to-toc")).toHaveCount(0);
    await expect(page.getByLabel("報告の種類")).toBeVisible();
    await expect(page.getByLabel("内容")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "報告を送信" }),
    ).toBeVisible();
  });

  test("スマホの目次ボタンは外寸を保ったまま文字だけ少し大きくする", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("atlas/ja/mathematics/group-theory/group-definition/");
    const trigger = page.locator("[data-mobile-toc]");
    await expect(trigger).toBeVisible();
    const metrics = await trigger.evaluate((element) => {
      const label = element.querySelector(".mobile-toc-label");
      const rect = element.getBoundingClientRect();
      const style = label ? getComputedStyle(label) : null;
      return {
        width: rect.width,
        height: rect.height,
        display: style?.display,
        transform: style?.transform,
      };
    });
    expect(metrics.width).toBeGreaterThan(0);
    expect(metrics.height).toBeGreaterThan(0);
    expect(metrics.display).toBe("inline-block");
    expect(metrics.transform).not.toBe("none");
  });

  test("数学記事の証明を一括で開閉できる", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/group-theory/group-definition/");
    const toggle = page.locator("[data-proof-toggle]");
    const proofs = page.locator("details.proof-details");
    const openProofs = page.locator("details.proof-details[open]");
    await expect(toggle).toBeVisible();
    await expect(proofs).not.toHaveCount(0);
    await expect(openProofs).toHaveCount(0);
    await expect(toggle.locator("[data-proof-indicator]")).toHaveText("▼");
    const triangleStyles = await page.evaluate(() => ({
      allProofs: getComputedStyle(
        document.querySelector("[data-proof-indicator]")!,
      ).transform,
      singleProof: getComputedStyle(
        document.querySelector("details.proof-details > summary")!,
        "::before",
      ).transform,
    }));
    const rotation = (transform: string) =>
      transform
        .replace(/^matrix\(/, "")
        .split(",")
        .slice(0, 4)
        .join(",");
    expect(rotation(triangleStyles.allProofs)).toBe(
      rotation(triangleStyles.singleProof),
    );
    await toggle.click();
    await expect(openProofs).toHaveCount(await proofs.count());
    await expect(toggle).toHaveText("▼ 証明を閉じる");
    await expect(toggle.locator("[data-proof-indicator]")).toHaveText("▼");
    await toggle.click();
    await expect(openProofs).toHaveCount(0);
    await expect(toggle).toHaveText("▼ 証明を展開");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(toggle).toHaveCSS("position", "sticky");
    await expect(toggle).toHaveCSS("top", "16px");
    await expect(toggle).toHaveCSS("margin-right", "5.33333px");

    // 証明のない記事ではボタンを出さない。hidden属性がCSSのdisplayに
    // 打ち消されて、押しても何も起きないボタンが残っていた。
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("atlas/ja/mathematics/group-theory/group-examples/");
    await expect(page.locator("details.proof-details")).toHaveCount(0);
    await expect(page.locator("[data-proof-toggle]")).toBeHidden();
  });

  test("数学記事のMathJax・書式・内部参照を保持する", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/linear-algebra/vector-space/");
    await expect(
      page.locator(".article-body mjx-container").first(),
    ).toBeVisible();
    await expect(page.locator(".article-body strong").first()).toHaveCSS(
      "font-weight",
      "700",
    );
    await expect(page.locator(".article-body ol").first()).toHaveCSS(
      "list-style-type",
      "decimal",
    );

    await page.goto("atlas/ja/mathematics/module-theory/module-homomorphisms/");
    const reference = page.locator("a.article-reference").first();
    await expect(reference).toHaveAttribute(
      "href",
      /module-homomorphisms\/#math-block-\d+$/,
    );
  });

  test("数学枠タイトルのインライン数式を記事表示後も保持する", async ({
    page,
  }) => {
    await page.goto("atlas/ja/mathematics/overview/test-mathematics/");
    const title = page.locator(
      '.article-body [data-statement-id="defi-id-test"] .thmtitle',
    );
    if ((await title.count()) === 0) {
      test.skip(true, "テスト記事が非公開状態のためタイトル検証をスキップ");
    }
    await expect(title).toContainText("定義 1 (タイトル)");
    await expect(title).not.toContainText("$ab$");
    await expect(title.locator("mjx-container")).toHaveCount(1);
    await expect(
      page.locator('.toc-list a[href="#defi-id-test"]'),
    ).not.toContainText("$ab$");
  });

  test("[[ref:識別子]]を同一記事の命題アンカーへ変換する", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/overview/test-mathematics/");
    const reference = page.locator("a.math-statement-reference").first();
    // 非公開PRでは対象記事がdraftとなり、公開ビルドから除外される。
    // 公開状態でのみリンク変換の回帰を検証し、非公開状態のCIは成功させる。
    if ((await reference.count()) === 0) {
      test.skip(true, "テスト記事が非公開状態のためリンク検証をスキップ");
    }
    await expect(reference).toHaveAttribute("href", "#defi-id-test");
    await expect(reference).toHaveText("定義 1");
  });

  test("旧数学サイトから移行した図を読み込み、スマホ幅に収める", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const { url, alt, minWidth } of [
      {
        url: "atlas/ja/mathematics/group-theory/group-examples/",
        alt: "正多角形の対称軸の図",
        minWidth: 300,
      },
      {
        url: "atlas/ja/mathematics/group-theory/homomorphism-theorem/",
        alt: "準同型定理の可換図式",
        minWidth: 170,
      },
    ] as const) {
      await page.goto(url);
      const image = page.locator(`img[alt="${alt}"]`);
      await image.scrollIntoViewIfNeeded();
      await expect(image).toBeVisible();
      await expect
        .poll(() =>
          image.evaluate(
            (element) => (element as HTMLImageElement).naturalWidth,
          ),
        )
        .toBeGreaterThanOrEqual(minWidth);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
    }
  });

  test("物理記事の長い別行数式をスマホ幅で式ごとにスクロールできる", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(
      "atlas/ja/physics/newtonian-mechanics/kinetic-energy-work/",
    );

    const equation = page
      .locator('.article-body mjx-container[display="true"]')
      .first();
    await expect(equation).toBeVisible();
    await expect
      .poll(() =>
        equation.evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            display: style.display,
            overflowX: style.overflowX,
            isScrollable: element.scrollWidth > element.clientWidth,
          };
        }),
      )
      .toEqual({ display: "block", overflowX: "auto", isScrollable: true });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  });

  test("数学記事の証明矢印・folding境界・命題枠を整える", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/module-theory/module-homomorphisms/");
    const toggle = page.locator("[data-proof-toggle]");
    await expect(toggle).toHaveCSS("z-index", "60");
    await expect(toggle).toHaveText("▼ 証明を展開");
    await expect(toggle).toHaveCSS("justify-content", "center");
    await expect(page.locator("details.folding").first()).toHaveCSS(
      "border-top-width",
      "0px",
    );
    await expect(page.locator(".proof-details-inner").first()).toHaveCSS(
      "border-left-width",
      "3px",
    );
    const proposition = page.locator(".prop").first();
    for (const side of ["top", "right", "bottom", "left"] as const) {
      await expect(proposition).toHaveCSS(
        `border-${side}-color`,
        "rgb(224, 195, 117)",
      );
    }
    await toggle.click();
    await expect(toggle).toHaveText("▼ 証明を閉じる");
  });

  test("数学記事の定義・例・図・foldingの書式を保持する", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/module-theory/modules/");
    const definition = page.locator(".defi").first();
    await expect(definition.locator("strong")).toHaveCSS("font-weight", "700");
    const moduleFolding = page
      .locator("details.folding")
      .filter({ hasText: "右加群は反対環上の左加群として扱うことができ" });
    await expect(moduleFolding).toHaveCount(1);
    await expect(moduleFolding.locator(".folding-content")).toContainText(
      "右加群は反対環上の左加群として扱うことができ",
    );
    for (const side of ["top", "right", "bottom", "left"] as const) {
      await expect(moduleFolding).toHaveCSS("border-" + side + "-width", "0px");
    }

    await page.goto("atlas/ja/mathematics/linear-algebra/vector-space/");
    await expect(page.locator(".article-body ol").first()).toHaveCSS(
      "list-style-type",
      "decimal",
    );

    await page.goto("atlas/ja/mathematics/group-theory/group-examples/");
    const example = page.locator(".example").first();
    await expect(example).toHaveCSS("border-top-width", "0px");
    await expect(example).toHaveCSS("box-shadow", "none");
    // 例のラベルは枠を持たない代わりに、定義・命題と同じ塊のラベルとして
    // 単独の行に置く。本文がラベルの右へ回り込まないことを確かめる。
    const exampleTitle = example.locator(".thmtitle");
    await expect(exampleTitle).toHaveCSS("display", "block");
    await expect(exampleTitle).toHaveCSS("float", "none");
    await expect(exampleTitle).toHaveCSS("border-top-width", "3px");
    await expect(exampleTitle).toHaveCSS(
      "background-color",
      "rgb(224, 195, 117)",
    );
    // 複数のディスプレイ数式を含む例でも、本文と数式が同じ枠に残る。
    await expect(
      page.locator(".example").nth(4).locator('mjx-container[display="true"]'),
    ).toHaveCount(2);
    await expect(
      page.locator(".example").nth(6).locator('mjx-container[display="true"]'),
    ).toHaveCount(2);
    await expect(page.locator(".math-figure figcaption")).toHaveCount(0);
    await expect(
      page.locator('.math-figure img[alt="正多角形の対称軸の図"]'),
    ).toBeVisible();

    await page.goto("atlas/ja/mathematics/group-theory/homomorphism-theorem/");
    await expect(page.locator(".math-figure figcaption")).toHaveCount(0);
    await expect(
      page.locator('.math-figure img[alt="準同型定理の可換図式"]'),
    ).toBeVisible();

    await page.goto("atlas/ja/mathematics/group-theory/symmetric-groups/");
    const symmetricDefinition = page.locator(".defi").first();
    await expect(symmetricDefinition.locator(".thmtitle")).toHaveText(
      "定義 1 ((一般の)対称群).",
    );
    await expect(symmetricDefinition).toContainText("集合");
    await expect(symmetricDefinition.locator(".thmtitle")).not.toContainText(
      "集合",
    );
  });

  test("折りたたみの▼矢印は回転しながら縦中央に置く", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/group-theory/subgroups/");
    const summary = page.locator("details.proof-details > summary").first();
    const marker = () =>
      summary.evaluate((el) => {
        const cs = getComputedStyle(el, "::before");
        const own = getComputedStyle(el);
        const box = el.getBoundingClientRect();
        return {
          content: cs.content.replace(/"/gu, ""),
          transform: cs.transform,
          // top:50% + translateY(-50%) で、ボタンの高さが変わっても中央に残る。
          // top はボーダーを除いたパディングボックス基準で解決される。
          centered:
            Math.abs(
              Number.parseFloat(cs.top) -
                (box.height -
                  Number.parseFloat(own.borderTopWidth) -
                  Number.parseFloat(own.borderBottomWidth)) /
                  2,
            ) < 0.5 && cs.transform.includes("-"),
        };
      });
    const closed = await marker();
    expect(closed.content).toBe("▼");
    expect(closed.centered).toBe(true);
    expect(closed.transform).toMatch(/^matrix\(0, -1, 1, 0,/u);
    await summary.click();
    const open = await marker();
    expect(open.content).toBe("▼");
    expect(open.centered).toBe(true);
    expect(open.transform).toMatch(/^matrix\(1, 0, 0, 1,/u);
  });

  test("環の定義でfoldingとrem directiveを表示する", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/ring-theory/ring-definition/");
    const folding = page
      .locator("details.folding")
      .filter({ hasText: "環の公理" });
    await expect(folding).toHaveCount(1);
    await expect(folding.locator(".folding-content")).not.toBeVisible();
    await folding.locator("summary").click();
    await expect(folding.locator(".folding-content")).toContainText(
      "右分配法則",
    );
    const annotation = page.locator("aside.rem");
    await expect(annotation).toHaveAttribute("role", "note");
    await expect(annotation.locator(".rem-title")).toHaveText(
      "単位的環について",
    );
  });

  test("補足ブロックは下辺の枠線を持たない", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/group-theory/group-definition/");
    const supp = page.locator("details.supp-details").first();
    await supp.locator("summary").click();
    await expect(supp).toHaveCSS("border-bottom-width", "0px");
    await expect(supp.locator(".supp-details-inner")).toHaveCSS(
      "border-bottom-width",
      "0px",
    );
  });

  test("定義した用語は英語の併記まで含めて太字にする", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/group-theory/subgroups/");
    await expect(page.locator(".defi strong").first()).toHaveText(
      "部分群(subgroup)",
    );
    await expect(page.locator(".defi strong").first()).toHaveCSS(
      "font-weight",
      "700",
    );
    await expect(page.locator(".example strong").first()).toHaveText(
      "自明な部分群(trivial subgroup)",
    );
  });

  test("証明枠は◻で閉じ、続く本文と参照リンクを外に残す", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/group-theory/generating-sets/");
    const proofs = page.locator("details.proof-details");
    await expect(proofs).not.toHaveCount(0);
    for (const text of await proofs.allTextContents()) {
      // 証明の本文は終止記号で終わり、その後の解説文を巻き込まない。
      expect(text.trim().endsWith("◻")).toBe(true);
    }
    // 証明の直後の段落は枠の外にあり、リンクも生きている。
    const followUp = page
      .locator(".article-body > p")
      .filter({ hasText: "単項生成であるといい" });
    await expect(followUp).toHaveCount(1);
    await expect(followUp.locator("a.article-reference")).toHaveAttribute(
      "href",
      /cyclic-groups\/#math-block-1$/,
    );
    // 未公開記事への参照は角括弧のままにせず、リンクにもしない。
    const pending = page.locator("span.article-reference-pending");
    await expect(pending.first()).toHaveText("有限生成群:定義 1");
    await expect(
      pending.filter({ hasText: "Frattini部分群:定義 1" }),
    ).toHaveCount(1);
    await expect(page.locator(".article-body")).not.toContainText(
      "[Frattini部分群:定義 1]",
    );
  });

  test("本文の補足は補足ブロックとして折りたためる", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/group-theory/generating-sets/");
    const supp = page.locator("details.supp-details");
    await expect(supp).toHaveCount(1);
    await expect(supp.locator("summary.supp-details-summary")).toHaveText(
      "補足.",
    );
    await expect(supp.locator(".supp-details-inner")).toContainText(
      "極小生成系は線型空間における基底にあたる",
    );
    await expect(supp.locator(".supp-details-inner")).not.toContainText(
      "補足 ",
    );

    await page.goto("atlas/ja/mathematics/group-theory/group-definition/");
    const supplements = page.locator("details.supp-details");
    await expect(supplements).toHaveCount(2);
    // 補足が証明の続きを担う場合も、◻ の後の本文は補足の外に残す。
    await expect(supplements.nth(1)).toContainText("◻");
    await expect(supplements.nth(1)).not.toContainText(
      "以降は単位元と言えば両側単位元を指し",
    );
    await expect(page.locator(".article-body > p").last()).not.toContainText(
      "**",
    );
  });

  test("定義に付随する条件はfoldingで折りたためる", async ({ page }) => {
    await page.goto("atlas/ja/mathematics/module-theory/modules/");
    const conditions = page
      .locator("details.folding")
      .filter({ hasText: "加法群であることの条件" });
    await expect(conditions.first()).toBeVisible();
    await expect(conditions.first().locator(".folding-content")).toContainText(
      "二項演算の閉性",
    );
    // 折りたたみの中身は開くまで表示しない。
    await expect(
      conditions.first().locator(".folding-content"),
    ).not.toBeVisible();
    await conditions.first().locator("summary").click();
    await expect(conditions.first().locator(".folding-content")).toBeVisible();
  });

  test("学習記録は触れた位置へ移動し、記事の上下で同期する", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("atlas/ja/biology/overview/what-is-biology/");
    const histories = page.getByRole("slider", { name: "学習の記録" });
    const history = histories.first();
    const bottomHistory = histories.last();

    await expect(histories).toHaveCount(2);
    await expect(history).toHaveCSS("width", "120px");

    await expect(history).toHaveAttribute("aria-valuenow", "0");
    await expect(history).toHaveAttribute("aria-valuetext", "未記録");

    const expectThumbAlignedWithPosition = async (positionIndex: number) => {
      await expect
        .poll(() =>
          history.evaluate((toggle, index) => {
            const thumb = toggle.querySelector(".history-stage-thumb");
            const positions = toggle.querySelectorAll(
              ".history-stage-position",
            );
            const thumbRect = thumb?.getBoundingClientRect();
            const positionRect = positions[index]?.getBoundingClientRect();
            const thumbCenter = thumbRect
              ? thumbRect.left + thumbRect.width / 2
              : NaN;
            const positionCenter = positionRect
              ? positionRect.left + positionRect.width / 2
              : NaN;
            return Math.abs(thumbCenter - positionCenter);
          }, positionIndex),
        )
        .toBeLessThan(0.5);
    };

    await expectThumbAlignedWithPosition(0);

    // ラベルや周囲ではなく、スイッチ本体だけを押せる
    await page
      .locator(".history-stage-labels")
      .first()
      .getByText("理解した", { exact: true })
      .click();
    await expect(history).toHaveAttribute("aria-valuenow", "0");

    await history.click({ position: { x: 60, y: 15 } });
    await expect(history).toHaveAttribute("aria-valuenow", "1");
    await expect(history).toHaveAttribute("aria-valuetext", "読んだ");
    await expect(bottomHistory).toHaveAttribute("aria-valuetext", "読んだ");
    await expectThumbAlignedWithPosition(1);

    await history.click({ position: { x: 116, y: 15 } });
    await expect(history).toHaveAttribute("aria-valuenow", "2");
    await expect(history).toHaveAttribute("aria-valuetext", "理解した");
    await expect(bottomHistory).toHaveAttribute("aria-valuetext", "理解した");
    await expectThumbAlignedWithPosition(2);

    // 「理解した」は集計上「読んだ」にも到達済みとして扱われる
    await page.reload();
    await expect(history).toHaveAttribute("aria-valuetext", "理解した");

    await bottomHistory.click({ position: { x: 4, y: 15 } });
    await expect(history).toHaveAttribute("aria-valuetext", "未記録");
  });

  test("カテゴリトップでタイル・学習地図・リストを切り替えられる", async ({
    page,
  }) => {
    await page.goto("atlas/ja/mathematics/group-theory/");
    const list = page.locator(".article-collection");
    await expect(page.getByRole("tab", { name: "タイル表示" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(list).toHaveAttribute("data-view", "grid");
    await expect(page.getByRole("link", { name: "記事を読む" })).toHaveCount(0);
    await expect(
      page.locator(".article-item").filter({
        has: page.getByRole("link", { name: "群の定義", exact: true }),
      }),
    ).toHaveCSS("position", "relative");

    await page.getByRole("tab", { name: "学習地図" }).click();
    await expect(page.locator("[data-map-view-panel]")).toBeVisible();
    await expect(page.locator("[data-map-subject]")).toHaveCount(0);

    await page.getByRole("tab", { name: "リスト表示" }).click();
    await expect(list).toHaveAttribute("data-view", "list");
    // 設定が保存される（リロード後も維持）
    await page.reload();
    await expect(list).toHaveAttribute("data-view", "list");
  });

  test("カテゴリのパンくずと見出しを表示タブ間で一貫させる", async ({
    page,
  }) => {
    await page.goto("atlas/ja/?view=list");
    await page
      .locator(
        '[data-view-panel="list"] a[href="/atlas/ja/mathematics/group-theory/?view=list"]',
      )
      .click();

    const breadcrumb = page.locator("[data-category-breadcrumb]");
    const heading = page.locator(".category-main h1");
    const expectHeader = async () => {
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb).toContainText("アトラス");
      await expect(heading).toHaveText("群論");
      expect(
        await page.locator(".category-main").evaluate((main) => {
          const crumb = main.querySelector("[data-category-breadcrumb]");
          const title = main.querySelector("h1");
          return Boolean(
            crumb &&
            title &&
            crumb.compareDocumentPosition(title) &
              Node.DOCUMENT_POSITION_FOLLOWING,
          );
        }),
      ).toBe(true);
    };

    await expect(page).toHaveURL(
      /\/atlas\/ja\/mathematics\/group-theory\/\?view=list$/,
    );
    await expectHeader();
    for (const view of ["学習地図", "リスト表示", "学習地図"]) {
      await page.getByRole("tab", { name: view }).click();
      await expectHeader();
    }
  });

  test("分野のタイルからカテゴリの学習地図へ進んでもパンくずを保つ", async ({
    page,
  }) => {
    await page.goto("atlas/ja/mathematics/?view=tiles");
    await page.getByRole("link", { name: /^群論 記事:/ }).click();
    await expect(page).toHaveURL(/\/atlas\/ja\/mathematics\/group-theory\/$/);
    await page.getByRole("tab", { name: "学習地図" }).click();
    await expect(page.locator("[data-category-breadcrumb]")).toBeVisible();
    await expect(page.locator(".category-main h1")).toHaveText("群論");
  });

  test("分野学習地図からカテゴリを開くとカテゴリ地図へ正規化する", async ({
    page,
  }) => {
    await page.goto("atlas/ja/mathematics/?view=map");
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("atlas-map-category-change", {
          detail: {
            subject: "mathematics",
            categoryKey: "mathematics/group-theory",
            navigate: true,
          },
        }),
      );
    });
    await expect(page).toHaveURL(
      /\/atlas\/ja\/mathematics\/group-theory\/\?view=map$/,
    );
    await expect(page.locator(".category-main h1")).toHaveText("群論");
    await expect(page.locator("[data-category-breadcrumb]")).toContainText(
      "アトラス",
    );
    await expect(page.locator("[data-category-breadcrumb]")).toContainText(
      "数学",
    );
    await expect(page.locator("[data-category-breadcrumb]")).toContainText(
      "群論",
    );
  });

  test("カテゴリの更新情報を分野と同じ右カラム構成で表示する", async ({
    page,
  }) => {
    await page.goto("atlas/ja/mathematics/group-theory/?view=map");
    const recent = page.locator(".recent");
    const main = page.locator(".category-main");
    await expect(recent.locator(".section-title")).toHaveCount(2);
    await expect(recent.locator(".recent-scroll")).toHaveCSS(
      "max-height",
      "416px",
    );
    const [mainBox, recentBox, upcomingBox] = await Promise.all([
      main.boundingBox(),
      recent.boundingBox(),
      page.locator(".upcoming").boundingBox(),
    ]);
    expect(mainBox).not.toBeNull();
    expect(recentBox).not.toBeNull();
    expect(upcomingBox).not.toBeNull();
    expect(recentBox?.x ?? 0).toBeGreaterThan(mainBox?.x ?? 0);
    expect(upcomingBox?.y ?? 0).toBeGreaterThan(recentBox?.y ?? 0);
  });

  test("学習地図のカテゴリ直リンクでも見出しとパンくずを表示する", async ({
    page,
  }) => {
    await page.goto(
      "atlas/ja/map/?subject=mathematics&category=mathematics%2Fgroup-theory",
    );

    await expect(page.locator("[data-map-page-heading]")).toHaveText("群論");
    const breadcrumb = page.locator("[data-map-page-breadcrumb]");
    await expect(breadcrumb).toContainText("アトラス");
    await expect(breadcrumb).toContainText("数学");
    await expect(breadcrumb).toContainText("群論");
    await expect(
      breadcrumb.getByRole("link", { name: "数学", exact: true }),
    ).toHaveAttribute("href", /\/atlas\/ja\/mathematics\/$/);

    // 折りたたんで概要へ戻ると、地図ページ本来の文脈に復元する。
    await page.getByRole("button", { name: /群論を折りたたむ/ }).click();
    await expect(page.locator("[data-map-page-heading]")).toHaveText(
      "学習地図",
    );
    await expect(breadcrumb).toContainText("アトラス");
    await expect(breadcrumb).toContainText("学習地図");
    await expect(breadcrumb).not.toContainText("数学");
  });

  test("経路検索は地図の枠内のボタンから開く", async ({ page }) => {
    await page.goto("atlas/ja/map/");
    const zoomLevel = page.locator("[data-map-zoom-level]");
    await expect(zoomLevel).toBeVisible();
    await expect(page.getByRole("button", { name: "自動整列" })).toBeVisible();
    await expect(page.locator("[data-map-status]")).not.toHaveText("");
    const [actionToolsBox, mapCanvasBox] = await Promise.all([
      page.locator(".map-action-tools").boundingBox(),
      page.locator("#learning-map").boundingBox(),
    ]);
    // 全画面・共有などの操作はキャンバスに重ねず、ツールバー内に収める。
    expect(
      (actionToolsBox?.y ?? 0) + (actionToolsBox?.height ?? 0),
    ).toBeLessThanOrEqual(mapCanvasBox?.y ?? 0);
    const initialZoom = Number(
      (await zoomLevel.textContent())?.replace("%", ""),
    );
    await page.getByRole("button", { name: "拡大" }).click();
    await expect
      .poll(async () =>
        Number((await zoomLevel.textContent())?.replace("%", "")),
      )
      .toBe(initialZoom + 5);

    const mapCanvas = page.locator("#learning-map");
    await mapCanvas.hover();
    await page.mouse.wheel(0, -1);
    await expect
      .poll(async () =>
        Number((await zoomLevel.textContent())?.replace("%", "")),
      )
      .toBeGreaterThan(initialZoom + 5);
    const firstWheelZoom = Number(
      (await zoomLevel.textContent())?.replace("%", ""),
    );
    await page.mouse.wheel(0, -1);
    await expect
      .poll(async () =>
        Number((await zoomLevel.textContent())?.replace("%", "")),
      )
      .toBe(firstWheelZoom + 5);

    // ヘッダー検索は地図表示中だけ概念検索として働く。
    const header = page.locator("[data-header-search]");
    const search = header.getByRole("searchbox");
    await expect(search).toHaveAttribute("placeholder", "地図上の概念を検索");
    await expect(page.locator("[data-map-search]")).toHaveCount(0);
    await search.fill("群の定義");
    await header.getByRole("button", { name: "検索", exact: true }).click();
    const fold = page.getByRole("button", { name: /群論を折りたたむ/ });
    await expect(fold).toBeVisible();
    await fold.click();
    await expect(fold).not.toBeVisible();
    const detail = page.locator("[data-map-detail]");
    await expect(detail).toContainText("群の定義");
    await page.getByRole("button", { name: "記事の詳細を閉じる" }).click();
    await expect(detail).toBeEmpty();

    const open = page.getByRole("button", { name: "学習ルート検索" });
    // 枠の外に箱を並べず、押したときだけ枠内にパネルを出す
    await expect(page.getByLabel(/目的地点/)).not.toBeVisible();
    await open.click();
    await expect(page.getByLabel(/目的地点/)).toBeVisible();
    await expect(open).toHaveAttribute("aria-expanded", "true");
    // 経路検索は canvas の上に重ねず、独立して操作できる位置に置く。
    const routePanel = page.locator("[data-route-panel]");
    const canvas = page.locator("#learning-map");
    await expect(routePanel).toHaveCSS("position", "relative");
    const [routeBox, canvasBox] = await Promise.all([
      routePanel.boundingBox(),
      canvas.boundingBox(),
    ]);
    expect(routeBox?.y).toBeLessThan(canvasBox?.y ?? 0);
    expect((routeBox?.y ?? 0) + (routeBox?.height ?? 0)).toBeLessThanOrEqual(
      canvasBox?.y ?? 0,
    );
    await page.keyboard.press("Escape");
    await expect(page.getByLabel(/目的地点/)).not.toBeVisible();

    await header.getByRole("button", { name: "全体で検索" }).click();
    await expect(page).toHaveURL(
      /\/atlas\/ja\/search\/\?q=%E7%BE%A4%E3%81%AE%E5%AE%9A%E7%BE%A9/,
    );
  });

  test("スマートフォンでは学習地図とページスクロールを切り替えられる", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("atlas/ja/map/");

    const canvas = page.locator("[data-map-frame] .map-canvas");
    const touchToggle = page.getByRole("button", { name: "地図を操作" });
    await expect(touchToggle).toBeVisible();
    await expect(touchToggle).toHaveAttribute("aria-pressed", "false");
    await expect(canvas).toHaveCSS("touch-action", "pan-y pinch-zoom");

    const canvasBox = await canvas.boundingBox();
    expect(canvasBox?.height).toBeGreaterThanOrEqual(500);
    const zoom = Number(
      (await page.locator("[data-map-zoom-level]").textContent())?.replace(
        "%",
        "",
      ),
    );
    expect(zoom).toBeGreaterThanOrEqual(60);

    await touchToggle.click();
    await expect(
      page.getByRole("button", { name: "ページスクロールに戻す" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(canvas).toHaveCSS("touch-action", "none");

    const frame = page.locator("[data-map-frame]");
    expect(
      await frame.evaluate(
        (element) => element.scrollWidth <= element.clientWidth + 1,
      ),
    ).toBe(true);
  });

  test("学習ルートを計算できる（線形空間→ジョルダン標準形）", async ({
    page,
  }) => {
    await page.goto("atlas/ja/map/");
    await page.getByRole("button", { name: "学習ルート検索" }).click();
    await expect(page.locator("[data-route-subject]")).toHaveCount(0);
    await page.getByLabel(/開始地点/).selectOption({ label: "線形空間" });
    await page
      .getByLabel(/目的地点/)
      .selectOption({ label: "ジョルダン標準形" });
    await page.getByRole("button", { name: "経路を表示" }).click();
    const result = page.locator("[data-route-result]");
    await expect(result).toContainText("固有値");
    await expect(result).toContainText("ジョルダン標準形");
    await expect(result).not.toContainText("写像の定義");
    await expect(result.getByRole("listitem")).toHaveCount(8);
    await expect(result).toContainText("同じ分野からあわせて読む（4件）");
    await expect(result).toContainText("開始地点以前の前提（4件）");
    await expect(page.locator("[data-map-status]")).toContainText(
      "学習経路を表示中",
    );
  });

  test("地図上で選んだノードを経路の始点・終点にできる", async ({ page }) => {
    await page.goto("atlas/ja/map/");
    await page.getByRole("button", { name: "学習ルート検索" }).click();
    await page
      .locator("[data-route-start]")
      .selectOption({ label: "群の定義" });
    await page
      .locator("[data-route-goal]")
      .selectOption({ label: "Schurの補題" });
    await page.getByRole("button", { name: "経路を表示" }).click();

    await expect(page.locator("[data-route-result]")).toContainText(
      "Schurの補題",
    );
    await expect(page.locator("[data-map-status]")).toContainText(
      "学習経路を表示中",
    );
  });

  test("検索結果には編集済みの要約を表示する", async ({ page }) => {
    await page.goto("atlas/ja/search/");
    // ヘッダーにも検索欄があるので、検索ページ本体のフォームに限定する
    const searchForm = page.locator("[data-search-form]");
    await searchForm.getByRole("searchbox").fill("群");
    await searchForm.getByRole("button", { name: "検索" }).click();
    const results = page.locator("[data-search-results]");
    await expect(results).toContainText("数学記事です");
    await expect(results).not.toContainText("math.group-theory");
    await expect(page.locator("[data-search-count]")).toContainText("件の記事");
  });

  test("検索の分野とカテゴリを複数選択でき、カテゴリ候補が分野に連動する", async ({
    page,
  }) => {
    await page.goto("atlas/ja/search/");
    const subject = page.locator('select[data-filter-name="subject"]');
    const category = page.locator('select[data-filter-name="category"]');

    await expect(subject).toHaveAttribute("multiple", "");
    await expect(category).toHaveAttribute("multiple", "");
    await subject.selectOption(["化学", "数学"]);

    const categories = await category
      .locator("option")
      .evaluateAll((options) =>
        options.map((option) => (option as HTMLOptionElement).value),
      );
    expect(categories).toEqual(
      expect.arrayContaining(["化学反応", "群論", "集合論"]),
    );
    expect(categories).not.toContain("ニュートン力学");

    await category.selectOption(["化学反応", "群論"]);
    await expect(category.locator("option:checked")).toHaveCount(2);
  });

  test("フッターの言語切替に全対応言語が表示され、同じページで反映される", async ({
    page,
  }) => {
    await page.goto("atlas/ja/");
    const footer = page.locator("[data-lang-switch]");
    await expect(footer.locator("[data-lang-item]")).toHaveCount(4);
    await footer.locator("summary").click();

    const dimensions = await footer.evaluate((element) => {
      const wrapper = element.parentElement?.getBoundingClientRect();
      const button = element.querySelector("summary")?.getBoundingClientRect();
      return {
        wrapperHeight: wrapper?.height ?? 0,
        buttonHeight: button?.height ?? 0,
      };
    });
    expect(dimensions.wrapperHeight).toBeLessThan(dimensions.buttonHeight + 8);

    await footer.locator('[data-ui-language="zh"]').click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  });

  test("スマートフォンでも行き先が畳まれずに出ている", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("atlas/ja/");
    const mainNav = page.locator("#atlas-main-nav");
    // ロゴをホーム導線にし、重複する「分野」は廃止。残る主要導線と検索欄を最初から見せる
    await expect(mainNav.getByRole("link", { name: "分野" })).toHaveCount(0);
    for (const name of ["学習リスト", "はじめての方へ"]) {
      await expect(mainNav.getByRole("link", { name })).toBeVisible();
    }
    await expect(page.locator("#header-search-input")).toBeVisible();
    await expect(page.getByRole("button", { name: "メニュー" })).toHaveCount(0);
  });

  test("表示設定が保存される", async ({ page }) => {
    await page.goto("atlas/ja/");
    // 表示設定はヘッダーのメニュー1か所に集約されている
    const menu = page.locator("[data-settings-menu]");
    await page.locator("[data-settings-menu] > summary").click();
    await expect(menu).toHaveAttribute("open", "");
    /*
      ラジオの丸は隠して選択肢そのものを押せる面にしているため、
      input は見えない。利用者と同じくラベルの面を押す。
    */
    const xlarge = menu.locator("label.a11y-option", { hasText: "特大" });
    await expect(xlarge).toBeVisible();
    await xlarge.click();
    const language = menu.locator('select[name="lang"]');
    await language.selectOption("en");
    await expect(page).toHaveURL(/\/atlas\/en\/$/);
    await expect(language.locator('option[value="ja"]')).toHaveText(
      "日本語(Japanese)",
    );
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-pref-font-size",
      "xlarge",
    );
  });
});

test.describe("キーボード操作", () => {
  test("Skip to content が最初のフォーカスで現れる", async ({ page }) => {
    await page.goto("./");
    await page.keyboard.press("Tab");
    await expect(page.locator(".skip-link")).toBeFocused();
  });
});
