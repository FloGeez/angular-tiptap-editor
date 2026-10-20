import { Editor, Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export interface AteLinkShortcutOptions {
  /** Whether a link can be set or edited at the current selection */
  canOpen: () => boolean;
  /** Opens the link editor */
  open: (editor: Editor) => void;
}

/** Matches the bare `Mod+K` chord (`Cmd+K` on macOS, `Ctrl+K` elsewhere) */
export function isLinkShortcut(event: KeyboardEvent): boolean {
  return (
    (event.metaKey || event.ctrlKey) &&
    !event.shiftKey &&
    !event.altKey &&
    event.key.toLowerCase() === "k"
  );
}

/**
 * `Mod+K` opens the link editor when text is selected or the cursor is on a link.
 * With an empty selection outside a link the event is left alone, so host-level `Mod+K`
 * shortcuts (search, command palettes) keep working.
 */
export const AteLinkShortcut = Extension.create<AteLinkShortcutOptions>({
  name: "ateLinkShortcut",

  addOptions() {
    return {
      canOpen: () => true,
      open: () => undefined,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const options = this.options;

    return [
      new Plugin({
        key: new PluginKey("ateLinkShortcut"),
        props: {
          handleKeyDown: (view, event) => {
            if (!isLinkShortcut(event) || !view.editable) {
              return false;
            }
            if (view.state.selection.empty && !editor.isActive("link")) {
              return false;
            }
            if (!options.canOpen()) {
              return false;
            }
            event.preventDefault();
            event.stopPropagation();
            options.open(editor);
            return true;
          },
        },
      }),
    ];
  },
});
