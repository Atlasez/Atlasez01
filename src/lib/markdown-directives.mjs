/**
 * Backwards-compatible exports for integrations that used the original
 * directive module name. New code should import `article-directives.mjs`.
 */
export {
  ARTICLE_DIRECTIVE_NAMES,
  isArticleDirectiveClose,
  parseArticleDirectiveMarker,
  remarkArticleDirectives,
} from "./article-directives.mjs";

export { remarkArticleDirectives as renderArticleDirectives } from "./article-directives.mjs";
