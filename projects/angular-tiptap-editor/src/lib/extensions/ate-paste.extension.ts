import { isDevMode } from "@angular/core";
import { Extension } from "@tiptap/core";
import { DOMSerializer, Fragment } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { AtePasteConfig, AtePasteSource } from "../models/ate-paste.model";

/** Set on HTML copied from an editor, so a later paste knows it comes from an editor */
const EDITOR_CLIPBOARD_MARKER = "data-ate-copy";
const OFFICE_HTML = /urn:schemas-microsoft-com:office|class="?Mso|mso-/i;

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

/** Removes the formats turned off in `config` (`colors`, `highlights`) from pasted HTML */
export function stripPastedFormats(html: string, config: AtePasteConfig): string {
  const keepColors = config.colors !== false;
  const keepHighlights = config.highlights !== false;
  if (keepColors && keepHighlights) {
    return html;
  }
  const template = document.createElement("template");
  template.innerHTML = html;
  const content = template.content;
  const styleProperties = [
    ...(keepColors ? [] : ["color"]),
    ...(keepHighlights ? [] : ["background-color", "background"]),
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
    return [
      new Plugin({
        key: new PluginKey("atePaste"),
        props: {
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
