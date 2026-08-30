#!/usr/bin/env node
import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOT = "src/content/articles/jpn/mathematics";
const WRITE = process.argv.includes("--write");
const CHECK = process.argv.includes("--check");

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? markdownFiles(path)
        : path.endsWith(".md")
          ? [path]
          : [];
    }),
  );
  return nested.flat();
}

const proofStart = /^証明(?:[.。]|\s|$)\s*/u;
const proofEnd = /[◻□∎]\s*$/u;
const legacyEnvironmentStart = /^\s*\\begin\{(rem|proof|supp|folding)\}\s*$/u;
const legacyEnvironmentEnd = /^\s*\\end\{(rem|proof|supp|folding)\}\s*$/u;
const legacyDivStart =
  /^\s*<div\s+class="(folding|supp|rem)"(?:\s+data-(?:summary|title)="([^"]*)")?\s*>\s*$/u;
const directiveStart =
  /^\s*(:{3,4})\s*(proof|folding|rem|supp)(?:\[[^\]]*\])?(?:\s+.*?)?\s*$/u;
const anyDirectiveStart = /^\s*(:{3,})\s*([A-Za-z][\w-]*)/u;
const directiveEnd = /^\s*(:{3,4})\s*$/u;
const anyDirectiveEnd = /^\s*(:{3,})\s*$/u;
const supplementStart = /^補足(?:[.。．:：]|\s|$)\s*/u;
const supplementBoundary =
  /^(?:#{1,6}\s+|(?:定義|命題|定理|補題|系|例|証明|補足)(?:\s*\d+|[.。．:：\s]))/u;

function validateDirectives(source, file) {
  const stack = [];
  let codeFence = "";
  for (const [index, line] of source.split("\n").entries()) {
    const fence = line.match(/^\s*(`{3,}|~{3,})/u)?.[1] ?? "";
    if (fence && !codeFence) codeFence = fence[0];
    else if (fence && codeFence && fence[0] === codeFence) codeFence = "";
    if (codeFence) continue;

    const start = line.match(directiveStart);
    if (start) {
      const parent = stack.at(-1);
      if (parent && start[1].length >= parent.fence) {
        throw new Error(
          `${file}:${index + 1}: 入れ子の directive は外側より短いコロン列で開始してください。`,
        );
      }
      stack.push({ name: start[2], fence: start[1].length, line: index + 1 });
      continue;
    }
    const unknown = line.match(anyDirectiveStart);
    if (unknown) {
      throw new Error(
        `${file}:${index + 1}: 未対応の directive \`${unknown[2]}\` です。`,
      );
    }
    const end = line.match(directiveEnd);
    if (!end) {
      if (anyDirectiveEnd.test(line)) {
        throw new Error(
          `${file}:${index + 1}: 閉じ記号には ::: または :::: を使ってください。`,
        );
      }
      continue;
    }
    const current = stack.at(-1);
    if (!current || end[1].length < current.fence) {
      throw new Error(
        `${file}:${index + 1}: 対応する開始記号がない閉じ記号です。`,
      );
    }
    stack.pop();
  }
  const current = stack.at(-1);
  if (current) {
    throw new Error(
      `${file}:${current.line}: \`${current.name}\` directive が閉じていません。`,
    );
  }
}

function migrateSupplements(source, file) {
  const lines = source.split("\n");
  const stack = [];
  const ranges = [];
  let codeFence = "";
  for (const [index, line] of lines.entries()) {
    const fence = line.match(/^\s*(`{3,}|~{3,})/u)?.[1] ?? "";
    if (fence && !codeFence) codeFence = fence[0];
    else if (fence && codeFence && fence[0] === codeFence) codeFence = "";
    if (codeFence) continue;
    const start = line.match(directiveStart);
    if (start) {
      stack.push({
        name: start[2],
        fence: start[1].length,
        start: index,
      });
      continue;
    }
    const end = line.match(directiveEnd);
    const current = stack.at(-1);
    if (end && current && end[1].length >= current.fence) {
      stack.pop();
      ranges.push({ ...current, end: index });
    }
  }

  const blocks = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!supplementStart.test(lines[index])) continue;
    const existingSupplement = ranges.some(
      (range) =>
        range.name === "supp" && range.start < index && index < range.end,
    );
    if (existingSupplement) continue;
    const proof = ranges.find(
      (range) =>
        range.name === "proof" && range.start < index && index < range.end,
    );
    let end = index;
    if (proof) {
      while (end < proof.end && !proofEnd.test(lines[end])) end += 1;
      if (end >= proof.end) {
        throw new Error(
          `${file}:${index + 1}: 証明内の補足に終止記号がありません。`,
        );
      }
      if (proof.fence < 4) {
        lines[proof.start] = lines[proof.start].replace(/^\s*:{3}/u, "::::");
        lines[proof.end] = lines[proof.end].replace(/^\s*:{3}\s*$/u, "::::");
        proof.fence = 4;
      }
    } else {
      while (end + 1 < lines.length) {
        const next = lines[end + 1].trim();
        if (supplementBoundary.test(next) || directiveStart.test(next)) break;
        end += 1;
      }
    }
    blocks.push({ start: index, end });
    index = end;
  }

  for (const block of blocks.toReversed()) {
    lines[block.start] = lines[block.start].replace(supplementStart, "");
    lines.splice(block.end + 1, 0, ":::");
    lines.splice(block.start, 0, ":::supp");
  }
  return { value: lines.join("\n"), changed: blocks.length };
}

function migrate(source, file) {
  const lines = source.replace(/\r\n/gu, "\n").split("\n");
  const output = [];
  const legacyBlocks = [];
  const existingDirectives = [];
  let codeFence = "";
  let proofOpen = false;
  let changed = 0;

  for (const line of lines) {
    const fence = line.match(/^\s*(`{3,}|~{3,})/u)?.[1] ?? "";
    if (fence && !codeFence) codeFence = fence[0];
    else if (fence && codeFence && fence[0] === codeFence) codeFence = "";

    if (codeFence) {
      output.push(line);
      continue;
    }

    const existingStart = line.match(directiveStart);
    if (existingStart) {
      existingDirectives.push({
        name: existingStart[2],
        fence: existingStart[1].length,
      });
    } else {
      const existingEnd = line.match(directiveEnd);
      const current = existingDirectives.at(-1);
      if (existingEnd && current && existingEnd[1].length >= current.fence) {
        existingDirectives.pop();
      }
    }

    const environmentStart = line.match(legacyEnvironmentStart);
    if (environmentStart) {
      const name = environmentStart[1];
      output.push(`:::${name}`);
      legacyBlocks.push({ type: "environment", name });
      changed += 1;
      continue;
    }
    const environmentEnd = line.match(legacyEnvironmentEnd);
    if (environmentEnd) {
      const current = legacyBlocks.pop();
      if (
        current?.type !== "environment" ||
        current.name !== environmentEnd[1]
      ) {
        throw new Error(`${file}: 対応しない ${line.trim()} があります。`);
      }
      output.push(":::");
      changed += 1;
      continue;
    }

    const divStart = line.match(legacyDivStart);
    if (divStart) {
      const [, name, label] = divStart;
      output.push(`:::${name}${label ? `[${label}]` : ""}`);
      legacyBlocks.push({ type: "div", name });
      changed += 1;
      continue;
    }
    if (legacyBlocks.at(-1)?.type === "div" && /^\s*<\/div>\s*$/u.test(line)) {
      legacyBlocks.pop();
      output.push(":::");
      changed += 1;
      continue;
    }

    const insideExistingProof = existingDirectives.some(
      (directive) => directive.name === "proof",
    );
    if (!proofOpen && !insideExistingProof && proofStart.test(line)) {
      output.push(":::proof");
      const body = line.replace(proofStart, "");
      if (body) output.push(body);
      proofOpen = true;
      changed += 1;
      if (proofEnd.test(body)) {
        output.push(":::");
        proofOpen = false;
      }
      continue;
    }

    output.push(line);
    if (proofOpen && proofEnd.test(line)) {
      output.push(":::");
      proofOpen = false;
    }
  }

  if (proofOpen)
    throw new Error(`${file}: \`証明\` に対応する終止記号がありません。`);
  if (legacyBlocks.length > 0) {
    throw new Error(`${file}: 閉じていない旧環境があります。`);
  }

  const supplements = migrateSupplements(output.join("\n"), file);
  const value = supplements.value;
  changed += supplements.changed;
  validateDirectives(value, file);
  return { value, changed };
}

const pending = [];
let replacements = 0;
for (const file of await markdownFiles(ROOT)) {
  const source = await readFile(file, "utf8");
  const result = migrate(source, file);
  if (result.value === source) continue;
  pending.push(relative(".", file));
  replacements += result.changed;
  if (WRITE) await writeFile(file, result.value, "utf8");
}

if (pending.length === 0) {
  console.log(
    "Math directives are canonical: no legacy proof/rem/folding syntax remains.",
  );
  process.exit(0);
}

const action = WRITE ? "migrated" : "would migrate";
console.log(`${action} ${replacements} blocks in ${pending.length} files:`);
console.log(pending.join("\n"));
if (CHECK) process.exit(1);
