import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import katex from "katex";
import "katex/contrib/mhchem";

const ROOT = "src/content/articles";
const macros = {
  "\\dv": "\\frac{\\mathrm{d}#1}{\\mathrm{d}#2}",
  "\\dvtwo": "\\frac{\\mathrm{d}^{2}#1}{\\mathrm{d}#2^{2}}",
  "\\dd": "\\,\\mathrm{d}#1",
  "\\vdot": "\\mathbin{\\cdot}",
  "\\divergence": "\\nabla\\mathbin{\\cdot}",
};

async function markdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory()
        ? markdownFiles(path)
        : path.endsWith(".md")
          ? [path]
          : [];
    }),
  );
  return nested.flat();
}

function lineAt(text, offset) {
  return text.slice(0, offset).split("\n").length;
}

function maskLine(line) {
  return line.replace(/[^\n]/g, " ");
}

function maskFencedCode(text) {
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  let fence = null;

  return lines
    .map((line) => {
      const marker = line.match(/^ {0,3}(`{3,}|~{3,})([^\n]*)/u);
      if (!fence && marker) {
        const markerCharacter = marker[1][0];
        const info = marker[2].replace(/\r?\n$/u, "");
        if (markerCharacter !== "`" || !info.includes("`")) {
          fence = { character: markerCharacter, length: marker[1].length };
          return maskLine(line);
        }
      }

      if (fence) {
        const closing = new RegExp(
          `^ {0,3}${fence.character}{${fence.length},}[ \\t]*(?:\\r?\\n)?$`,
          "u",
        );
        const masked = maskLine(line);
        if (closing.test(line)) fence = null;
        return masked;
      }

      return line;
    })
    .join("");
}

function maskRanges(text, ranges) {
  return ranges.reduce(
    (masked, [start, end]) =>
      masked.slice(0, start) +
      maskLine(masked.slice(start, end)) +
      masked.slice(end),
    text,
  );
}

async function auditMath() {
  const failures = [];
  const strictWarnings = [];
  const katexStrict = (file, line) => (code, message) => {
    if (code === "unicodeTextInMathMode") {
      strictWarnings.push(`${relative(".", file)}:${line}: ${message}`);
    }
    return "ignore";
  };
  for (const file of await markdownFiles(ROOT)) {
    const source = await readFile(file, "utf8");
    const text = maskFencedCode(source);
    const ranges = [];
    const blockPattern = /\$\$([\s\S]*?)\$\$/g;
    let match;
    while ((match = blockPattern.exec(text))) {
      ranges.push([match.index, blockPattern.lastIndex]);
      try {
        katex.renderToString(match[1], {
          displayMode: true,
          throwOnError: true,
          strict: katexStrict(file, lineAt(source, match.index)),
          macros,
        });
      } catch (error) {
        failures.push(
          `${relative(".", file)}:${lineAt(source, match.index)}: ${error.message}`,
        );
      }
    }
    const withoutBlocks = maskRanges(text, ranges);
    const inlinePattern = /(?<!\\)\$([^$\n]+?)(?<!\\)\$/g;
    while ((match = inlinePattern.exec(withoutBlocks))) {
      try {
        katex.renderToString(match[1], {
          displayMode: false,
          throwOnError: true,
          strict: katexStrict(file, lineAt(source, match.index)),
          macros,
        });
      } catch (error) {
        failures.push(
          `${relative(".", file)}:${lineAt(source, match.index)}: ${error.message}`,
        );
      }
    }
    const prose = withoutBlocks.replace(inlinePattern, "");
    const rawCommand = /\\(?:begin|end)\{[^}]+\}/g;
    while ((match = rawCommand.exec(prose))) {
      failures.push(
        `${relative(".", file)}:${lineAt(source, match.index)}: math environment outside $ delimiters: ${match[0]}`,
      );
    }
  }
  failures.push(...new Set(strictWarnings));

  if (failures.length) {
    console.error(
      `Math audit failed (${failures.length}):\n${failures.join("\n")}`,
    );
    return false;
  }
  console.log(
    "Math audit passed: every delimited formula passes the shared TeX compatibility check.",
  );
  return true;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (!(await auditMath())) process.exitCode = 1;
}

export { maskFencedCode };
