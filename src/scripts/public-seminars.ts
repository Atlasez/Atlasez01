import { withBase } from "../lib/site";

type Seminar = {
  number: number;
  title: string;
  details: Record<string, string>;
  recruitment: "open" | "paused" | "closed";
  phase: "planned" | "active" | "paused" | "ended" | "unknown";
  acceptingApplications: boolean;
};

type CatalogResponse = { seminars: Seminar[] };
type SeminarSession = { signedIn: boolean; email?: string };

const publicOrigin = "https://atlasez.org";
const adminOrigin = "https://admin.atlasez.org";
const adminSeminarApi = `${adminOrigin}/api/seminars`;
const publicSeminarApiOrigin = import.meta.env.PUBLIC_SEMINAR_API_ORIGIN;

const seminarApiUrl = (path: string) =>
  publicSeminarApiOrigin
    ? new URL(path, publicSeminarApiOrigin).href
    : withBase(path);

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
const detailPath = (number: number) =>
  `${withBase("/seminars/detail/")}?number=${number}`;
const joinPath = (number: number) =>
  `${withBase("/seminars/join/")}?number=${number}`;

function loginPath() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const canonicalPath =
    basePath && location.pathname.startsWith(`${basePath}/`)
      ? location.pathname.slice(basePath.length)
      : location.pathname;
  const returnTo = new URL(`${canonicalPath}${location.search}`, publicOrigin)
    .href;
  return `${adminOrigin}/auth/google/login?returnTo=${encodeURIComponent(returnTo)}`;
}

async function getSession(): Promise<SeminarSession> {
  const response = await fetch(`${adminSeminarApi}/session`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("ログイン状態を確認できませんでした。");
  return (await response.json()) as SeminarSession;
}

function showSession(session: SeminarSession | null) {
  const section = document.querySelector<HTMLElement>("[data-seminar-session]");
  if (!section) return;
  section.replaceChildren();
  if (!session) {
    section.append(
      makeElement("p", undefined, "ログイン状態を確認できませんでした。"),
    );
    return;
  }
  if (session.signedIn) {
    section.append(
      makeElement(
        "p",
        undefined,
        `ログイン中${session.email ? `：${session.email}` : ""}`,
      ),
    );
    const dashboard = makeElement("a", undefined, "参加者ページを見る");
    dashboard.href = `${adminOrigin}/seminars/member/`;
    section.append(dashboard);
    return;
  }
  section.append(
    makeElement("p", undefined, "ログインせずにゼミを閲覧できます。"),
  );
  const login = makeElement("a", "button", "ログイン");
  login.href = loginPath();
  section.append(login);
}

async function renderSession() {
  try {
    showSession(await getSession());
  } catch {
    showSession(null);
  }
}

async function getSeminars(): Promise<Seminar[]> {
  const response = await fetch(seminarApiUrl("/api/seminars"), {
    cache: "no-store",
  });
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
    const response = await fetch(
      seminarApiUrl(`/api/seminars/${Number(rawNumber)}`),
      { cache: "no-store" },
    );
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

async function renderApplicationForm(kind: "propose" | "join") {
  const auth = document.querySelector<HTMLElement>("[data-form-auth]");
  const form = document.querySelector<HTMLFormElement>(
    "[data-application-form]",
  );
  const success = document.querySelector<HTMLElement>("[data-form-success]");
  const email = document.querySelector<HTMLElement>("[data-form-email]");
  if (!auth || !form || !success || !email) return;

  const login = auth.querySelector<HTMLAnchorElement>("[data-seminar-login]");
  if (login) login.href = loginPath();

  let session: SeminarSession;
  try {
    session = await getSession();
    showSession(session);
  } catch {
    showSession(null);
    auth.hidden = false;
    auth.replaceChildren(
      makeElement(
        "p",
        undefined,
        "ログイン状態を確認できませんでした。時間をおいて再度お試しください。",
      ),
    );
    return;
  }

  if (!session.signedIn) {
    auth.hidden = false;
    return;
  }
  email.textContent = session.email ?? "";

  if (kind === "join") {
    const seminars = await getSeminars();
    const accepting = seminars.filter(
      (seminar) => seminar.acceptingApplications,
    );
    const select = form.querySelector<HTMLSelectElement>(
      "[data-seminar-options]",
    );
    if (!select) return;
    for (const seminar of accepting) {
      select.add(
        new Option(
          `ゼミ番号 ${seminarNumber(seminar.number)}　${seminar.title}`,
          String(seminar.number),
        ),
      );
    }
    const requestedNumber = new URLSearchParams(location.search).get("number");
    if (requestedNumber) {
      const number = /^\d{1,10}$/.test(requestedNumber)
        ? Number(requestedNumber)
        : 0;
      select.value = String(number);
      if (!select.value) {
        auth.replaceChildren(
          makeElement(
            "p",
            undefined,
            "このゼミは現在、参加申請を受け付けていません。",
          ),
        );
        const back = makeElement("a", undefined, "ゼミ一覧へ戻る");
        back.href = withBase("/seminars/");
        auth.append(back);
        auth.hidden = false;
        return;
      }
    }
    if (accepting.length === 0) {
      auth.replaceChildren(
        makeElement(
          "p",
          undefined,
          "現在、参加申請を受け付けているゼミはありません。",
        ),
      );
      auth.hidden = false;
      return;
    }
  }

  auth.hidden = true;
  form.hidden = false;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    const message = form.querySelector<HTMLElement>("[data-form-message]");
    if (!submit || !message) return;
    submit.disabled = true;
    message.textContent = "送信しています。";
    const fields = Object.fromEntries(new FormData(form).entries());
    const path =
      kind === "propose" ? "/proposals" : `/${Number(fields.number)}/join`;
    try {
      const response = await fetch(`${adminSeminarApi}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...fields, submissionKey: crypto.randomUUID() }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        if (response.status === 401) {
          auth.hidden = false;
          message.textContent =
            "ログインの有効期限が切れました。再度ログインしてください。";
        } else
          message.textContent =
            result.error || "送信できませんでした。入力内容をご確認ください。";
        return;
      }
      form.hidden = true;
      success.hidden = false;
      const heading = success.querySelector<HTMLElement>("h2");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus();
      }
    } catch {
      message.textContent =
        "送信できませんでした。通信状態を確認して、もう一度お試しください。";
    } finally {
      submit.disabled = false;
    }
  });
}

if (document.querySelector('[data-public-seminar-page="catalog"]'))
  void renderCatalog();
if (document.querySelector('[data-public-seminar-page="detail"]'))
  void renderDetail();
if (document.querySelector("[data-seminar-session]")) void renderSession();
if (document.querySelector('[data-public-seminar-form="propose"]'))
  void renderApplicationForm("propose");
if (document.querySelector('[data-public-seminar-form="join"]'))
  void renderApplicationForm("join");
