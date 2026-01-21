import { Injectable, signal } from "@angular/core";
import type { Editor } from "@tiptap/core";
import { normalizeColor, getLuminance, getContrastColor } from "../utils/color.utils";

export interface ColorPickerSelection {
  from: number;
  to: number;
}

export type ColorEditMode = "text" | "highlight";

@Injectable()
export class ColorPickerService {
  private storedSelection: ColorPickerSelection | null = null;

  // ============================================
  // State Signals (owned by this service)
  // ============================================

  /** Current edit mode: null when closed, 'text' or 'highlight' when open */
  readonly editMode = signal<ColorEditMode | null>(null);

  /** Reference to the element that triggered the menu (for anchoring) */
  readonly menuTrigger = signal<HTMLElement | null>(null);

  /** Whether the user is currently interacting with the picker UI (e.g. typing) */
  readonly isInteracting = signal<boolean>(false);

  // ============================================
  // Menu Lifecycle Methods
  // ============================================

  /**
   * Open the color picker menu in the specified mode.
   */
  open(mode: ColorEditMode, trigger?: HTMLElement): void {
    this.menuTrigger.set(trigger || null);
    this.editMode.set(mode);
  }

  /**
   * Close the color picker menu.
   */
  close(): void {
    this.editMode.set(null);
    this.isInteracting.set(false);
  }

  /**
   * Set interaction state (prevents premature closing when blurring editor)
   */
  setInteracting(value: boolean): void {
    this.isInteracting.set(value);
  }

  /**
   * Toggle color picker from UI (extracts trigger from event).
   */
  toggle(editor: Editor, mode: ColorEditMode, event?: Event): void {
    if (!editor) return;

    let trigger: HTMLElement | undefined;
    if (event && typeof event !== "string") {
      const target = event.target as HTMLElement;
      trigger = (event.currentTarget as HTMLElement) || target?.closest("button") || target;
    }

    this.open(mode, trigger);
  }

  // ============================================
  // Selection Capture (for reliable color application)
  // ============================================

  /**
   * Capture current editor selection.
   */
  captureSelection(editor: Editor): void {
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
  done(): void {
    this.storedSelection = null;
    this.menuTrigger.set(null);
  }

  // ============================================
  // Color Application Commands
  // ============================================

  /**
   * Apply text color to selection.
   */
  applyColor(editor: Editor, color: string, addToHistory = true, focus = true): void {
    if (!editor) return;

    const stored = this.storedSelection;
    let chain = editor.chain();
    if (focus) chain = chain.focus();

    if (stored && (editor.state.selection.empty || !editor.isFocused)) {
      chain = chain.setTextSelection(stored);
    } else if (editor.state.selection.empty && !stored) {
      chain = chain.extendMarkRange("textStyle");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chain as any).setColor(color);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (addToHistory === false) chain = (chain as any).setMeta("addToHistory", false);
    chain.run();
  }

  /**
   * Remove text color from selection.
   */
  unsetColor(editor: Editor, focus = true): void {
    if (!editor) return;

    const stored = this.storedSelection;
    let chain = editor.chain();
    if (focus) chain = chain.focus();

    if (stored) {
      chain = chain.setTextSelection(stored);
    } else if (editor.state.selection.empty) {
      chain = chain.extendMarkRange("textStyle");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chain as any).unsetColor();
    chain.run();
  }

  /**
   * Apply highlight color to selection.
   */
  applyHighlight(editor: Editor, color: string, addToHistory = true, focus = true): void {
    if (!editor) return;

    const stored = this.storedSelection;
    let chain = editor.chain();
    if (focus) chain = chain.focus();

    if (stored && (editor.state.selection.empty || !editor.isFocused)) {
      chain = chain.setTextSelection(stored);
    } else if (editor.state.selection.empty && !stored) {
      chain = chain.extendMarkRange("highlight");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chain as any).setHighlight({ color });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (addToHistory === false) chain = (chain as any).setMeta("addToHistory", false);
    chain.run();
  }

  /**
   * Remove highlight from selection.
   */
  unsetHighlight(editor: Editor, focus = true): void {
    if (!editor) return;

    const stored = this.storedSelection;
    let chain = editor.chain();
    if (focus) chain = chain.focus();

    if (stored) {
      chain = chain.setTextSelection(stored);
    } else if (editor.state.selection.empty) {
      chain = chain.extendMarkRange("highlight");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (chain as any).unsetHighlight();
    chain.run();
  }

  // ============================================
  // Color Utilities (Delegated to color.utils.ts)
  // ============================================

  normalizeColor(color: string | null | undefined): string {
    return normalizeColor(color) || "#000000";
  }

  getLuminance(color: string): number {
    return getLuminance(color);
  }

  getContrastColor(color: string): "black" | "white" {
    return getContrastColor(color);
  }
}
