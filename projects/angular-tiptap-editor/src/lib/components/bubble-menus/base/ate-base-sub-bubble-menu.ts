import {
  Directive,
  input,
  viewChild,
  ElementRef,
  OnDestroy,
  inject,
  effect,
  AfterViewInit,
} from "@angular/core";
import tippy, { Instance as TippyInstance, sticky } from "tippy.js";
import { Editor } from "@tiptap/core";
import { AteEditorCommandsService } from "../../../services/ate-editor-commands.service";
import { AteI18nService } from "../../../services/ate-i18n.service";

/**
 * Base abstract class for Sub-Bubble Menus (Link, Color).
 * These menus are "sub-menus" of the main bubble menu or triggered/anchored by specific UI elements.
 */
@Directive()
export abstract class AteBaseSubBubbleMenu implements AfterViewInit, OnDestroy {
  protected readonly i18nService = inject(AteI18nService);
  protected readonly editorCommands = inject(AteEditorCommandsService);

  // Core Inputs
  editor = input.required<Editor>();

  // Required viewChild for the menu container
  menuRef = viewChild.required<ElementRef<HTMLDivElement>>("menuRef");

  // Internal State
  protected tippyInstance: TippyInstance | null = null;
  protected updateTimeout: number | null = null;

  // Reactive state alias for templates
  readonly state = this.editorCommands.editorState;

  constructor() {
    // Reactive effect for menu updates (re-positioning)
    effect(() => {
      // Monitor editor state and specific sub-menu states
      this.state();
      this.onStateChange();

      this.updateMenu();
    });
  }

  ngAfterViewInit() {
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
   * Initializes the Tippy instance with sub-menu defaults.
   */
  protected initTippy() {
    const nativeElement = this.menuRef().nativeElement;
    if (!nativeElement) {return;}

    const ed = this.editor();
    if (this.tippyInstance) {
      this.tippyInstance.destroy();
    }

    this.tippyInstance = tippy(document.body, {
      content: nativeElement,
      trigger: "manual",
      placement: "bottom-start",
      theme: "ate-bubble-menu",
      appendTo: () => (ed?.options?.element as HTMLElement) || document.body,
      interactive: true,
      arrow: false,
      offset: [0, 8],
      hideOnClick: true,
      plugins: [sticky],
      sticky: false,
      getReferenceClientRect: () => this.getSelectionRect(),
      popperOptions: {
        modifiers: [
          {
            name: "preventOverflow",
            options: {
              boundary: (ed?.options?.element as HTMLElement) || document.body,
              padding: 8,
            },
          },
          {
            name: "flip",
            options: { fallbackPlacements: ["top-start", "bottom-end", "top-end"] },
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
    this.updateTimeout = setTimeout(() => {
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
  protected showTippy() {
    if (this.tippyInstance) {
      this.tippyInstance.setProps({ getReferenceClientRect: () => this.getSelectionRect() });
      this.tippyInstance.show();
    }
  }

  /**
   * Helper to hide the Tippy instance.
   */
  protected hideTippy() {
    this.tippyInstance?.hide();
  }

  // --- Abstract methods & Hooks ---

  /**
   * Returns the Rect representing the target for positioning the menu.
   */
  abstract getSelectionRect(): DOMRect;

  /**
   * Returns whether the menu should be displayed based on current state.
   */
  abstract shouldShow(): boolean;

  /**
   * Hook to add reactive dependencies to the update cycle.
   */
  protected abstract onStateChange(): void;

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
