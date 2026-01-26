import {
  Component,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
  signal,
  effect,
  inject,
  OnInit,
  OnDestroy,
  input,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { type Editor } from "@tiptap/core";
import tippy, { Instance as TippyInstance, sticky } from "tippy.js";
import { AteButtonComponent } from "../../ui/ate-button.component";
import { AteEditorCommandsService } from "../../../services/ate-editor-commands.service";
import { AteI18nService } from "../../../services/ate-i18n.service";
import { AteLinkService } from "../../../services/ate-link.service";
import { AteSeparatorComponent } from "../../ui/ate-separator.component";

@Component({
  selector: "ate-link-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AteButtonComponent, AteSeparatorComponent, FormsModule],
  template: `
    <div
      #menuRef
      class="bubble-menu"
      (mousedown)="onMouseDown($event)"
      (click)="$event.stopPropagation()"
      (keydown)="$event.stopPropagation()"
      (keydown.escape)="onCancel($event)"
      tabindex="-1"
      role="dialog">
      <div class="link-input-row">
        <div class="url-input-container">
          <span class="material-symbols-outlined icon-link">link</span>
          <input
            #linkInput
            type="text"
            class="url-field"
            [placeholder]="t().linkUrl"
            [ngModel]="editUrl()"
            (ngModelChange)="editUrl.set($event)"
            (focus)="onFocus()"
            (blur)="onBlur()"
            (keydown.enter)="onApply($event)"
            (keydown.escape)="onCancel($event)" />
        </div>

        <div class="action-buttons">
          <ate-button
            icon="check"
            [title]="common().apply"
            color="var(--ate-primary)"
            [disabled]="!editUrl().trim()"
            (buttonClick)="onApply($event)"></ate-button>
          <ate-button
            icon="open_in_new"
            [title]="t().openLink"
            [disabled]="!currentUrl()"
            (buttonClick)="onOpenLink($event)"></ate-button>
          <ate-separator />
          <ate-button
            icon="link_off"
            [title]="t().removeLink"
            variant="danger"
            [disabled]="!currentUrl()"
            (buttonClick)="onRemove($event)"></ate-button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .link-input-row {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .url-input-container {
        flex: 1;
        display: flex;
        align-items: center;
        background: var(--ate-surface-secondary, #f8fafc);
        border: 1px solid var(--ate-border, #e2e8f0);
        border-radius: 8px;
        padding: 0 10px;
        height: 32px;
        transition: all 150ms ease;
      }

      .url-input-container:focus-within {
        border-color: var(--ate-primary, #3b82f6);
        background: var(--ate-surface, #ffffff);
        box-shadow: 0 0 0 2px var(--ate-primary-light, rgba(59, 130, 246, 0.1));
      }

      .icon-link {
        font-size: 16px;
        color: var(--ate-text-muted, #94a3b8);
        margin-right: 6px;
      }

      .url-field {
        background: transparent;
        border: none;
        outline: none;
        color: var(--ate-text, #1e293b);
        font-size: 13px;
        width: 100%;
        font-family: inherit;
      }

      .action-buttons {
        display: flex;
        align-items: center;
        gap: 2px;
      }
    `,
  ],
})
export class AteLinkBubbleMenuComponent implements OnInit, OnDestroy {
  private readonly i18nService = inject(AteI18nService);
  private readonly editorCommands = inject(AteEditorCommandsService);
  private readonly linkSvc = inject(AteLinkService);

  readonly t = this.i18nService.bubbleMenu;
  readonly common = this.i18nService.common;
  readonly state = this.editorCommands.editorState;

  editor = input.required<Editor>();

  @ViewChild("linkInput") linkInput?: ElementRef<HTMLInputElement>;
  @ViewChild("menuRef", { static: false }) menuRef!: ElementRef<HTMLDivElement>;

  protected tippyInstance: TippyInstance | null = null;
  protected updateTimeout: number | null = null;

  editUrl = signal("");

