import {
  phaseLabels,
  recruitmentLabels,
  seminarNumber,
} from "../../lib/seminar-fields";
import { api, html, urlFor, type CatalogItem } from "./shared";

const groups: {
  status: keyof typeof recruitmentLabels;
  id: string;
}[] = [
  { status: "open", id: "seminar-open" },
  { status: "paused", id: "seminar-paused" },
  { status: "closed", id: "seminar-closed" },
];

const searchText = (item: CatalogItem) =>
  [item.title, seminarNumber(item.number), ...Object.values(item.details)]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ja-JP");

function seminarListItem(item: CatalogItem) {
  const phase = item.phase === "unknown" ? "" : phaseLabels[item.phase];

  return `<li class="seminar-catalog-row" data-seminar-card data-status="${html(item.recruitment)}" data-search="${html(searchText(item))}">
    <article class="seminar-catalog-row-content">
      <span class="seminar-catalog-number">ゼミ番号 ${seminarNumber(item.number)}</span>
      <h3><a href="${urlFor("detail", item.number)}">${html(item.title)}</a></h3>
      <span class="seminar-catalog-badges">
        <span class="seminar-catalog-badge">${recruitmentLabels[item.recruitment]}</span>
        ${phase ? `<span class="seminar-catalog-phase">開催状況：${phase}</span>` : ""}
      </span>
      <div class="seminar-catalog-row-actions">
        <a class="button button-secondary" href="${urlFor("detail", item.number)}">詳細を見る</a>
        ${item.acceptingApplications ? `<a class="button" href="${urlFor("join", item.number)}">参加申請</a>` : ""}
      </div>
    </article>
  </li>`;
}

export async function renderCatalog(content: HTMLElement) {
  const { seminars } = await api<{ seminars: CatalogItem[] }>();
  const search = document.querySelector<HTMLInputElement>(
    "[data-catalog-search]",
  );
  const status = document.querySelector<HTMLSelectElement>(
    "[data-catalog-status]",
  );

  content.innerHTML = `<p class="seminar-muted" data-catalog-count data-seminar-catalog-count aria-live="polite"></p><div class="seminar-catalog-groups-inner" data-catalog-results></div><p class="seminar-catalog-empty" data-catalog-empty hidden>条件に合うゼミはありません。検索語や募集状況を変えてお試しください。</p>`;
  const results = content.querySelector<HTMLElement>("[data-catalog-results]");
  const count = content.querySelector<HTMLElement>("[data-catalog-count]");
  const empty = content.querySelector<HTMLElement>("[data-catalog-empty]");
  if (!results || !count || !empty) return;

  const ordered = [...seminars].sort((a, b) => b.number - a.number);
  const update = () => {
    const keyword = search?.value.trim().toLocaleLowerCase("ja-JP") ?? "";
    const recruitment = status?.value ?? "";
    const matched = ordered.filter(
      (item) =>
        (!keyword || searchText(item).includes(keyword)) &&
        (!recruitment || item.recruitment === recruitment),
    );
    count.textContent =
      keyword || recruitment
        ? `${matched.length}件が見つかりました。`
        : `${matched.length}件のゼミを掲載しています。`;
    empty.hidden = matched.length > 0;

    results.innerHTML = groups
      .filter(
        ({ status: groupStatus }) =>
          !recruitment || groupStatus === recruitment,
      )
      .map(({ status: groupStatus, id }) => {
        const entries = matched.filter(
          (item) => item.recruitment === groupStatus,
        );
        const label = recruitmentLabels[groupStatus];
        return `<section class="seminar-catalog-group" aria-labelledby="${id}-heading">
          <header class="seminar-catalog-group-heading">
            <h2 id="${id}-heading">${label}</h2>
            <span class="seminar-muted">${entries.length}件</span>
          </header>
          ${entries.length ? `<ul class="seminar-catalog-list">${entries.map(seminarListItem).join("")}</ul>` : `<p class="seminar-catalog-empty">該当するゼミはありません。</p>`}
        </section>`;
      })
      .join("");
  };

  search?.addEventListener("input", update);
  status?.addEventListener("change", update);
  update();
}
