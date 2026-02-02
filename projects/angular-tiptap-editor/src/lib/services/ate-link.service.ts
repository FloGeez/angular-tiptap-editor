import { Injectable, signal } from "@angular/core";
import type { Editor } from "@tiptap/core";

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
   */
  setLink(editor: Editor, url: string): void {
    if (!editor) {
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    this.close();
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
