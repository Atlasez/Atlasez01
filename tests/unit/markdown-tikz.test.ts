import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { renderArticleTikz } from "../../src/lib/markdown-tikz.mjs";

describe("public TikZ Markdown renderer", () => {
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
});
