/**
 * 「読んだ」「理解した」の端末内履歴。
 * サーバー送信やアカウント同期は行わず、localStorage にだけ保存する。
 */
export type LearningState = "read" | "understood";

export interface LearningHistoryEntry {
  articleId: string;
  locale: string;
  title: string;
  href: string;
  subject: string;
  category: string;
  summary: string;
  readAt?: number;
  understoodAt?: number;
}

const KEY = "atlasez-learning-history";

export function loadLearningHistory(): LearningHistoryEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as LearningHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: LearningHistoryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* 保存できない環境でも記事閲覧は妨げない */
  }
}

export function getLearningState(articleId: string): {
  read: boolean;
  understood: boolean;
} {
  const entry = loadLearningHistory().find(
    (item) => item.articleId === articleId,
  );
  return {
    read: Boolean(entry?.readAt),
    understood: Boolean(entry?.understoodAt),
  };
}

export function toggleLearningState(
  article: Omit<LearningHistoryEntry, "readAt" | "understoodAt">,
  state: LearningState,
): { read: boolean; understood: boolean } {
  const entries = loadLearningHistory();
  const index = entries.findIndex(
    (item) => item.articleId === article.articleId,
  );
  const current: LearningHistoryEntry =
    index >= 0 ? entries[index] : { ...article };
  const now = Date.now();

  if (state === "read") {
    if (current.readAt) {
      delete current.readAt;
      delete current.understoodAt;
    } else {
      current.readAt = now;
    }
  } else if (current.understoodAt) {
    delete current.understoodAt;
  } else {
    current.readAt ??= now;
    current.understoodAt = now;
  }

  if (!current.readAt && !current.understoodAt) {
    if (index >= 0) entries.splice(index, 1);
  } else if (index >= 0) {
    entries[index] = current;
  } else {
    entries.push(current);
  }
  save(entries);
  return {
    read: Boolean(current.readAt),
    understood: Boolean(current.understoodAt),
  };
}

export function clearLearningState(state: LearningState): void {
  const next = loadLearningHistory()
    .map((entry) => {
      if (state === "understood") {
        const copy = { ...entry };
        delete copy.understoodAt;
        return copy;
      }
      return null;
    })
    .filter((entry): entry is LearningHistoryEntry => entry !== null);
  save(next);
}
