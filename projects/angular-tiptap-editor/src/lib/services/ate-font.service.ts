import { Injectable, signal } from "@angular/core";
import type { Editor } from "@tiptap/core";
import { AteFontFamily } from "../models/ate-font.model";
import { ATE_DEFAULT_FONT_FAMILIES, ATE_DEFAULT_FONT_SIZES } from "../config/ate-editor.config";
import { ATE_FONT_SIZE_RANGE } from "../utils/ate-font.utils";

export type AteFontEditMode = "family" | "size";

interface AteFontSelection {
  from: number;
  to: number;
}

/**
 * State and commands of the font family and font size menus, shared by their triggers
 * (toolbar, bubble menu) and the dropdown that lists the choices.
 */
@Injectable()
export class AteFontService {
  private storedSelection: AteFontSelection | null = null;

  /** Fonts and sizes offered by the menus, set by the editor from its `fonts` config */
  readonly fonts = signal<{ families: AteFontFamily[]; sizes: string[] }>({
    families: ATE_DEFAULT_FONT_FAMILIES,
    sizes: ATE_DEFAULT_FONT_SIZES,
  });

  /** Menu currently open, null when closed */
  readonly editMode = signal<AteFontEditMode | null>(null);

  /** Element that opened the menu, to anchor the dropdown to it */
  readonly menuTrigger = signal<HTMLElement | null>(null);

  /**
   * Opens the menu of `mode`, anchored to the trigger, or to the selected text without one.
   * As for the color and link menus, a click outside (the trigger included) hides it first.
   */
  toggle(mode: AteFontEditMode, trigger: HTMLElement | null = null): void {
    this.menuTrigger.set(trigger);
    this.editMode.set(mode);
  }

  close(): void {
    this.editMode.set(null);
  }

  /** Remembers the selection when the dropdown opens: typing a size moves the focus out of the editor */
  captureSelection(editor: Editor): void {
    const { from, to } = editor.state.selection;
    this.storedSelection = { from, to };
  }

  /** Forgets the selection and the trigger once the dropdown is hidden */
  done(): void {
    this.storedSelection = null;
    this.menuTrigger.set(null);
  }

  /** Applies a `font-family` to the selection, or removes it with null (the editor's default font) */
  applyFontFamily(editor: Editor, fontFamily: string | null): void {
    const chain = this.chainOnSelection(editor);
    (fontFamily ? chain.setFontFamily(fontFamily) : chain.unsetFontFamily()).run();
  }

  /** Applies a `font-size` to the selection, or removes it with null (the editor's default size) */
  applyFontSize(editor: Editor, fontSize: string | null): void {
    const chain = this.chainOnSelection(editor);
    (fontSize ? chain.setFontSize(fontSize) : chain.unsetFontSize()).run();
  }

  /**
   * Makes the selection one pixel larger or smaller, from the size it is displayed with
   * (a 14.67px size pasted from Word goes to 15px or 14px)
   */
  stepFontSize(editor: Editor, currentPx: number, delta: 1 | -1): void {
    if (!Number.isFinite(currentPx)) {
      return;
    }
    this.setFontSizePx(editor, delta > 0 ? Math.floor(currentPx) + 1 : Math.ceil(currentPx) - 1);
  }

  /** Sets the selection to a size in pixels, within `ATE_FONT_SIZE_RANGE` */
  setFontSizePx(editor: Editor, px: number): void {
    const size = Math.min(Math.max(px, ATE_FONT_SIZE_RANGE.min), ATE_FONT_SIZE_RANGE.max);
    editor.chain().focus().setFontSize(`${size}px`).run();
  }

  /**
   * Live size change from the dropdown (slider, size field): applies to the selection captured
   * when the dropdown opened, without taking the focus back from the control being used
   */
  previewFontSizePx(editor: Editor, px: number): void {
    const size = Math.min(Math.max(px, ATE_FONT_SIZE_RANGE.min), ATE_FONT_SIZE_RANGE.max);
    this.chainOnSelection(editor, false).setFontSize(`${size}px`).run();
  }

  private chainOnSelection(editor: Editor, focus = true) {
    const chain = focus ? editor.chain().focus() : editor.chain();
    const stored = this.storedSelection;
    // With an empty selection, the font applies to the text typed next
    return stored ? chain.setTextSelection(stored) : chain;
  }
}
