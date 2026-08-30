/** Shared safety and size policy for TikZ used by the public build. */
export const TIKZ_MAX_SOURCE_LENGTH = 64_000;
export const TIKZ_MAX_RENDERED_SVG_LENGTH = 4_000_000;

export const TIKZ_DANGEROUS_COMMAND_PATTERN =
  /\\(?:input|include|openin|openout|write18|directlua|latelua|read|write|catcode|special|pdfobj|immediate)\b|(?:https?:|file:|data:)/i;

// The bundled TeX engine has no CJK input/font package. Mask authored
// Unicode before TeX sees it, then restore it in generated SVG text.
export function maskTikzUnicode(source) {
  const replacements = [];
  const masked = String(source ?? "").replace(/[^\x00-\x7F]+/gu, (value) => {
    const token = `ATLASEZUNICODE${replacements.length}X`;
    replacements.push([token, value]);
    return token;
  });
  return { source: masked, replacements };
}

export function restoreTikzUnicode(svg, replacements = []) {
  let value = String(svg ?? "");
  for (const [token, original] of replacements) {
    const pattern = token
      .split("")
      .map((character) => character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("(?:</text><text[^>]*>)?");
    value = value.replace(new RegExp(pattern, "g"), () => original);
  }
  return value;
}

export function normalizeTikzMathSlashes(source) {
  const replaceInMath = (value) => {
    let result = "";
    for (let index = 0; index < value.length; index += 1) {
      if (
        value[index] === "/" &&
        value[index - 1] !== "\\" &&
        !value.slice(Math.max(0, index - 6), index).includes("\\left")
      ) {
        result += "\\left/\\right.";
      } else {
        result += value[index];
      }
    }
    return result;
  };
  let value = String(source ?? "");
  value = value.replace(
    /(\\begin\{tikzcd\})([\s\S]*?)(\\end\{tikzcd\})/gi,
    (_, open, body, close) => `${open}${replaceInMath(body)}${close}`,
  );
  return value.replace(
    /(\$+)([\s\S]*?)\1/g,
    (_, delimiter, body) => `${delimiter}${replaceInMath(body)}${delimiter}`,
  );
}

export function normalizeTikzSvgFonts(svg) {
  return String(svg ?? "")
    .replace(/font-family\s*:\s*cmmi(\d+)/gi, "font-family: KaTeX_Math, cmmi$1")
    .replace(
      /font-family\s*=\s*(['"])cmmi(\d+)\1/gi,
      'font-family="KaTeX_Math, cmmi$2"',
    )
    .replace(/font-family\s*:\s*cmr(\d+)/gi, "font-family: KaTeX_Main, cmr$1")
    .replace(
      /font-family\s*=\s*(['"])cmr(\d+)\1/gi,
      'font-family="KaTeX_Main, cmr$1"',
    );
}

export function assertSafeTikzSource(source) {
  const value = String(source ?? "");
  if (!value.trim()) throw new Error("TikZソースが空です。");
  if (value.length > TIKZ_MAX_SOURCE_LENGTH)
    throw new Error(
      `TikZソースは${TIKZ_MAX_SOURCE_LENGTH.toLocaleString()}文字以内です。`,
    );
  if (TIKZ_DANGEROUS_COMMAND_PATTERN.test(value))
    throw new Error(
      "外部ファイル読み込みやシェル実行を含むTikZソースは利用できません。",
    );
  if (
    /\\(?:documentclass|begin\s*\{document\}|end\s*\{document\})/i.test(value)
  )
    throw new Error(
      "TikZブロック内にdocument環境やdocumentclassは書けません。",
    );
  return value;
}
