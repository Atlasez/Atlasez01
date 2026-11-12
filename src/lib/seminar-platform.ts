export const SEMINAR_ADMIN_ORIGIN = "https://admin.atlasez.org";
export const SEMINAR_PUBLIC_ORIGIN = "https://atlasez.org";
export const SEMINAR_PUBLIC_PATH = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/seminars/`;

export function publicSeminarPage(page = "") {
  return `${SEMINAR_PUBLIC_PATH}${page ? `${page}/` : ""}`;
}

export function memberPage(page = "member", number?: number) {
  const url = new URL(`/seminars/${page}/`, SEMINAR_ADMIN_ORIGIN);
  if (number !== undefined) url.searchParams.set("number", String(number));
  return url.toString();
}
