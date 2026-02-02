import {
  Component,
  ChangeDetectionStrategy,
  viewChild,
  ElementRef,
  signal,
  effect,
  inject,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { AteButtonComponent } from "../../ui/ate-button.component";
import { AteLinkService } from "../../../services/ate-link.service";
import { AteSeparatorComponent } from "../../ui/ate-separator.component";
import { AteBaseSubBubbleMenu } from "../base/ate-base-sub-bubble-menu";

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
export class AteLinkBubbleMenuComponent extends AteBaseSubBubbleMenu {
  private readonly linkSvc = inject(AteLinkService);

  readonly t = this.i18nService.bubbleMenu;
  readonly common = this.i18nService.common;

  linkInput = viewChild<ElementRef<HTMLInputElement>>("linkInput");

  editUrl = signal("");

  constructor() {
    super();

    // Reactive effect for URL sync
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
  }

  protected override onStateChange() {
    this.linkSvc.editMode();
    this.linkSvc.menuTrigger();
    this.linkSvc.isInteracting();
  }

  override shouldShow(): boolean {
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

  override getSelectionRect(): DOMRect {
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
      const linkElement = (element as Element)?.closest("a");
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

  protected override onTippyHide() {
    // Clear trigger only AFTER the menu is hidden to maintain anchor stability during animation
    this.linkSvc.done();
    this.linkSvc.close();
  }

  currentUrl() {
    return this.state().marks.linkHref || "";
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
