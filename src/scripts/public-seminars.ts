type Seminar = {
  number: number;
  title: string;
  details: Record<string, string>;
  recruitment: "open" | "paused" | "closed";
  phase: "planned" | "active" | "paused" | "ended" | "unknown";
  acceptingApplications: boolean;
};

type CatalogResponse = { seminars: Seminar[] };

const recruitmentLabels: Record<Seminar["recruitment"], string> = {
  open: "募集中",
  paused: "募集停止",
  closed: "募集終了",
};

const phaseLabels: Record<Seminar["phase"], string> = {
  planned: "開始前",
  active: "実施中",
  paused: "休止中",
  ended: "終了",
  unknown: "実施状況未掲載",
};

const detailFields = [
  ["theme", "テーマ"],
  ["purpose", "目的"],
  ["description", "内容"],
  ["goals", "到達目標"],
  ["method", "進め方"],
  ["materials", "教材"],
  ["prerequisites", "前提知識"],
  ["conditions", "参加条件"],
  ["observation", "見学"],
  ["lateJoin", "途中参加"],
  ["schedule", "日時"],
  ["period", "開催期間"],
  ["frequency", "開催頻度"],
  ["format", "形式"],
  ["venue", "場所"],
  ["currentSize", "現在の参加人数"],
  ["capacity", "定員"],
  ["organizer", "主催者"],
  ["remarks", "備考"],
] as const;

const makeElement = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
};

const seminarNumber = (number: number) => String(number).padStart(7, "0");
const detailPath = (number: number) => `/seminars/detail/?number=${number}`;
const joinPath = (number: number) =>
  `https://admin.atlasez.org/seminars/join/?number=${number}`;

async function getSeminars(): Promise<Seminar[]> {
  const response = await fetch("/api/seminars", { cache: "no-store" });
  if (!response.ok) throw new Error("一覧を取得できませんでした。");
  const data = (await response.json()) as CatalogResponse;
  return Array.isArray(data.seminars) ? data.seminars : [];
}

function renderCard(seminar: Seminar) {
  const item = makeElement("li", "public-seminar-card");
  const title = makeElement("h3");
  const link = makeElement("a", undefined, seminar.title);
  link.href = detailPath(seminar.number);
  title.append(link);
  const number = makeElement(
    "p",
    "public-seminar-number",
    `ゼミ番号 ${seminarNumber(seminar.number)}`,
  );
  const summary = makeElement(
    "p",
    "public-seminar-summary",
    seminar.details.purpose ||
      seminar.details.description ||
      seminar.details.theme ||
      "ゼミの詳細をご覧ください。",
  );
  const metadata = makeElement("p", "public-seminar-meta");
  metadata.append(
    makeElement(
      "span",
      "public-seminar-status",
      recruitmentLabels[seminar.recruitment],
    ),
    makeElement("span", undefined, phaseLabels[seminar.phase]),
  );
  item.append(number, title, summary, metadata);
  if (seminar.acceptingApplications) {
    const actions = makeElement("div", "public-seminar-card-actions");
    const join = makeElement("a", "button", "参加を申請");
    join.href = joinPath(seminar.number);
    actions.append(join);
    item.append(actions);
  }
  return item;
}

async function renderCatalog() {
  const results = document.querySelector<HTMLElement>("[data-seminar-results]");
  const count = document.querySelector<HTMLElement>("[data-seminar-count]");
  const query = document.querySelector<HTMLInputElement>(
    "[data-seminar-query]",
  );
  const recruitment = document.querySelector<HTMLSelectElement>(
    "[data-seminar-recruitment]",
  );
  if (!results || !count || !query || !recruitment) return;
  try {
    const seminars = await getSeminars();
    const update = () => {
      const keyword = query.value.trim().toLocaleLowerCase("ja");
      const filtered = seminars.filter((seminar) => {
        const matchesStatus =
          !recruitment.value || seminar.recruitment === recruitment.value;
        const searchable = [
          seminar.title,
          seminarNumber(seminar.number),
          ...Object.values(seminar.details),
        ]
          .join(" ")
          .toLocaleLowerCase("ja");
        return matchesStatus && (!keyword || searchable.includes(keyword));
      });
      count.textContent = `${filtered.length}件`;
      results.replaceChildren();
      if (filtered.length === 0) {
        results.append(
          makeElement(
            "p",
            "public-seminar-empty",
            "条件に合うゼミはありません。",
          ),
        );
        return;
      }
      const list = makeElement("ul", "public-seminar-results");
      for (const seminar of filtered) list.append(renderCard(seminar));
      results.append(list);
    };
    query.addEventListener("input", update);
    recruitment.addEventListener("change", update);
    update();
  } catch {
    count.textContent = "";
    results.replaceChildren(
      makeElement(
        "p",
        "public-seminar-error",
        "一覧を読み込めませんでした。時間をおいて再度お試しください。",
      ),
    );
  } finally {
    results.removeAttribute("aria-busy");
  }
}

function renderDetails(seminar: Seminar) {
  const heading = makeElement("header", "public-seminar-detail-heading");
  heading.append(
    makeElement(
      "p",
      "public-seminar-number",
      `ゼミ番号 ${seminarNumber(seminar.number)}`,
    ),
    makeElement("h1", undefined, seminar.title),
  );
  const status = makeElement("p", "public-seminar-meta");
  status.append(
    makeElement(
      "span",
      "public-seminar-status",
      recruitmentLabels[seminar.recruitment],
    ),
    makeElement("span", undefined, phaseLabels[seminar.phase]),
  );
  heading.append(status);

  const details = makeElement("dl", "public-seminar-details");
  for (const [key, label] of detailFields) {
    const value = seminar.details[key];
    if (!value && key === "remarks") continue;
    const row = makeElement("div");
    row.append(
      makeElement("dt", undefined, label),
      makeElement("dd", undefined, value || "掲載情報なし"),
    );
    details.append(row);
  }

  const actions = makeElement("div", "public-seminar-actions");
  if (seminar.acceptingApplications) {
    const join = makeElement("a", "button", "このゼミに参加申請");
    join.href = joinPath(seminar.number);
    actions.append(join);
  } else {
    actions.append(
      makeElement(
        "p",
        "public-seminar-empty",
        "現在、参加申請を受け付けていません。",
      ),
    );
  }
  const page = document.querySelector<HTMLElement>("[data-seminar-detail]");
  page?.replaceChildren(heading, details, actions);
  page?.removeAttribute("aria-busy");
}

async function renderDetail() {
  const page = document.querySelector<HTMLElement>("[data-seminar-detail]");
  const rawNumber = new URLSearchParams(location.search).get("number") ?? "";
  if (!page) return;
  if (!/^\d{1,10}$/.test(rawNumber)) {
    page.replaceChildren(
      makeElement("p", "public-seminar-error", "ゼミ番号を確認してください。"),
    );
    page.removeAttribute("aria-busy");
    return;
  }
  try {
    const response = await fetch(`/api/seminars/${Number(rawNumber)}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error("掲載中のゼミが見つかりません。");
    renderDetails((await response.json()) as Seminar);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ゼミ詳細を取得できませんでした。";
    page.replaceChildren(makeElement("p", "public-seminar-error", message));
    page.removeAttribute("aria-busy");
  }
}

if (document.querySelector('[data-public-seminar-page="catalog"]'))
  void renderCatalog();
if (document.querySelector('[data-public-seminar-page="detail"]'))
  void renderDetail();
