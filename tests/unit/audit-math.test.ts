import { describe, expect, it } from "vitest";
import { maskFencedCode } from "../../scripts/audit-math.mjs";

describe("math audit code-fence masking", () => {
  it("masks TeX commands inside fenced code while preserving prose and offsets", () => {
    const source = [
      "本文の\\begin{document}は監査対象です。",
      "```tikz",
      "\\begin{tikzpicture}",
      "  $not-math$",
      "\\end{tikzpicture}",
      "```",
      "本文の\\end{document}も監査対象です。",
      "",
    ].join("\n");

    const masked = maskFencedCode(source);

    expect(masked.length).toBe(source.length);
    expect(masked).toContain("本文の\\begin{document}は監査対象です。");
    expect(masked).toContain("本文の\\end{document}も監査対象です。");
    expect(masked).not.toContain("tikzpicture");
    expect(masked).not.toContain("not-math");
  });

  it("supports tilde fences and requires a matching closing fence", () => {
    const source = [
      "~~~tex",
      "\\begin{align*}",
      "x &= y",
      "~~~",
      "\\begin{outside}",
    ].join("\n");

    const masked = maskFencedCode(source);

    expect(masked).not.toContain("align");
    expect(masked).toContain("\\begin{outside}");
  });
});
