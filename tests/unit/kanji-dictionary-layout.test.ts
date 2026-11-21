import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import remarkGfm from "remark-gfm";
import { describe, expect, it } from "vitest";
import {
  rehypeKanjiDictionaryLayout,
  remarkKanjiDictionaryLayout,
} from "../../src/lib/kanji-dictionary-layout.mjs";

describe("Kanji dictionary layout", () => {
  it("pairs one-character and compound sections and groups matching readings", async () => {
    const processor = await createMarkdownProcessor({
      remarkPlugins: [remarkGfm, remarkKanjiDictionaryLayout],
      rehypePlugins: [rehypeKanjiDictionaryLayout],
    });
    const rendered = await processor.render(
      [
        "## やせる",
        "",
        "### 【一字】",
        "",
        "| 漢字 | 読み |",
        "| --- | --- |",
        "| 痩 | や-せる |",
        "| 毀 | や-せる |",
        "",
        "### 【熟語】",
        "",
        "熟語の例",
        "",
        "## 次の項目",
        "",
        "本文",
      ].join("\n"),
    );

    expect(rendered.code).toContain('<div class="kanji-entry-grid">');
    expect(rendered.code).toContain(
      'class="kanji-entry-column kanji-entry-single"',
    );
    expect(rendered.code).toContain(
      'class="kanji-entry-column kanji-entry-compound"',
    );
    expect(rendered.code).toContain('class="kanji-character-table"');
    expect(rendered.code).toContain('rowspan="2"');
    expect(rendered.code).toContain("熟語の例");
    expect(rendered.code).toContain('<h2 id="次の項目">次の項目</h2>');
    expect(rendered.code).not.toContain("<td></td>");
  });
});
