import { isDevMode } from "@angular/core";
import { Editor, Extension } from "@tiptap/core";
import { DOMSerializer, Fragment, Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { AtePasteConfig, AtePasteSource } from "../models/ate-paste.model";

/** Set on HTML copied from an editor, so a later paste knows it comes from an editor */
const EDITOR_CLIPBOARD_MARKER = "data-ate-copy";
const OFFICE_HTML = /urn:schemas-microsoft-com:office|class="?Mso|mso-/i;
/** VS Code copies colored HTML alongside the text: its text is what was written */
const VSCODE_CLIPBOARD_TYPE = "vscode-editor-data";

/** Syntax that plain text does not use. Text without any is pasted as plain paragraphs, line by line */
const MARKDOWN_SYNTAX = [
  /^#{1,6}\s/m, // heading
  /^\s*(?:[-*+]|\d+[.)])\s/m, // list item, task item
  /^>/m, // blockquote
  /^(?:```|~~~)/m, // code fence
  /^\s*\|?\s*:?-{3,}:?\s*\|/m, // table delimiter row
  /^(?:-{3,}|\*{3,}|_{3,})\s*$/m, // horizontal rule
  /\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|==[^=\n]+==|`[^`\n]+`/, // bold, strike, highlight, code
  /\[[^\]\n]*\]\([^)\s]+(?:\s+"[^"\n]*")?\)/, // link, image
];

export function looksLikeMarkdown(text: string): boolean {
  return MARKDOWN_SYNTAX.some(syntax => syntax.test(text));
}

/** Parses Markdown into a slice that merges into the current block like a regular paste */
function parseMarkdownSlice(editor: Editor, text: string): Slice | null {
  if (!editor.markdown) {
    return null;
  }
  try {
    return Slice.maxOpen(editor.schema.nodeFromJSON(editor.markdown.parse(text)).content);
  } catch {
    return null;
  }
}

export interface AtePasteOptions {
  /** Paste settings, read on every paste so they can change at runtime */
  config: () => AtePasteConfig;
}

export interface AtePasteStorage {
  /** Source of the paste being processed, detected before any cleanup */
  source: AtePasteSource;
}

declare module "@tiptap/core" {
  interface Storage {
    atePaste: AtePasteStorage;
  }
}

/** Detects where clipboard HTML comes from. Must run on the HTML as copied, before any cleanup */
export function detectPasteSource(html: string): AtePasteSource {
  if (html.includes(EDITOR_CLIPBOARD_MARKER)) {
    return "editor";
  }
  return OFFICE_HTML.test(html) ? "office" : "external";
}

/**
 * Removes the formats turned off in `config` (`colors`, `highlights`, `fontFamilies`, `fontSizes`)
 * from pasted HTML
 */
export function stripPastedFormats(html: string, config: AtePasteConfig): string {
  const keepColors = config.colors !== false;
  const keepHighlights = config.highlights !== false;
  const keepFontFamilies = config.fontFamilies !== false;
  const keepFontSizes = config.fontSizes !== false;
  if (keepColors && keepHighlights && keepFontFamilies && keepFontSizes) {
    return html;
  }
  const template = document.createElement("template");
  template.innerHTML = html;
  const content = template.content;
  const styleProperties = [
    ...(keepColors ? [] : ["color"]),
    ...(keepHighlights ? [] : ["background-color", "background"]),
    ...(keepFontFamilies ? [] : ["font-family"]),
    ...(keepFontSizes ? [] : ["font-size"]),
  ];
  content.querySelectorAll<HTMLElement>("[style]").forEach(element => {
    styleProperties.forEach(property => element.style.removeProperty(property));
    if (!element.getAttribute("style")?.trim()) {
      element.removeAttribute("style");
    }
  });
  if (!keepColors) {
    content.querySelectorAll("font[color]").forEach(font => font.removeAttribute("color"));
  }
  if (!keepFontFamilies) {
    content.querySelectorAll("font[face]").forEach(font => font.removeAttribute("face"));
  }
  if (!keepHighlights) {
    content.querySelectorAll("[bgcolor]").forEach(element => element.removeAttribute("bgcolor"));
    content
      .querySelectorAll("mark")
      .forEach(mark => mark.replaceWith(...Array.from(mark.childNodes)));
  }
  return template.innerHTML;
}

/**
 * Runs before every other paste cleanup (the Office cleanup removes the markers it relies on):
 * records the source of each paste, and marks HTML copied from the editor.
 */
const AtePasteSourceTracker = Extension.create({
  name: "atePasteSourceTracker",
  priority: 100000,

  addProseMirrorPlugins() {
    const editor = this.editor;
    const serializer = DOMSerializer.fromSchema(editor.schema);
    return [
      new Plugin({
        key: new PluginKey("atePasteSourceTracker"),
        props: {
          transformPastedHTML: html => {
            editor.storage.atePaste.source = detectPasteSource(html);
            return html;
          },
          clipboardSerializer: {
            serializeFragment: (fragment: Fragment, options?: { document?: Document }) => {
              const dom = serializer.serializeFragment(fragment, options);
              dom.firstElementChild?.setAttribute(EDITOR_CLIPBOARD_MARKER, "");
              return dom;
            },
          } as DOMSerializer,
        },
      }),
    ];
  },
});

/**
 * Applies `AtePasteConfig` to pasted and dropped HTML, after the Office cleanup:
 * removes the formats turned off for content from other apps, then calls `transformHTML`.
 * Parses pasted plain text that looks like Markdown, unless `markdown` is `false`.
 */
export const AtePaste = Extension.create<AtePasteOptions, AtePasteStorage>({
  name: "atePaste",

  addOptions() {
    return {
      config: () => ({}),
    };
  },

  addStorage() {
    return {
      source: "external",
    };
  },

  addExtensions() {
    return [AtePasteSourceTracker];
  },

  addProseMirrorPlugins() {
    const options = this.options;
    const storage = this.storage;
    const editor = this.editor;
    const parsesMarkdown = (text: string) =>
      options.config().markdown !== false && looksLikeMarkdown(text);
    return [
      new Plugin({
        key: new PluginKey("atePaste"),
        props: {
          // Plain text only (no HTML on the clipboard). Not called in code blocks, and `plain`
          // is set for a paste as plain text (Mod+Shift+V), which stays line by line.
          // Typed as always returning a slice, but ProseMirror falls back to its own parsing on null
          clipboardTextParser: (text, _$context, plain) =>
            (!plain && parsesMarkdown(text) ? parseMarkdownSlice(editor, text) : null) as Slice,
          handlePaste: (view, event) => {
            const clipboard = event.clipboardData;
            if (!clipboard?.types.includes(VSCODE_CLIPBOARD_TYPE)) {
              return false;
            }
            const text = clipboard.getData("text/plain");
            if (view.state.selection.$from.parent.type.spec.code || !parsesMarkdown(text)) {
              return false;
            }
            const slice = parseMarkdownSlice(editor, text);
            if (!slice) {
              return false;
            }
            view.dispatch(
              view.state.tr
                .replaceSelection(slice)
                .scrollIntoView()
                .setMeta("paste", true)
                .setMeta("uiEvent", "paste")
            );
            return true;
          },
          transformPastedHTML: html => {
            const config = options.config();
            const source = storage.source;
            const stripped = source === "editor" ? html : stripPastedFormats(html, config);
            if (!config.transformHTML) {
              return stripped;
            }
            try {
              const transformed = config.transformHTML(stripped, { source });
              return typeof transformed === "string" ? transformed : stripped;
            } catch (error) {
              if (isDevMode()) {
                console.warn(
                  "[ATE] paste.transformHTML failed, inserting the HTML unchanged.",
                  error
                );
              }
              return stripped;
            }
          },
        },
      }),
    ];
  },
});
