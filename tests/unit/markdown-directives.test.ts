import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkDirective from "remark-directive";
import remarkParse from "remark-parse";
import { renderArticleDirectives } from "../../src/lib/markdown-directives.mjs";

type TestNode = {
  value?: string;
  data?: {
    hName?: string;
    hProperties?: { className?: string[]; role?: string };
  };
  children?: TestNode[];
};

const parse = async (source: string) => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkDirective)
    .use(renderArticleDirectives);
  return processor.run(processor.parse(source), { value: source });
};

const plainText = (node: unknown): string => {
  if (!node || typeof node !== "object") return "";
  const value = "value" in node ? node.value : undefined;
  if (typeof value === "string") return value;
  const children = "children" in node ? node.children : undefined;
  return Array.isArray(children) ? children.map(plainText).join("") : "";
};

describe("math article directives", () => {
  it("renders nested containers with explicit boundaries", async () => {
    const tree = await parse(`::::folding[外側]
本文

:::rem[注意]
注釈
:::
::::`);
    const folding = (tree as unknown as TestNode).children?.[0];
    expect(folding).toBeDefined();
    if (!folding) throw new Error("folding directive was not rendered");
    expect(folding.data?.hName).toBe("details");
    expect(folding.data?.hProperties?.className).toContain("folding");
    const inner = folding.children?.[1];
    const annotation = inner?.children?.find(
      (child) => child.data?.hName === "aside",
    );
    expect(annotation?.data?.hProperties).toMatchObject({
      className: ["rem"],
      role: "note",
    });
    expect(plainText(annotation)).toContain("注意注釈");
  });

  it("leaves one- and two-colon text unchanged", async () => {
    const source = "参照 [群の定義:命題 4] と ::note";
    const tree = await parse(source);
    expect(plainText(tree)).toBe(source);
  });

  it("rejects unsupported container names", async () => {
    await expect(parse(":::unknown\n本文\n:::")).rejects.toThrow(
      "未対応の directive",
    );
  });

  it("accepts only three- and four-colon fences", async () => {
    await expect(parse(":::::proof\n本文 ◻\n:::::")).rejects.toThrow(
      "境界には `:::` または `::::`",
    );
  });
});
