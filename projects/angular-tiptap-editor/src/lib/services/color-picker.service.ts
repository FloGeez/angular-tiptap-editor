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
   * Capture current editor selection.
   */
  captureSelection(editor: Editor) {
    if (!editor) return;
    this.storedSelection = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
  }

  /**
   * Get last captured selection.
   */
  getStoredSelection(): ColorPickerSelection | null {
    return this.storedSelection;
  }

  /**
   * Clear captured selection.
   */
  done() {
    this.storedSelection = null;
  }

  /**
   * Normalize color values.
   */
  normalizeColor(color: string): string {
    if (!color) return "#000000";
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
   * Calculate luminance.
   */
  getLuminance(color: string): number {
    const hex = this.normalizeColor(color).replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000;
  }

  /**
   * Returns contrast color.
   */
  getContrastColor(color: string): "black" | "white" {
    return this.getLuminance(color) > 128 ? "black" : "white";
  }
}
