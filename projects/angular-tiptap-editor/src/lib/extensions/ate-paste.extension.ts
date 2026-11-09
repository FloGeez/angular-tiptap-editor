import { isDevMode } from "@angular/core";
import { Editor, Extension } from "@tiptap/core";
import { DOMSerializer, Fragment, Slice } from "@tiptap/pm/model";
import { closeHistory } from "@tiptap/pm/history";
import { EditorState, Plugin, PluginKey, TextSelection, Transaction } from "@tiptap/pm/state";
import { AtePasteConfig, AtePasteMode, AtePasteSource } from "../models/ate-paste.model";
import {
  inlineOfficeClassStyles,
  prepareSourceStyles,
  stripSourceStyles,
} from "./ate-source-styles.extension";

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
  /**
   * Whether a font family menu and a font size menu are shown. In `merge` mode, pasted fonts and
   * sizes are only kept with their menu (without it they could be neither seen nor removed),
   * unless `fontFamilies` / `fontSizes` say otherwise
   */
  fontMenus: () => { family: boolean; size: boolean };
}

export interface AtePasteStorage {
  /** Source of the paste being processed, detected before any cleanup */
  source: AtePasteSource;
  /** Other versions of the paste being processed in `prompt` mode, until its transaction is applied */
  pendingVersions: AtePasteVersions | null;
  /** Set while another version replaces a paste: its HTML is final, nothing is stripped again */
  replaying: boolean;
}

/** The versions a `prompt` paste can be replaced with */
export interface AtePasteVersions {
  /** As pasted in `clean` mode */
  cleanHTML: string;
  /** As pasted in `merge` mode, null when it is the same as the pasted or the cleaned version */
  mergeHTML: string | null;
}

/** A paste in `prompt` mode, waiting for "Keep", "Merge" or "Clean up": where it is, and its versions */
export interface AtePastePrompt extends AtePasteVersions {
  from: number;
  to: number;
}

/** Every format a `clean` paste drops */
const CLEAN_CONFIG: AtePasteConfig = {
  colors: false,
  highlights: false,
  fontFamilies: false,
  fontSizes: false,
  blockStyles: false,
};

const atePastePromptKey = new PluginKey<AtePastePrompt | null>("atePastePrompt");

/** The paste waiting for "Keep" or "Clean up", null when there is none */
export function getPastePrompt(state: EditorState): AtePastePrompt | null {
  return atePastePromptKey.getState(state) ?? null;
}

/** Keeps the pasted formatting: the prompt goes away, the content stays as pasted */
export function keepPastedFormatting(editor: Editor): boolean {
  if (!getPastePrompt(editor.state)) {
    return false;
  }
  editor.view.dispatch(editor.state.tr.setMeta(atePastePromptKey, null));
  return true;
}

/**
 * Replaces the pasted content with its cleaned version, as if it had been pasted in `clean` mode.
 * A single undo brings the pasted formatting back.
 */
export function cleanPastedFormatting(editor: Editor): boolean {
  const prompt = getPastePrompt(editor.state);
  return prompt ? replacePaste(editor, prompt, prompt.cleanHTML) : false;
}

/**
 * Replaces the pasted content with its merged version, as if it had been pasted in `merge` mode:
 * the text keeps its colors, the blocks take the editor's layout. A single undo brings the pasted
 * formatting back. Does nothing when the merged version is the same as another one.
 */
export function mergePastedFormatting(editor: Editor): boolean {
  const prompt = getPastePrompt(editor.state);
  return prompt?.mergeHTML ? replacePaste(editor, prompt, prompt.mergeHTML) : false;
}

function replacePaste(editor: Editor, prompt: AtePastePrompt, html: string): boolean {
  const { view } = editor;
  const storage = editor.storage.atePaste;
  // A new undo step, even right after the paste: undo brings the pasted formatting back
  view.dispatch(
    closeHistory(
      view.state.tr
        .setSelection(TextSelection.create(view.state.doc, prompt.from, prompt.to))
        .setMeta(atePastePromptKey, null)
    )
  );
  storage.replaying = true;
  try {
    view.pasteHTML(html);
  } finally {
    storage.replaying = false;
  }
  return true;
}