  constructor() {
    // Reactive effect for URL sync and focus
    effect(() => {
      const state = this.state();
      const isInteracting = this.linkSvc.isInteracting();
      const currentLinkHref = state.marks.linkHref || "";

      // SYNC LOGIC:
      // If we are NOT currently typing (interacting),
      // always keep the input in sync with the current editor selection.
      if (!isInteracting) {
        this.editUrl.set(currentLinkHref);
      }
    });

    // Reactive effect for menu updates (re-positioning)
    effect(() => {
      this.state();
      this.linkSvc.editMode();
      this.linkSvc.menuTrigger();
      this.linkSvc.isInteracting();

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

  private initTippy() {
    if (!this.menuRef?.nativeElement) {
      setTimeout(() => this.initTippy(), 50);
      return;
    }

    const ed = this.editor();
    this.tippyInstance = tippy(document.body, {
      content: this.menuRef.nativeElement,
      trigger: "manual",
      placement: "bottom-start",
      appendTo: () => ed.options.element,
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
            options: { boundary: ed.options.element, padding: 8 },
          },
          {
            name: "flip",
            options: { fallbackPlacements: ["top-start", "bottom-end", "top-end"] },
          },
        ],
      },
      onShow: () => {
        // We no longer auto-focus the input here to keep the editor selection visible.
        // The user can click the input if they want to type, but for swatches/preview,
        // staying in the editor is better for UX.
      },
      onHide: () => {
        // Clear trigger only AFTER the menu is hidden to maintain anchor stability during animation
        this.linkSvc.done();
        this.linkSvc.close();
      },
    });

    this.updateMenu();
  }

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

  private showTippy() {
    if (this.tippyInstance) {
      this.tippyInstance.setProps({ getReferenceClientRect: () => this.getSelectionRect() });
      this.tippyInstance.show();
    }
  }

  private hideTippy() {
    this.tippyInstance?.hide();
  }

  private focusInput() {
    setTimeout(() => {
      this.linkInput?.nativeElement?.focus();
      this.linkInput?.nativeElement?.select();
    }, 50);
  }

  currentUrl() {
    return this.state().marks.linkHref || "";
  }

  shouldShow(): boolean {
    const { selection, marks, isEditable, isFocused } = this.state();
    if (!isEditable) {
      return false;
    }

    // Show if explicitly in edit mode (from toolbar/bubble menu) or interacting with input
    if (this.linkSvc.editMode() || this.linkSvc.isInteracting()) {
      return true;
    }

    // Show if cursor is on an existing link (read/preview mode)
    return isFocused && marks.link && selection.empty;
  }

  getSelectionRect(): DOMRect {
    const trigger = this.linkSvc.menuTrigger();
    const ed = this.editor();
    if (!ed) {
      return new DOMRect(0, 0, 0, 0);
    }

    // 1. If we have a stable trigger from service (toolbar or parent menu), anchor to it
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      // Only use if it's still visible/in DOM (width > 0)
      if (rect.width > 0) {
        return rect;
      }
    }

    // 2. Otherwise (bubble menu / relay), anchor to text selection
    const { from } = ed.state.selection;

    try {
      const { node } = ed.view.domAtPos(from);
      const element = node instanceof Element ? node : node.parentElement;
      const linkElement = element?.closest("a");
      if (linkElement) {
        return linkElement.getBoundingClientRect();
      }
    } catch (_e) {
      /* ignore */
    }

    // Use native selection for multi-line accuracy
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return rect;
      }
    }

    // Final fallback to coordinates at cursor
    const { top, bottom, left, right } = ed.view.coordsAtPos(from);
    return new DOMRect(left, top, right - left, bottom - top);
  }

  onMouseDown(event: MouseEvent) {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    if (target.tagName !== "INPUT") {
      event.preventDefault();
    }
  }

  onFocus() {
    this.linkSvc.setInteracting(true);
  }

  onBlur() {
    setTimeout(() => {
      this.linkSvc.setInteracting(false);
      this.updateMenu();
    }, 150);
  }

  onOpenLink(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const url = this.currentUrl();
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  onRemove(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.linkSvc.unsetLink(this.editor());
  }

  onApply(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const url = this.editUrl().trim();
    if (url) {
      this.linkSvc.setLink(this.editor(), url);
      this.editUrl.set("");
      this.linkSvc.setInteracting(false);
      this.hideTippy();
    } else {
      this.onRemove(event);
    }
  }

  onCancel(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.linkSvc.close();
    this.hideTippy();
  }
}
