/**
 * Where pasted (or dropped) HTML comes from.
 * - `editor`: copied from an Angular Tiptap Editor (this one or another one, in any app)
 * - `office`: copied from Microsoft Word or Excel
 * - `external`: anything else (Google Docs, web pages, other editors such as Confluence)
 */
export type AtePasteSource = "editor" | "office" | "external";

/**
 * What to do with the formatting of HTML pasted from other apps (`office` and `external` sources).
 * - `merge`: keep it, minus the formats turned off (`colors`, `highlights`, `fontFamilies`, `fontSizes`,
 *   `blockStyles`; fonts and sizes only with their menu by default, block styles only when set)
 * - `clean`: drop the colors, highlights, fonts, sizes and block styles; headings, lists, tables,
 *   links, bold and italic stay
 * - `prompt`: paste it as in the document (only the format keys set to `false` remove anything),
 *   then offer "Keep | Merge | Clean up" next to the pasted text
 */
export type AtePasteMode = "merge" | "clean" | "prompt";

/** Context given to `AtePasteConfig.transformHTML` */
export interface AtePasteContext {
  /** Where the HTML comes from, detected on the clipboard HTML as copied */
  source: AtePasteSource;
}

/**
 * Controls what is kept from HTML pasted or dropped into the editor, and how pasted Markdown is read.
 * Format keys only apply to content from other apps (`office` and `external` sources):
 * content copied from an editor always keeps its formatting.
 * Every key is read at paste time, so changes apply to the next paste.
 */
export interface AtePasteConfig {
  /**
   * Parse pasted plain text as Markdown when it contains Markdown syntax (headings, lists, quotes,
   * code fences, tables, bold, links...), also when copied from VS Code. Text without any is pasted
   * line by line as before, and so is a paste as plain text (Mod+Shift+V) or into a code block.
   * Default: `true`
   */
  markdown?: boolean;
  /** Keep text colors from other apps (`color` styles, `<font color>`). Default: `true` */
  colors?: boolean;
  /**
   * Keep highlights and background colors from other apps (`<mark>`, `background-color`): a background
   * color on text becomes a highlight of that color, white and transparent ones are dropped. Default: `true`
   */
  highlights?: boolean;
  /**
   * Keep fonts from other apps (`font-family` styles, `<font face>`).
   * Default: kept in `prompt` mode, and in `merge` mode when a font family menu is shown
   * (`toolbar.fontFamily` or `bubbleMenu.fontFamily`)
   */
  fontFamilies?: boolean;
  /**
   * Keep font sizes from other apps (`font-size` styles).
   * Default: kept in `prompt` mode, and in `merge` mode when a font size menu is shown
   * (`toolbar.fontSize` or `bubbleMenu.fontSize`)
   */
  fontSizes?: boolean;
  /**
   * Keep the layout of blocks from other apps: spacing, line height and indent of paragraphs, headings
   * and quotes, list markers, borders, backgrounds and padding of tables and cells, cell alignment and
   * column widths. The editor shows them as in the source but has no button to change them.
   * Default: kept in `prompt` mode, dropped in `merge` mode
   */
  blockStyles?: boolean;
  /**
   * What to do with the formatting of HTML pasted from Word or Excel (`office` source), see
   * `AtePasteMode`. Default: `merge`
   */
  office?: AtePasteMode;
  /**
   * What to do with the formatting of HTML pasted from other apps and web pages (`external`
   * source), see `AtePasteMode`. Default: `merge`
   */
  external?: AtePasteMode;
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
