import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";

// Parse the tail with the same Markdown extensions used by the public site so
// directives and math can continue through the normal conversion pipeline.
const editorRecoveryParser = unified()
  .use(remarkParse)
  .use(remarkMath)
  .use(remarkDirective);

/**
 * Recover an editor artifact where a closing fence and the next heading were
 * saved on one line (for example, ```# Next heading). The source is kept
 * untouched; only the in-memory AST passed to the renderer is repaired.
 */
export const repairEditorFenceBoundaries = () => (tree) => {
  if (!tree || !Array.isArray(tree.children)) return;
  const repaired = [];
  for (const node of tree.children) {
    if (
      node?.type === "code" &&
      String(node.lang ?? "").toLowerCase() === "tikz"
    ) {
      const boundary = String(node.value ?? "").match(
        /\r?\n(`{3,}|~{3,})(?=#\s)/u,
      );
      if (boundary?.index !== undefined && boundary[1]) {
        const fenceEnd = boundary.index + boundary[0].length;
        const tikzValue = String(node.value).slice(0, boundary.index).trimEnd();
        const markdownTail = String(node.value).slice(fenceEnd);
        node.value = tikzValue;
        repaired.push(
          node,
          ...editorRecoveryParser.parse(markdownTail).children,
        );
        continue;
      }
    }
    repaired.push(node);
  }
  tree.children = repaired;
};
