import {
  Directive,
  input,
  viewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  inject,
  effect,
} from "@angular/core";
import tippy, { Instance as TippyInstance, sticky } from "tippy.js";
import { Editor } from "@tiptap/core";
import { AteEditorCommandsService } from "../../../services/ate-editor-commands.service";
import { AteI18nService } from "../../../services/ate-i18n.service";

/**
 * Base abstract class for all Bubble Menus (Text, Image, Table, Cell).
 * Handles common logic for Tippy.js initialization, positioning, and visibility.
 */
@Directive()
export abstract class AteBaseBubbleMenu implements OnInit, OnDestroy {
  protected readonly i18nService = inject(AteI18nService);
  protected readonly editorCommands = inject(AteEditorCommandsService);

  // Core Inputs
  editor = input.required<Editor>();

  // Required viewChild for the menu container
  menuRef = viewChild.required<ElementRef<HTMLDivElement>>("menuRef");

  // Internal State
  protected tippyInstance: TippyInstance | null = null;
  protected updateTimeout: number | null = null;

  // Toolbar interaction state (from centralized service)
  protected readonly isToolbarInteracting = this.editorCommands.isToolbarInteracting;

  // Reactive state alias for templates
  readonly state = this.editorCommands.editorState;

  constructor() {
    // Effect to reactively update the menu when editor state
    // or toolbar interaction changes.
    effect(() => {
      this.state();
      this.isToolbarInteracting();
      // Also react to link/color edit modes to hide when sub-menus activate
      this.editorCommands.linkEditMode();
      this.editorCommands.colorEditMode();

      this.updateMenu();
    });
  }

  ngOnInit() {
    this.initTippy();
  }

  ngOnDestroy() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    if (this.tippyInstance) {
      this.tippyInstance.destroy();
      this.tippyInstance = null;
    }
  }

  /**
   * Initializes the Tippy instance.
   * Can be overridden for specific Tippy configurations.
   */
  protected initTippy() {
    if (!this.menuRef()?.nativeElement) {
      // Re-try if the view child is not yet available
      setTimeout(() => this.initTippy(), 50);
      return;
    }

    const ed = this.editor();
    if (this.tippyInstance) {
      this.tippyInstance.destroy();
    }

    this.tippyInstance = tippy(document.body, {
      content: this.menuRef().nativeElement,
      trigger: "manual",
      placement: "top-start",
      appendTo: () => (ed ? ed.options.element : document.body),
      interactive: true,
      hideOnClick: false,
      arrow: false,
      offset: [0, 8],
      plugins: [sticky],
      sticky: false,
      getReferenceClientRect: () => this.getSelectionRect(),
      popperOptions: {
        modifiers: [
          {
            name: "preventOverflow",
            options: {
              boundary: this.editor().options.element,
              padding: 8,
            },
          },
          {
            name: "flip",
            options: {
              fallbackPlacements: ["bottom-start", "top-end", "bottom-end"],
            },
          },
        ],
      },
      onShow: instance => this.onTippyShow(instance),
      onHide: instance => this.onTippyHide(instance),
    });

    this.updateMenu();
  }

  /**
   * Core logic to decide whether to show or hide the menu.
   */
  updateMenu = () => {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = window.setTimeout(() => {
      const ed = this.editor();
      if (!ed) {
        return;
      }

      // Hide when interacting with the main toolbar
      if (this.isToolbarInteracting()) {
        this.hideTippy();
        return;
      }

      if (this.shouldShow()) {
        this.showTippy();
      } else {
        this.hideTippy();
      }
    }, 10);
  };

  /**
   * Helper to show the Tippy instance with updated positioning.
   */
  showTippy() {
    if (!this.tippyInstance) {
      return;
    }

    // Update position before showing
    this.tippyInstance.setProps({
      getReferenceClientRect: () => this.getSelectionRect(),
      sticky: "reference",
    });
    this.tippyInstance.show();
  }

  /**
   * Helper to hide the Tippy instance.
   */
  hideTippy() {
    if (this.tippyInstance) {
      this.tippyInstance.setProps({ sticky: false });
      this.tippyInstance.hide();
    }
  }

  /**
   * Common command handler for buttons in the menu.
   */
  onCommand(command: string, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    const ed = this.editor();
    if (ed) {
      this.executeCommand(ed, command);
      this.updateMenu();
    }
  }

  /**
   * Shared helper to get the bounding rect of the current selection.
   * Uses a combination of native selection and ProseMirror coordinates.
   */
  protected getRectForSelection(ed: Editor): DOMRect {
    if (!ed) {
      return new DOMRect(0, 0, 0, 0);
    }

    const { from, to, empty } = ed.state.selection;
    if (empty) {
      return new DOMRect(-9999, -9999, 0, 0);
    }

    // 1. Try native selection for multi-line accuracy
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Ensure the rect is valid and belongs to the editor
      if (rect.width > 0 && rect.height > 0) {
        return rect;
      }
    }

    // 2. Fallback to Tiptap coordinates for precision (single line / edge cases)
    const start = ed.view.coordsAtPos(from);
    const end = ed.view.coordsAtPos(to);

    const top = Math.min(start.top, end.top);
    const bottom = Math.max(start.bottom, end.bottom);
    const left = Math.min(start.left, end.left);
    const right = Math.max(start.right, end.right);

    return new DOMRect(left, top, right - left, bottom - top);
  }

  // --- Abstract methods to be implemented by sub-components ---

  /**
   * Returns the Rect representing the target for positioning the menu.
   */
  abstract getSelectionRect(): DOMRect;

  /**
   * Returns whether the menu should be displayed based on current state.
   */
  abstract shouldShow(): boolean;

  /**
   * Executes the given command on the editor.
   */
  protected abstract executeCommand(editor: Editor, command: string, ...args: unknown[]): void;

  /**
   * Optional hook called when Tippy is about to be shown.
   */
  protected onTippyShow(_instance: TippyInstance) {
    /* empty */
  }

  /**
   * Optional hook called when Tippy is about to be hidden.
   */
  protected onTippyHide(_instance: TippyInstance) {
    /* empty */
  }
}
