#!/usr/bin/env node
/**
 * 記事本文に埋め込んだ画像・図の検証。
 *
 * - 画像には空でない alt を必須にする
 * - GitHub Pages の BASE_PATH でも壊れない相対 images/ URLだけを許可する
 * - public/images 配下の実ファイルが存在することを確認する
 * - 外部 iframe、script、インラインイベント属性を記事本文へ持ち込まない
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const articlesRoot = join(root, "src/content/articles");
const publicRoot = join(root, "public");
const errors = [];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(["'])(.*?)\\1`, "iu"));
  return match?.[2]?.trim() ?? "";
}

function checkImage(file, tag, source) {
  const src = attribute(tag, "src");
  const alt = attribute(tag, "alt");
  const fileLabel = relative(root, file);
  if (!src) {
    errors.push(`${fileLabel}: 画像のsrcがありません (${source})`);
    return;
  }
  if (!alt) errors.push(`${fileLabel}: 画像のaltがありません (${source})`);
  if (/^https?:\/\//iu.test(src)) {
    errors.push(`${fileLabel}: 外部画像URLは禁止です (${src})`);
    return;
  }
  const imageMatch = src.match(/(?:^|\/)images\/(.+)$/u);
  if (!imageMatch) {
    errors.push(
      `${fileLabel}: 画像はBASE_PATH対応のimages/相対URLを使ってください (${src})`,
    );
    return;
  }
  const assetPath = join(publicRoot, "images", imageMatch[1]);
  if (!existsSync(assetPath) || !statSync(assetPath).isFile()) {
    errors.push(
      `${fileLabel}: 画像ファイルがありません (${relative(root, assetPath)})`,
    );
  }
}

for (const file of walk(articlesRoot)) {
  const text = readFileSync(file, "utf8");
  const fileLabel = relative(root, file);

  if (/<\/?(?:script|iframe|object|embed)\b/iu.test(text)) {
    errors.push(
      `${fileLabel}: script/iframe/object/embedは記事本文へ直接埋め込めません`,
    );
  }
  if (/\bon[a-z]+\s*=/iu.test(text)) {
    errors.push(
      `${fileLabel}: インラインイベント属性は記事本文へ埋め込めません`,
    );
  }

  for (const match of text.matchAll(/<img\b[^>]*>/giu)) {
    checkImage(file, match[0], "HTML img");
  }

  for (const match of text.matchAll(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+[^)]*)?\)/gu,
  )) {
    const [, alt, src] = match;
    checkImage(file, `<img alt="${alt}" src="${src}">`, "Markdown image");
  }
}

if (errors.length) {
  console.error(`記事メディア検証エラー: ${errors.length}件`);
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(
  "記事メディア検証OK: 画像参照・alt・安全な埋め込みを確認しました。",
);
