import sanitizeHtml from "sanitize-html";

/** Sanitize church-supplied rich text before render (defense in depth; also sanitize on store). */
const OPTS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "u", "ul", "ol", "li", "a", "h2", "h3", "h4", "blockquote", "b"],
  allowedAttributes: { a: ["href", "title", "rel", "target"] },
  allowedSchemes: ["https", "mailto"],
  transformTags: { a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }) },
};

export const sanitize = (html: string) => sanitizeHtml(html, OPTS);
