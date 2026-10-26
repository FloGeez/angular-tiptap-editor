/**
 * Where pasted (or dropped) HTML comes from.
 * - `editor`: copied from an Angular Tiptap Editor (this one or another one, in any app)
 * - `office`: copied from Microsoft Word or Excel
 * - `external`: anything else (Google Docs, web pages, other editors such as Confluence)
 */
export type AtePasteSource = "editor" | "office" | "external";

/** Context given to `AtePasteConfig.transformHTML` */
export interface AtePasteContext {
  /** Where the HTML comes from, detected on the clipboard HTML as copied */
  source: AtePasteSource;
}

/**
 * Controls what is kept from HTML pasted or dropped into the editor.
 * Format keys only apply to content from other apps (`office` and `external` sources):
 * content copied from an editor always keeps its formatting.
 * Every key is read at paste time, so changes apply to the next paste.
 */
export interface AtePasteConfig {
  /** Keep text colors from other apps (`color` styles, `<font color>`). Default: `true` */
  colors?: boolean;
  /** Keep highlights and background colors from other apps (`<mark>`, `background-color`). Default: `true` */
  highlights?: boolean;
  /**
   * Last step before the HTML is parsed: receives the HTML (after the Office cleanup and the format keys above)
   * and returns the HTML to insert. Called for every source, including `editor`.
   * If it throws or does not return a string, the HTML is inserted as it was before this step.
   *
   * @example Drop images pasted from web pages
   * ```typescript
   * transformHTML: (html, { source }) =>
   *   source === 'external' ? html.replace(/<img[^>]*>/g, '') : html
   * ```
   */
  transformHTML?: (html: string, context: AtePasteContext) => string;
}
