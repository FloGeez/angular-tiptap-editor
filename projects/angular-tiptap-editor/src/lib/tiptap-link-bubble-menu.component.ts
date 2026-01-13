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
import { TiptapButtonComponent } from "./tiptap-button.component";
import { EditorCommandsService } from "./services/editor-commands.service";
import { TiptapI18nService } from "./services/i18n.service";
import { TiptapSeparatorComponent } from "./tiptap-separator.component";

@Component({
  selector: "tiptap-link-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TiptapButtonComponent, TiptapSeparatorComponent, FormsModule],
  template: `
    <div 
      #menuRef 
      class="bubble-menu"
      (mousedown)="$event.stopPropagation()"
      (click)="$event.stopPropagation()"
    >
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
            (keydown.escape)="onCancel($event)"
          />
        </div>

        <div class="action-buttons">
          <tiptap-button
            icon="check"
            [title]="common().apply"
            color="var(--ate-primary)"
            [disabled]="!editUrl().trim()"
            (onClick)="onApply($event)"
          ></tiptap-button>
          <tiptap-button
            icon="open_in_new"
            [title]="t().openLink"
            [disabled]="!currentUrl()"
            (onClick)="onOpenLink($event)"
          ></tiptap-button>
          <tiptap-separator />
          <tiptap-button
            icon="link_off"
            [title]="t().removeLink"
            [disabled]="!currentUrl()"
            (onClick)="onRemove($event)"
          ></tiptap-button>
        </div>
      </div>
    </div>
  `,
  styles: [`

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
  `]
})
export class TiptapLinkBubbleMenuComponent implements OnInit, OnDestroy {
  private readonly i18nService = inject(TiptapI18nService);
  private readonly editorCommands = inject(EditorCommandsService);

  readonly t = this.i18nService.bubbleMenu;
  readonly common = this.i18nService.common;
  readonly state = this.editorCommands.editorState;

  editor = input.required<Editor>();

  @ViewChild('linkInput') linkInput?: ElementRef<HTMLInputElement>;
  @ViewChild('menuRef', { static: false }) menuRef!: ElementRef<HTMLDivElement>;

  protected tippyInstance: TippyInstance | null = null;
  protected updateTimeout: any = null;

  editUrl = signal('');
  isInteracting = signal(false);

  protected isToolbarInteracting = signal(false);

  constructor() {
    // Reactive effect for URL sync and focus
    effect(() => {
      const state = this.state();
      const isEditing = this.editorCommands.linkEditMode();
      const isInteracting = this.isInteracting();
      const currentLinkHref = state.marks.linkHref || '';

      // SYNC LOGIC:
      // If we are NOT currently typing (interacting), 
      // always keep the input in sync with the current editor selection.
      if (!isInteracting) {
        this.editUrl.set(currentLinkHref);
      }

      // FOCUS LOGIC:
      // Removed automatic focus to keep editor selection visible.
      // The user can click the input manually if needed.
    });

    // Reactive effect for menu updates (re-positioning)
    effect(() => {
      this.state();
      this.editorCommands.linkEditMode();
      this.editorCommands.linkMenuTrigger();
      this.isInteracting();
      this.isToolbarInteracting();

      this.updateMenu();
    });
  }

  ngOnInit() {
    this.initTippy();
  }

  ngOnDestroy() {
    if (this.updateTimeout) clearTimeout(this.updateTimeout);
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
        // Only close edit mode if we're not just hiding because of toolbar interaction
        // OR if the tippy was explicitly closed by clicking away.
        this.editorCommands.closeLinkEdit();
        this.isInteracting.set(false);
      },
    });

    this.updateMenu();
  }

  updateMenu = () => {
    if (this.updateTimeout) clearTimeout(this.updateTimeout);
    this.updateTimeout = setTimeout(() => {
      if (this.shouldShow()) {
        this.showTippy();
      } else {
        this.hideTippy();
      }
    }, 10);
  }

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
    return this.state().marks.linkHref || '';
  }

  shouldShow(): boolean {
    const { selection, marks, isEditable, isFocused } = this.state();
    if (!isEditable) return false;

    // If toolbar is interacting, hide the menu (even if in edit mode)
    // UNLESS the menu was explicitly triggered BY the toolbar (trigger anchor exists)
    if (this.isToolbarInteracting() && !this.editorCommands.linkMenuTrigger()) {
      return false;
    }

    // Show if explicitly in edit mode (from toolbar/bubble menu) or interacting with input
    if (this.editorCommands.linkEditMode() || this.isInteracting()) {
      return true;
    }

    // If we're already visible and only focus is lost (e.g. clicking "Open"), 
    // keep it visible if we're technically still on a link and no other node is selected
    const isVisible = this.tippyInstance?.state?.isVisible;
    if (isVisible && !isFocused && marks.link && selection.empty) {
      return true;
    }

    // Show if cursor is on an existing link (read/preview mode)
    return isFocused && marks.link && selection.empty;
  }

  setToolbarInteracting(isInteracting: boolean) {
    this.isToolbarInteracting.set(isInteracting);
  }

  getSelectionRect(): DOMRect {
    const trigger = this.editorCommands.linkMenuTrigger();
    const ed = this.editor();
    if (!ed) return new DOMRect(0, 0, 0, 0);

    // If triggered from the main toolbar, anchor to the button for stability
    if (trigger && trigger.closest('.tiptap-toolbar')) {
      const rect = trigger.getBoundingClientRect();
      if (rect.width > 0) return rect;
    }

    // Otherwise, anchor to the text selection to "take the relay"
    // from the main bubble menu (which we might be hiding).
    const { from, to, empty } = ed.state.selection;
    try {
      const { node } = ed.view.domAtPos(from);
      const element = node instanceof Element ? node : node.parentElement;
      const linkElement = element?.closest("a");
      if (linkElement) return linkElement.getBoundingClientRect();
    } catch (e) { }

    // Use native selection for multi-line accuracy
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return rect;
    }

    // Final fallback to coordinates at cursor
    const { top, bottom, left, right } = ed.view.coordsAtPos(from);
    return new DOMRect(left, top, right - left, bottom - top);
  }

  onFocus() {
    this.isInteracting.set(true);
  }

  onBlur() {
    setTimeout(() => {
      this.isInteracting.set(false);
      this.updateMenu();
    }, 150);
  }

  onOpenLink(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const url = this.currentUrl();
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  onRemove(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.editorCommands.execute(this.editor(), 'unsetLink');
  }

  onApply(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    const url = this.editUrl().trim();
    if (url) {
      this.editorCommands.execute(this.editor(), 'toggleLink', url);
      this.editUrl.set('');
      this.isInteracting.set(false);
      this.hideTippy();
    } else {
      this.onRemove(event);
    }
  }

  onCancel(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.editorCommands.closeLinkEdit();
    this.isInteracting.set(false);
    this.hideTippy();
  }
}
