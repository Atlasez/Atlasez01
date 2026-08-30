import { renderTikzSource } from "./tikz-renderer.mjs";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Compile authored TikZ fences during Astro's Node build. */
export const renderArticleTikz = () => async (tree) => {
  const visit = async (node) => {
    if (!Array.isArray(node?.children)) return;
    for (const child of node.children) {
      if (
        child?.type === "code" &&
        String(child.lang ?? "").toLowerCase() === "tikz"
      ) {
        child.type = "html";
        try {
          const result = await renderTikzSource(child.value);
          child.value = `<div class="tikz-diagram" data-tikz-hash="${result.hash}">${result.svg}</div>`;
        } catch (error) {
          // A malformed diagram must not make Astro drop the whole content
          // entry. Keep the authored source visible so the article remains
          // readable and the author can repair the diagram later.
          const message = escapeHtml(
            error instanceof Error
              ? error.message
              : "TikZの変換に失敗しました。",
          );
          child.value = `<details class="tikz-diagram tikz-fallback" data-tikz-error="true"><summary>TikZ図を表示できませんでした（元のコード）</summary><p class="tikz-error-message">${message}</p><pre><code>${escapeHtml(child.value)}</code></pre></details>`;
        }
        delete child.lang;
        delete child.meta;
      } else {
        await visit(child);
      }
    }
  };
  await visit(tree);
};
