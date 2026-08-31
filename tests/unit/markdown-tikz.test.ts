import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { renderArticleTikz } from "../../src/lib/markdown-tikz.mjs";

const applyTikz = async (source: string) => {
  const tree = {
    type: "root",
    children: [{ type: "code", lang: "tikz", value: source }],
  };
  await renderArticleTikz()(tree);
  return tree.children[0];
};

describe("public TikZ Markdown plugin", () => {
  it("compiles a TikZ fence to Japanese SVG markup", async () => {
    const processor = unified()
      .use(remarkParse)
      .use(renderArticleTikz)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeStringify, { allowDangerousHtml: true });
    const html = String(
      await processor.process(
        "```tikz\n\\begin{tikzpicture}\\node at (0,0){群};\\end{tikzpicture}\n```",
      ),
    );
    expect(html).toContain('class="tikz-diagram"');
    expect(html).toContain("群");
    expect(html).not.toContain("ATLASEZUNICODE");
  });

  it("embeds a valid TikZ block as SVG HTML", async () => {
    const node = await applyTikz(
      String.raw`\begin{tikzpicture}\draw (0,0)--(1,0);\end{tikzpicture}`,
    );
    expect(node.type).toBe("html");
    expect(node.value).toContain('class="tikz-diagram"');
    expect(node.value).toContain("<svg");
  });

  it("keeps the article renderable when one TikZ block is invalid", async () => {
    const node = await applyTikz(
      String.raw`\begin{tikzpicture}\draw (0,0)--(1,0);`,
    );
    expect(node.type).toBe("html");
    expect(node.value).toContain('class="tikz-error"');
    expect(node.value).toContain("TikZを描画できませんでした");
    expect(node.value).not.toContain("<script");
  });
});
