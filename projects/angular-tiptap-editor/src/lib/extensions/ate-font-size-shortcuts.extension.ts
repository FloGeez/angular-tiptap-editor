import { Editor, Extension } from "@tiptap/core";

export interface AteFontSizeShortcutsOptions {
  /** Whether the shortcuts are active. Evaluated on every key press, so it can change at runtime */
  enabled: () => boolean;
  /** Makes the selection one pixel larger (`1`) or smaller (`-1`) */
  step: (editor: Editor, delta: 1 | -1) => void;
}

/** `Mod+Shift+.` and `Mod+Shift+,` make the selected text one pixel larger or smaller, as in Google Docs */
export const AteFontSizeShortcuts = Extension.create<AteFontSizeShortcutsOptions>({
  name: "ateFontSizeShortcuts",

  addOptions() {
    return {
      enabled: () => false,
      step: () => undefined,
    };
  },

  addKeyboardShortcuts() {
    const run = (delta: 1 | -1) => () => {
      if (!this.options.enabled() || !this.editor.can().setFontSize("1px")) {
        return false;
      }
      this.options.step(this.editor, delta);
      return true;
    };
    return {
      "Mod-Shift-.": run(1),
      "Mod-Shift-,": run(-1),
    };
  },
});
