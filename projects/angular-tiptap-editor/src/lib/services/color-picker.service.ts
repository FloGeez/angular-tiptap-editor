import { Injectable } from "@angular/core";
import type { Editor } from "@tiptap/core";

export interface ColorPickerSelection {
  from: number;
  to: number;
}

@Injectable({
  providedIn: "root",
})
export class ColorPickerService {
  private storedSelection: ColorPickerSelection | null = null;

  /**
   * Find the first explicitly applied color within a selection.
   */
  private findFirstAppliedColor(
    editor: Editor,
    selection: ColorPickerSelection
  ): string | null {
    const { from, to } = selection;
    let found: string | null = null;

    editor.state.doc.nodesBetween(from, to, (node) => {
      if (found) return false;
      if (!node.isText) return;

      const textStyleMark = node.marks.find((m) => m.type.name === "textStyle");
      const color = (textStyleMark?.attrs as any)?.color as string | undefined;
      if (color) {
        found = this.normalizeColor(color);
        return false;
      }

      return;
    });

    return found;
  }

  /**
   * Capture current editor selection.
   */
  captureSelection(editor: Editor) {
    const sel = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    this.storedSelection = sel;
  }

  /**
   * Get last captured selection for an editor (if any).
   */
  getStoredSelection(): ColorPickerSelection | null {
    return this.storedSelection;
  }

  /**
   * To be called when color picking is done (picker closes).
   */
  done() {
    this.storedSelection = null;
  }

  /**
   * Get the current text color for the selection.
   * If multiple colors are present, returns the first found.
   */
  getCurrentColor(editor: Editor, selection?: ColorPickerSelection): string {
    const sel =
      selection ??
      ({
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      } satisfies ColorPickerSelection);

    const found = this.findFirstAppliedColor(editor, sel);
    if (found) return found;

    const attrs = (editor.getAttributes("textStyle") as any) || {};
    return attrs.color ? this.normalizeColor(attrs.color) : "#000000";
  }

  /**
   * Check if a color is explicitly applied on the selection.
   */
  hasColorApplied(editor: Editor, selection?: ColorPickerSelection): boolean {
    const sel =
      selection ??
      ({
        from: editor.state.selection.from,
        to: editor.state.selection.to,
      } satisfies ColorPickerSelection);
    const { from, to } = sel;

    if (from === to) {
      const attrs = (editor.getAttributes("textStyle") as any) || {};
      return !!attrs.color;
    }

    const found = this.findFirstAppliedColor(editor, sel);
    if (found) return true;

    const attrs = (editor.getAttributes("textStyle") as any) || {};
    return !!attrs.color;
  }

  /**
   * Normalize color values so they can be used by <input type="color">.
   */
  normalizeColor(color: string): string {
    if (color.startsWith("#")) return color;

    const rgbMatch = color
      .trim()
      .match(
        /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)$/i
      );

    if (!rgbMatch) return "#000000";

    const r = Math.max(0, Math.min(255, parseInt(rgbMatch[1]!, 10)));
    const g = Math.max(0, Math.min(255, parseInt(rgbMatch[2]!, 10)));
    const b = Math.max(0, Math.min(255, parseInt(rgbMatch[3]!, 10)));

    return (
      "#" +
      [r, g, b]
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("")
        .toLowerCase()
    );
  }

  /**
   * Apply a color to the current selection.
   */
  applyColor(
    editor: Editor,
    color: string,
    options: { addToHistory?: boolean } = {}
  ) {
    const sel = this.getStoredSelection() ?? editor.state.selection;
    const { addToHistory = true } = options;

    let chain = editor.chain().focus();

    if (sel) {
      chain = chain.setTextSelection(sel);
    }

    (chain as any).setColor(color);

    if (!addToHistory) {
      (chain as any).setMeta("addToHistory", false);
    }

    chain.run();
  }

  /**
   * Unset color on the current selection.
   */
  unsetColor(editor: Editor, options: { addToHistory?: boolean } = {}) {
    const sel = this.getStoredSelection() ?? editor.state.selection;
    const { addToHistory = true } = options;

    let chain = editor.chain().focus();

    if (sel) {
      chain = chain.setTextSelection(sel);
    }

    (chain as any).unsetColor();

    if (!addToHistory) {
      (chain as any).setMeta("addToHistory", false);
    }

    chain.run();
  }
}