/** Range of the content a paste transaction inserted, in the document after it */
function insertedRange(tr: Transaction): { from: number; to: number } | null {
  let from = Infinity;
  let to = -Infinity;
  tr.steps.forEach((step, index) => {
    const rest = tr.mapping.slice(index + 1);
    step.getMap().forEach((_oldStart, _oldEnd, newStart, newEnd) => {
      from = Math.min(from, rest.map(newStart, -1));
      to = Math.max(to, rest.map(newEnd, 1));
    });
  });
  return from < to ? { from, to } : null;
}

/**
 * The "Keep | Merge | Clean up" prompt of the `prompt` paste mode: remembers where the last paste went,
 * follows it while the document changes, and lets it go as soon as the user moves on.
 * Enter or Escape keep the formatting, Mod+Shift+Backspace cleans it up.
 */
const AtePastePromptExtension = Extension.create({
  name: "atePastePrompt",
  // Above the list, heading and paragraph handlers: Enter answers the prompt first
  priority: 1000,

  addKeyboardShortcuts() {
    const keep = () => keepPastedFormatting(this.editor);
    return {
      Enter: keep,
      Escape: keep,
      "Mod-Shift-Backspace": () => cleanPastedFormatting(this.editor),
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin<AtePastePrompt | null>({
        key: atePastePromptKey,
        state: {
          init: () => null,
          apply: (tr, prompt, oldState) => {
            const meta = tr.getMeta(atePastePromptKey) as AtePastePrompt | null | undefined;
            if (meta !== undefined) {
              return meta;
            }
            if (!prompt) {
              return null;
            }
            // Appended by another plugin right after the paste (a trailing paragraph after a
            // pasted list): not the user, the pasted range only moves
            if (tr.getMeta("appendedTransaction")) {
              return {
                ...prompt,
                from: tr.mapping.map(prompt.from, 1),
                to: tr.mapping.map(prompt.to, -1),
              };
            }
            if (tr.selection.eq(oldState.selection)) {
              return tr.docChanged ? null : prompt;
            }
            // Typing, or the cursor leaving the pasted text: the user moved on, the paste stays
            const { from, to } = tr.selection;
            return tr.docChanged || from < prompt.from || to > prompt.to ? null : prompt;
          },
        },
        appendTransaction: (transactions, _oldState, newState) => {
          const storage = editor.storage.atePaste;
          const versions = storage.pendingVersions;
          if (versions === null) {
            return null;
          }
          const paste = transactions.find(tr => {
            const uiEvent = tr.getMeta("uiEvent");
            return uiEvent === "paste" || uiEvent === "drop";
          });
          if (!paste) {
            return null;
          }
          storage.pendingVersions = null;
          const range = insertedRange(paste);
          return range
            ? newState.tr
                .setMeta(atePastePromptKey, { ...range, ...versions })
                .setMeta("addToHistory", false)
            : null;
        },
      }),
    ];
  },
});

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

/** Inline elements whose background color is a highlight (Google Docs, web pages, Word) */
const INLINE_WITH_BACKGROUND = "span, font, a, b, strong, i, em, u, s, sub, sup, code";

/** A background that shows nothing: Google Docs sets white or transparent on most text */
function isBlankBackground(color: string): boolean {
  const value = color.replace(/\s+/g, "").toLowerCase();
  return (
    !value ||
    ["transparent", "initial", "inherit", "unset", "none", "white", "#fff", "#ffffff"].includes(
      value
    ) ||
    value === "rgb(255,255,255)" ||
    /^rgba\(.*,0(\.0+)?\)$/.test(value)
  );
}

/**
 * Background colors on text become highlights (`<mark>` with that color), the only background the
 * editor can store: pasted as such, they would be lost. Blank backgrounds are dropped.
 */
