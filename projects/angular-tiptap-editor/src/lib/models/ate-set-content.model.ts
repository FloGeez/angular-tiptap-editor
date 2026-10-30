export interface AteSetContentOptions {
  emitUpdate?: boolean;
  preserveSelection?: boolean;
  preserveScroll?: boolean;
  resetHistory?: boolean;
  /** How a string `content` is parsed. Defaults to `'html'`; `'markdown'` goes through `@tiptap/markdown` */
  contentType?: "html" | "markdown" | "json";
}
