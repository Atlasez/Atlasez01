#!/usr/bin/env node
/**
 * Ensure every generated article page still contains a rendered body.
 * Astro's content loader can report a Markdown rendering error and continue
 * the build, which otherwise leaves an empty <Content /> slot in production.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const dist = process.argv[2] ?? "dist";
const errors = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.name === "index.html") files.push(path);
  }
  return files;
}

const files = await walk(dist);
for (const file of files) {
  const html = await readFile(file, "utf8");
  if (!html.includes('class="article-main"')) continue;
  const bodyStart = html.indexOf('class="article-body reading');
  if (bodyStart < 0) continue;
  const contentStart = html.indexOf(">", bodyStart);
  const bodyEnd = html.indexOf('class="article-bottom-history"', contentStart);
  if (contentStart < 0 || bodyEnd < 0) {
    errors.push(`${relative(process.cwd(), file)}: 本文領域を検出できません`);
    continue;
  }
  const body = html.slice(contentStart + 1, bodyEnd);
  if (!body.trim())
    errors.push(`${relative(process.cwd(), file)}: 公開記事の本文が空です`);
}

if (errors.length) {
  console.error(`公開記事本文検査エラー: ${errors.length}件`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`公開記事本文検査OK: ${files.length}ページを確認しました。`);