function backgroundsToHighlights(content: DocumentFragment): void {
  content.querySelectorAll<HTMLElement>(INLINE_WITH_BACKGROUND).forEach(element => {
    const color = element.style.backgroundColor;
    if (!color && !element.style.background) {
      return;
    }
    element.style.removeProperty("background-color");
    element.style.removeProperty("background");
    if (!element.getAttribute("style")?.trim()) {
      element.removeAttribute("style");
    }
    if (isBlankBackground(color) || element.closest("mark")) {
      return;
    }
    const mark = document.createElement("mark");
    mark.setAttribute("data-color", color);
    mark.style.backgroundColor = color;
    element.replaceWith(mark);
    mark.append(element);
  });
}

/**
 * Removes the formats turned off in `config` (`colors`, `highlights`, `fontFamilies`, `fontSizes`,
 * `blockStyles`) from pasted HTML
 */
export function stripPastedFormats(html: string, config: AtePasteConfig): string {
  const keepColors = config.colors !== false;
  const keepHighlights = config.highlights !== false;
  const keepFontFamilies = config.fontFamilies !== false;
  const keepFontSizes = config.fontSizes !== false;
  const template = document.createElement("template");
  template.innerHTML = html;
  const content = template.content;
  if (config.blockStyles === false) {
    stripSourceStyles(content);
  } else {
    prepareSourceStyles(content);
  }
  if (keepHighlights) {
    backgroundsToHighlights(content);
  }
  if (keepColors && keepHighlights && keepFontFamilies && keepFontSizes) {
    return template.innerHTML;
  }
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
            const source = detectPasteSource(html);
            editor.storage.atePaste.source = source;
            return source === "office" ? inlineOfficeClassStyles(html) : html;
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

/** `transformHTML` of the config, the HTML unchanged when it is missing, throws or returns no string */
function applyTransform(html: string, config: AtePasteConfig, source: AtePasteSource): string {
  if (!config.transformHTML) {
    return html;
  }
  try {
    const transformed = config.transformHTML(html, { source });
    return typeof transformed === "string" ? transformed : html;
  } catch (error) {
    if (isDevMode()) {
      console.warn("[ATE] paste.transformHTML failed, inserting the HTML unchanged.", error);
    }
    return html;
  }
}

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
      fontMenus: () => ({ family: true, size: true }),
    };
  },

  addStorage() {
    return {
      source: "external",
      pendingVersions: null,
      replaying: false,
    };
  },

  addExtensions() {
    return [AtePasteSourceTracker, AtePastePromptExtension];
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
            storage.pendingVersions = null;
            // Another version of an earlier paste: already stripped and transformed
            if (storage.replaying) {
              return html;
            }
            const config = options.config();
            const source = storage.source;
            if (source === "editor") {
              return applyTransform(html, config, source);
            }
            const mode: AtePasteMode = config[source] ?? "merge";
            const clean = () =>
              applyTransform(stripPastedFormats(html, CLEAN_CONFIG), config, source);
            if (mode === "clean") {
              return clean();
            }
            const merge = () => {
              const menus = options.fontMenus();
              const mergeConfig: AtePasteConfig = {
                ...config,
                fontFamilies: config.fontFamilies ?? menus.family,
                fontSizes: config.fontSizes ?? menus.size,
                // Without a way to see or change them in the editor, kept only when asked
                blockStyles: config.blockStyles ?? false,
              };
              return applyTransform(stripPastedFormats(html, mergeConfig), config, source);
            };
            if (mode === "merge") {
              return merge();
            }
            // Prompt: pasted as in the document (only the keys set to false strip anything), so
            // that Keep keeps it all, and Merge and Clean up have their versions ready
            const kept = applyTransform(stripPastedFormats(html, config), config, source);
            // Every version goes through transformHTML. Nothing to offer when they are the same
            const cleaned = clean();
            const merged = merge();
            if (cleaned !== kept || merged !== kept) {
              storage.pendingVersions = {
                cleanHTML: cleaned,
                mergeHTML: merged !== kept && merged !== cleaned ? merged : null,
              };
            }
            return kept;
          },
        },
      }),
    ];
  },
});
