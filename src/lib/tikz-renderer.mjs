import { createHash } from "node:crypto";
import tikzjax from "node-tikzjax";
import {
  TIKZ_MAX_RENDERED_SVG_LENGTH,
  assertSafeTikzSource,
  maskTikzUnicode,
  normalizeTikzMathSlashes,
  normalizeTikzSvgFonts,
  restoreTikzUnicode,
} from "./tikz-policy.mjs";

const tex2svg =
  typeof tikzjax === "function"
    ? tikzjax
    : (tikzjax?.default?.default ?? tikzjax?.default);
if (typeof tex2svg !== "function")
  throw new Error("node-tikzjaxのレンダラーを読み込めませんでした。");

const TIKZ_FONT_CSS_URL =
  "https://cdn.jsdelivr.net/npm/node-tikzjax@1.0.5/css/fonts.css";
const TIKZ_RENDER_CACHE_SIZE = 8;
let renderQueue = Promise.resolve();
const renderCache = new Map();

function extractDeclarations(source) {
  let body = source;
  const packages = [];
  const libraries = [];
  body = body.replace(
    /\\usepackage(?:\[([^\]\r\n]*)\])?\{([^}\r\n]+)\}/gi,
    (_, options = "", names) => {
      for (const name of names.split(","))
        packages.push([name.trim(), options]);
      return "";
    },
  );
  body = body.replace(/\\usetikzlibrary\{([^}\r\n]+)\}/gi, (_, names) => {
    libraries.push(...names.split(",").map((name) => name.trim()));
    return "";
  });
  return { body, packages, libraries };
}

function sanitizeRenderedSvg(svg) {
  const value = String(svg ?? "").trim();
  if (
    !/^<svg(?:\s|>)/i.test(value) ||
    value.length > TIKZ_MAX_RENDERED_SVG_LENGTH
  )
    throw new Error("生成されたSVGが不正または4MBを超えています。");
  if (
    /<(?:script|foreignObject|iframe|object|embed)\b|\bon[a-z][a-z0-9_-]*\s*=|(?:href|xlink:href)\s*=\s*["']\s*(?:https?:|\/\/|javascript:)/i.test(
      value,
    )
  )
    throw new Error("安全でないSVGを生成したため表示を中止しました。");
  return value;
}

export async function renderTikzSource(source) {
  const checked = normalizeTikzMathSlashes(assertSafeTikzSource(source));
  const unicode = maskTikzUnicode(checked);
  const declarations = extractDeclarations(unicode.source);
  const packages = Object.fromEntries(declarations.packages);
  const body = declarations.body.trim();
  const cacheKey = JSON.stringify({
    body,
    packages,
    libraries: declarations.libraries,
    unicode: unicode.replacements,
  });
  const cached = renderCache.get(cacheKey);
  if (cached) {
    renderCache.delete(cacheKey);
    renderCache.set(cacheKey, cached);
    return cached;
  }
  const render = async () => {
    const svg = await tex2svg(`\\begin{document}${body}\\end{document}`, {
      texPackages: packages,
      tikzLibraries: declarations.libraries.join(","),
      embedFontCss: true,
      fontCssUrl: TIKZ_FONT_CSS_URL,
      disableOptimize: false,
    });
    const normalizedSvg = sanitizeRenderedSvg(
      restoreTikzUnicode(
        normalizeTikzSvgFonts(
          String(svg).replace(
            /\b(fill|stroke)=(['"])#(?:000|000000)\2/gi,
            "$1=$2currentColor$2",
          ),
        ),
        unicode.replacements,
      ),
    );
    return {
      svg: normalizedSvg,
      hash: createHash("sha256").update(cacheKey).digest("hex"),
    };
  };
  const result = renderQueue.then(render, render);
  renderQueue = result.then(
    () => undefined,
    () => undefined,
  );
  renderCache.set(cacheKey, result);
  while (renderCache.size > TIKZ_RENDER_CACHE_SIZE)
    renderCache.delete(renderCache.keys().next().value);
  result.catch(() => {
    if (renderCache.get(cacheKey) === result) renderCache.delete(cacheKey);
  });
  return result;
}
