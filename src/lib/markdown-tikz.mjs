import { renderTikzSource } from "./tikz-renderer.mjs";

/** Compile authored TikZ fences during Astro's Node build. */
export const renderArticleTikz = () => async (tree) => {
  const visit = async (node) => {
    if (!Array.isArray(node?.children)) return;
    for (const child of node.children) {
      if (
        child?.type === "code" &&
        String(child.lang ?? "").toLowerCase() === "tikz"
      ) {
        const result = await renderTikzSource(child.value);
        child.type = "html";
        child.value = `<div class="tikz-diagram" data-tikz-hash="${result.hash}">${result.svg}</div>`;
        delete child.lang;
        delete child.meta;
      } else {
        await visit(child);
      }
    }
  };
  await visit(tree);
};
