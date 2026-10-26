import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const INTERNAL_CLIPBOARD_MARKER = "data-pm-slice";
const COLOR_STYLE_PROPERTIES = ["color", "background-color", "background"];

export interface AtePasteColorsOptions {
  /** Whether text colors and highlights are dropped from pasted HTML. Evaluated on every paste, so it can change at runtime */
  stripColors: () => boolean;
}

/**
 * Removes text colors and highlights from clipboard HTML copied in another application.
 * HTML copied from an editor (it carries ProseMirror's `data-pm-slice` marker) is returned untouched.
 */
export function stripExternalPasteColors(html: string): string {
  if (html.includes(INTERNAL_CLIPBOARD_MARKER)) {
    return html;
  }
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content.querySelectorAll<HTMLElement>("[style]").forEach(element => {
    COLOR_STYLE_PROPERTIES.forEach(property => element.style.removeProperty(property));
    if (!element.getAttribute("style")?.trim()) {
      element.removeAttribute("style");
    }
  });
  template.content.querySelectorAll("font[color]").forEach(font => font.removeAttribute("color"));
  template.content
    .querySelectorAll("[bgcolor]")
    .forEach(element => element.removeAttribute("bgcolor"));
  template.content
    .querySelectorAll("mark")
    .forEach(mark => mark.replaceWith(...Array.from(mark.childNodes)));
  return template.innerHTML;
}

/**
 * Opt-in cleanup of text colors and highlights pasted from other applications (Google Docs, Word, web pages).
 * Their hard-coded colors (black text, white backgrounds) clash with dark themes and the app's palette.
 * Copying and pasting inside an editor keeps colors, and every other format (bold, links, lists, tables) is preserved.
 */
export const AtePasteColors = Extension.create<AtePasteColorsOptions>({
  name: "atePasteColors",

  addOptions() {
    return {
      stripColors: () => false,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin({
        key: new PluginKey("atePasteColors"),
        props: {
          transformPastedHTML: html =>
            options.stripColors() ? stripExternalPasteColors(html) : html,
        },
      }),
    ];
  },
});
