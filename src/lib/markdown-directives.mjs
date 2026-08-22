/**
 * 数学記事で使うコンテナ directive を、公開HTMLの意味要素へ変換する。
 *
 * 証明や注釈の境界をブラウザ上の文面から推測すると、直後の段落まで
 * details 内へ取り込む事故が起きる。Markdown AST に境界を持たせ、
 * 公開サイトと記事編集プレビューが同じ入力形式を扱えるようにする。
 */

const SUPPORTED_DIRECTIVES = new Set(["folding", "proof", "rem", "supp"]);

const renderedContainer = (tagName, className, children, properties = {}) => ({
  type: "blockquote",
  data: {
    hName: tagName,
    hProperties: {
      ...properties,
      ...(className.length > 0 ? { className } : {}),
    },
  },
  children,
});

const renderedParagraph = (tagName, className, children) => ({
  type: "paragraph",
  data: {
    hName: tagName,
    hProperties: className.length > 0 ? { className } : {},
  },
  children,
});

const text = (value) => ({ type: "text", value });

const directiveLabel = (node) => {
  const first = node.children?.[0];
  if (first?.type === "paragraph" && first.data?.directiveLabel === true) {
    return {
      children: first.children,
      body: node.children.slice(1),
    };
  }
  return { children: null, body: node.children ?? [] };
};

const transformContainer = (node) => {
  const { children: label, body } = directiveLabel(node);

  if (node.name === "rem") {
    const title = renderedParagraph(
      "p",
      ["rem-title"],
      label ?? [text("注釈.")],
    );
    node.type = "blockquote";
    node.data = {
      hName: "aside",
      hProperties: { className: ["rem"], role: "note" },
    };
    node.children = [title, ...body];
    delete node.name;
    delete node.attributes;
    return;
  }

  const supplement = node.name === "supp";
  const proof = node.name === "proof";
  const summaryText = supplement ? "補足." : proof ? "証明." : "折りたたみ";
  const summary = renderedParagraph(
    "summary",
    [supplement ? "supp-details-summary" : "folding-summary"],
    label ?? [text(summaryText)],
  );
  const inner = renderedContainer(
    "div",
    [
      supplement
        ? "supp-details-inner"
        : proof
          ? "proof-details-inner"
          : "folding-content",
      ...(proof ? ["folding-content"] : []),
    ],
    body,
  );

  node.type = "blockquote";
  node.data = {
    hName: "details",
    hProperties: {
      className: supplement
        ? ["supp-details"]
        : proof
          ? ["proof-details", "folding"]
          : ["folding"],
    },
  };
  node.children = [summary, inner];
  delete node.name;
  delete node.attributes;
};

/**
 * `remark-directive` が作る AST を公開サイト用の要素へ変換する。
 * 1個・2個のコロンは意図的に受け付けず、コンテナを表す3個以上だけを
 * 有効にする。未知の directive も黙って消さず、ビルドエラーにする。
 */
export const renderArticleDirectives = () => (tree, file) => {
  const preserveNonContainer = (node) => {
    const start = node.position?.start?.offset;
    const end = node.position?.end?.offset;
    const raw =
      typeof start === "number" && typeof end === "number"
        ? String(file.value).slice(start, end)
        : `${node.type === "leafDirective" ? "::" : ":"}${String(node.name)}`;
    if (node.type === "leafDirective") {
      node.type = "paragraph";
      node.children = [text(raw)];
    } else {
      node.type = "text";
      node.value = raw;
      delete node.children;
    }
    delete node.name;
    delete node.attributes;
    delete node.data;
  };

  const visit = (node) => {
    if (!node || typeof node !== "object") return;

    if (
      node.type === "containerDirective" ||
      node.type === "leafDirective" ||
      node.type === "textDirective"
    ) {
      // Generic directivesのうち1個・2個のコロンは記事構文として有効に
      // しない。既存の「記事名:命題」のような本文と衝突するため、ASTで
      // 解釈されても元の文字列へ戻す。
      if (node.type !== "containerDirective") {
        preserveNonContainer(node);
        return;
      }
      const start = node.position?.start?.offset;
      const opening =
        typeof start === "number"
          ? (String(file.value)
              .slice(start)
              .match(/^:{3,}/u)?.[0] ?? "")
          : "";
      if (![3, 4].includes(opening.length)) {
        file.fail(
          "directive の境界には `:::` または `::::` を使ってください。",
          node,
        );
      }
      if (!SUPPORTED_DIRECTIVES.has(String(node.name))) {
        file.fail(`未対応の directive \`${String(node.name)}\` です。`, node);
      }
      for (const child of node.children ?? []) visit(child);
      transformContainer(node);
      return;
    }

    for (const child of node.children ?? []) visit(child);
  };

  visit(tree);
};
