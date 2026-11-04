import { Injectable, signal } from "@angular/core";
import type { ChainedCommands, Editor } from "@tiptap/core";
import { AteFontFamily } from "../models/ate-font.model";
import { ATE_DEFAULT_FONT_FAMILIES, ATE_DEFAULT_FONT_SIZES } from "../config/ate-editor.config";
import { clampFontSizePx, stepFontSizePx } from "../utils/ate-font.utils";

export type AteFontEditMode = "family" | "size";

interface AteFontSelection {
  from: number;
  to: number;
}

/**
 * State and commands of the font family and font size menus, shared by their triggers
 * (toolbar, bubble menu) and the dropdown that lists the choices.
 *
 * The commands never take the focus: the triggers keep it in the editor, and the dropdown keeps it
 * for its keyboard navigation until it closes.
 */
@Injectable()
export class AteFontService {
  private storedSelection: AteFontSelection | null = null;

  /** Whether the last change was live (slider, drag, held button): the next live one joins its undo step */
  private liveChange = false;

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
  open(mode: AteFontEditMode, trigger: HTMLElement | null = null): void {
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
    this.endLiveChange();
  }

  /** Applies a `font-family` to the selection, or removes it with null (the editor's default font) */
  applyFontFamily(editor: Editor, fontFamily: string | null): void {
    this.run(editor, false, chain =>
      fontFamily ? chain.setFontFamily(fontFamily) : chain.unsetFontFamily()
    );
  }

  /** Applies a `font-size` to the selection, or removes it with null (the editor's default size) */
  applyFontSize(editor: Editor, fontSize: string | null): void {
    this.run(editor, false, chain =>
      fontSize ? chain.setFontSize(fontSize) : chain.unsetFontSize()
    );
  }

  /**
   * Makes the selection one pixel larger or smaller, from the size it is displayed with
   * (a 14.67px size pasted from Word goes to 15px or 14px)
   */
  stepFontSize(editor: Editor, currentPx: number, delta: 1 | -1, live = false): void {
    if (Number.isFinite(currentPx)) {
      this.setFontSizePx(editor, stepFontSizePx(currentPx, delta), live);
    }
  }

  /**
   * Sets the selection to a size in pixels, within `ATE_FONT_SIZE_RANGE`.
   * A `live` change (slider, drag, held button) joins the undo step of the live change before it,
   * so a single undo brings back the size from before the gesture: `endLiveChange()` ends it.
   */
  setFontSizePx(editor: Editor, px: number, live = false): void {
    this.run(editor, live, chain => chain.setFontSize(`${clampFontSizePx(px)}px`));
  }

  /** Ends a gesture: the next change starts a new undo step */
  endLiveChange(): void {
    this.liveChange = false;
  }

  private run(editor: Editor, live: boolean, command: (chain: ChainedCommands) => ChainedCommands) {
    let chain = editor.chain();
    const stored = this.storedSelection;
    const { from, to } = editor.state.selection;
    // Restore the selection captured when the dropdown opened only if it moved: setting it again
    // would drop the marks waiting for the text typed next (bold, a color, a font)
    if (stored && (stored.from !== from || stored.to !== to)) {
      chain = chain.setTextSelection(stored);
    }
    chain = command(chain);
    if (live && this.liveChange) {
      // A mark change does not touch the text, so the history would start a new undo step for each
      // one: marked as appended, it joins the step of the change before it
      chain = chain.setMeta("appendedTransaction", editor.state.tr);
    }
    chain.run();
    this.liveChange = live;
  }
}
