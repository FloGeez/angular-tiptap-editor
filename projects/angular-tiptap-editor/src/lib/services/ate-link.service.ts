import { Injectable, signal } from "@angular/core";
import { getMarkRange, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode, Schema } from "@tiptap/pm/model";
import { TextSelection, type Selection } from "@tiptap/pm/state";

interface AteTextRange {
  from: number;
  to: number;
}

@Injectable()
export class AteLinkService {
  // ============================================
  // State Signals (owned by this service)
  // ============================================

  /** Whether link edit mode is active */
  readonly editMode = signal<boolean>(false);

  /** Reference to the element that triggered the menu (for anchoring) */
  readonly menuTrigger = signal<HTMLElement | null>(null);

  /** Whether the user is currently interacting with the link UI (input focus) */
  readonly isInteracting = signal<boolean>(false);

  // ============================================
  // Menu Lifecycle Methods
  // ============================================

  /**
   * Open the link edit menu.
   */
  open(trigger?: HTMLElement): void {
    this.menuTrigger.set(trigger || null);
    this.editMode.set(true);
  }

  /**
   * Close the link edit menu.
   */
  close(): void {
    this.editMode.set(false);
    this.isInteracting.set(false);
  }

  /**
   * Final cleanup (called after UI is hidden)
   */
  done(): void {
    this.menuTrigger.set(null);
  }

  /**
   * Set interaction state
   */
  setInteracting(value: boolean): void {
    this.isInteracting.set(value);
  }

  /**
   * Toggle link mode from UI.
   * If a URL string is provided, applies the link and closes.
   * If an Event is provided, extracts the trigger for anchoring.
   */
  toggle(editor: Editor, urlOrEvent?: string | Event): void {
    if (!editor) {
      return;
    }

    // If a string URL is provided, set the link and close
    if (urlOrEvent && typeof urlOrEvent === "string") {
      this.setLink(editor, urlOrEvent);
      return;
    }

    // If an Event is provided, extract the trigger element
    let trigger: HTMLElement | undefined;
    if (urlOrEvent && typeof urlOrEvent !== "string") {
      const target = (urlOrEvent as Event).target as HTMLElement;
      trigger =
        ((urlOrEvent as Event).currentTarget as HTMLElement) ||
        (target as Element)?.closest("button") ||
        target;
    }

    // Open the edit menu
    this.open(trigger);
  }

  // ============================================
  // Link Commands
  // ============================================

  /**
   * Apply a link to the current selection.
   *
   * When `text` is given and differs from the current text, the linked text is replaced by it in
   * the same transaction (one undo step). The new text keeps the marks of the first replaced character.
   */
  setLink(editor: Editor, url: string, text?: string): void {
    if (!editor) {
      return;
    }
    const newText = text?.trim();
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .command(({ tr, state, dispatch }) => {
        const range = newText ? this.textRange(tr.selection, state.schema) : null;
        if (!dispatch || !newText || !range || !this.isSingleTextblock(tr.doc, range)) {
          return true;
        }
        if (tr.doc.textBetween(range.from, range.to) === newText) {
          return true;
        }
        const marks = tr.doc.resolve(range.from).nodeAfter?.marks ?? [];
        tr.replaceWith(range.from, range.to, state.schema.text(newText, marks));
        tr.setSelection(TextSelection.create(tr.doc, range.from, range.from + newText.length));
        return true;
      })
      .run();
    this.close();
  }

  /**
   * Text the link editor works on: the whole link when the selection is inside one, otherwise the
   * selected text. Empty when there is neither.
   */
  getText(editor: Editor): string {
    const { doc, selection, schema } = editor.state;
    const range = this.textRange(selection, schema);
    return range ? doc.textBetween(range.from, range.to) : "";
  }

  /** Whether the displayed text can be edited: a link or a selection within a single text block */
  canEditText(editor: Editor): boolean {
    const { doc, selection, schema } = editor.state;
    const range = this.textRange(selection, schema);
    return !!range && this.isSingleTextblock(doc, range);
  }

  private textRange(selection: Selection, schema: Schema): AteTextRange | null {
    const { $from, from, to } = selection;
    const linkType = schema.marks["link"];
    const linkRange = linkType ? getMarkRange($from, linkType) : undefined;
    if (linkRange && linkRange.from <= from && linkRange.to >= to) {
      return linkRange;
    }
    return selection.empty ? null : { from, to };
  }

  private isSingleTextblock(doc: ProseMirrorNode, { from, to }: AteTextRange): boolean {
    return doc.resolve(from).sameParent(doc.resolve(to)) && doc.resolve(from).parent.isTextblock;
  }

  /**
   * Remove link from the current selection.
   */
  unsetLink(editor: Editor): void {
    if (!editor) {
      return;
    }
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    this.close();
  }
}
