import { readFileSync } from "node:fs";
import {
  getPublishedArticles,
  getPublishedSubjects,
} from "../../../../../lib/content";

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const logoDataUri = `data:image/png;base64,${readFileSync(
  "public/images/atlasez-logo-og.png",
).toString("base64")}`;

/** Keep the title readable in a 1200×630 social preview. */
const titleLines = (title: string) => {
  const chars = Array.from(title.trim());
  const lines: string[] = [];
  while (chars.length > 0 && lines.length < 3) {
    lines.push(chars.splice(0, 8).join(""));
  }
  if (chars.length > 0) {
    const last = lines[2] ?? "";
    lines[2] = `${Array.from(last).slice(0, 6).join("")}…`;
  }
  return lines.length > 0 ? lines : ["Atlasez"];
};

const image = (title: string, subject: string, category: string) => {
  const lines = titleLines(title);
  const titleMarkup = lines
    .map(
      (line, index) =>
        `<text x="92" y="${275 + index * 82}" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif" font-size="76" font-weight="800" fill="#18324a">${escapeXml(line)}</text>`,
    )
    .join("");
  const label = [subject, category].filter(Boolean).join(" / ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">Atlasez 学習サイトの記事「${escapeXml(title)}」</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b8e3f7" />
      <stop offset="1" stop-color="#28688f" />
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1478ab" />
      <stop offset="1" stop-color="#073b62" />
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#background)" />
  <circle cx="1050" cy="90" r="260" fill="#438fb9" opacity=".72" />
  <circle cx="1130" cy="520" r="210" fill="#4d9fc5" opacity=".88" />
  <path d="M0 530 C220 450 360 610 570 535 S930 440 1200 520 V630 H0Z" fill="#267ca7" opacity=".82" />
  <rect x="70" y="70" width="1060" height="490" rx="28" fill="#fff" />
  <rect x="70" y="70" width="14" height="490" rx="7" fill="url(#accent)" />
  <image href="${logoDataUri}" x="750" y="95" width="360" height="360" preserveAspectRatio="xMidYMid meet" />
  <text x="92" y="190" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif" font-size="22" fill="#5b7384">${escapeXml(label)}</text>
  ${titleMarkup}
  <line x1="92" y1="496" x2="1108" y2="496" stroke="#d7e6ed" stroke-width="2" />
  <text x="92" y="540" font-family="Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif" font-size="24" font-weight="700" fill="#18324a">未来の学びを創る。学びで未来を創る。</text>
</svg>`;
};

export async function getStaticPaths() {
  const articles = await getPublishedArticles();
  const subjects = await getPublishedSubjects();
  return articles.map((entry) => {
    const subject = subjects.find(
      (item) => item.data.slug === entry.data.subject,
    );
    const category = subject?.data.categories.find(
      (item) => item.slug === entry.data.category,
    );
    return {
      params: {
        locale: entry.data.locale,
        subject: entry.data.subject,
        category: entry.data.category,
        slug: entry.data.slug,
      },
      props: {
        entry,
        subjectLabel:
          subject?.data.name[entry.data.locale] ?? entry.data.subject,
        categoryLabel: category?.name[entry.data.locale] ?? entry.data.category,
      },
    };
  });
}

export const GET = ({
  props,
}: {
  props: {
    entry: Awaited<ReturnType<typeof getPublishedArticles>>[number];
    subjectLabel: string;
    categoryLabel: string;
  };
}) => {
  const { entry, subjectLabel, categoryLabel } = props;
  return new Response(image(entry.data.title, subjectLabel, categoryLabel), {
    headers: { "content-type": "image/svg+xml; charset=utf-8" },
  });
};
