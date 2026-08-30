import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import { repairEditorFenceBoundaries } from "../../src/lib/markdown-editor-recovery.mjs";

describe("editor Markdown recovery", () => {
  it("splits a TikZ fence accidentally joined to the next heading", () => {
    const tree = unified()
      .use(remarkParse)
      .use(remarkMath)
      .use(remarkDirective)
      .use(repairEditorFenceBoundaries)
      .parse(
        "```tikz\n\\begin{tikzpicture}\\end{tikzpicture}\n```# 次の節\n\n本文\n",
      );

    unified().use(repairEditorFenceBoundaries).runSync(tree);

    expect(tree.children).toHaveLength(3);
    expect(tree.children[0]).toMatchObject({ type: "code", lang: "tikz" });
    expect(tree.children[1]).toMatchObject({ type: "heading", depth: 1 });
    expect(tree.children[2]).toMatchObject({ type: "paragraph" });
  });
});
