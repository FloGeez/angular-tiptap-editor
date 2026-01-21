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
  computed,
  viewChild,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { type Editor } from "@tiptap/core";
import tippy, { Instance as TippyInstance, sticky } from "tippy.js";
import { EditorCommandsService } from "./services/editor-commands.service";
import { TiptapI18nService } from "./services/i18n.service";
import { ColorPickerService } from "./services/color-picker.service";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapSeparatorComponent } from "./tiptap-separator.component";

const PRESET_COLORS = [
  "#000000",
  "#666666",
  "#CCCCCC",
  "#FFFFFF",
  "#F44336",
  "#FF9800",
  "#FFEB3B",
  "#4CAF50",
  "#00BCD4",
  "#2196F3",
  "#9C27B0",
  "#E91E63",
];

@Component({
  selector: "ate-color-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, TiptapButtonComponent, TiptapSeparatorComponent],
  template: `
    <div
      #menuRef
      class="bubble-menu color-bubble-menu"
      (mousedown)="onMouseDown($event)"
      (click)="$event.stopPropagation()"
      (keydown)="$event.stopPropagation()"
      (keydown.escape)="onApply($event)"
      tabindex="-1"
      role="dialog">
      <div class="color-picker-container">
        <div class="dropdown-row presets">
          <div class="color-grid">
            @for (color of presets; track color) {
              <ate-button
                class="color-swatch-btn"
                size="small"
                [title]="color"
                [active]="isColorActive(color)"
                [backgroundColor]="color"
                (buttonClick)="applyColor(color, true, $event)"></ate-button>
            }
          </div>
        </div>

        <div class="dropdown-row controls">
          <div class="hex-input-wrapper">
            <span class="hex-hash">#</span>
            <input
              #hexInput
              type="text"
              class="hex-input"
              [value]="hexValue()"
              [attr.aria-label]="t().customColor"
              (input)="onHexInput($event)"
              (change)="onHexChange($event)"
              (keydown.enter)="onApply($event)"
              (focus)="onFocus()"
              (blur)="onBlur()"
              maxlength="6"
              placeholder="000000" />
          </div>

          <div class="native-trigger-wrapper">
            <ate-button
              class="btn-native-picker-trigger"
              icon="colorize"
              [title]="t().customColor"
              [backgroundColor]="currentColor()"
              (buttonClick)="triggerNativePicker($event)"></ate-button>
            <input
              #colorInput
              type="color"
              class="hidden-native-input"
              [value]="currentColor()"
              [attr.aria-label]="t().customColor"
              (input)="onNativeInput($event)"
              (change)="onNativeChange($event)"
              (focus)="onFocus()"
              (blur)="onBlur()" />
          </div>

          <ate-button
            icon="check"
            [title]="common().apply"
            color="var(--ate-primary)"
            (buttonClick)="onApply($event)"></ate-button>

          <ate-separator />

          <ate-button
            icon="format_color_reset"
            [title]="t().clear"
            variant="danger"
            (buttonClick)="onClearColor($event)"></ate-button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .color-picker-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .dropdown-row {
        display: flex;
        align-items: center;
        width: 100%;
      }

      .dropdown-row.presets {
        justify-content: center;
      }

      .dropdown-row.controls {
        gap: 8px;
        justify-content: space-between;
        padding-top: 4px;
        border-top: 1px solid var(--ate-border, #e2e8f0);
      }

      .color-grid {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        gap: 4px;
        width: 100%;
      }

      :host ::ng-deep .color-swatch-btn .ate-button {
        width: 100%;
        aspect-ratio: 1;
        height: auto;
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        padding: 0;
      }

      :host ::ng-deep .color-swatch-btn .ate-button.is-active {
        border-color: var(--ate-primary, #3b82f6);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
      }

      :host ::ng-deep .btn-native-picker-trigger .ate-button {
        color: #ffffff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }

      .divider-v {
        width: 1px;
        height: 24px;
        background: var(--ate-border, #e2e8f0);
      }

      .hex-input-wrapper {
        flex: 1;
        display: flex;
        align-items: center;
        background: var(--ate-surface-secondary, #f8fafc);
        border: 1px solid var(--ate-border, #e2e8f0);
        border-radius: 8px;
        padding: 0 10px;
        height: 32px;
        transition: border-color 150ms ease;
      }

      .hex-input-wrapper:focus-within {
        border-color: var(--ate-primary, #3b82f6);
        background: var(--ate-menu-bg, #ffffff);
      }

      .hex-hash {
        color: var(--ate-text-muted, #94a3b8);
        font-family: monospace;
        font-size: 0.875rem;
      }

      .hex-input {
        background: transparent;
        border: none;
        outline: none;
        color: var(--ate-text, #1e293b);
        font-family: monospace;
        font-size: 0.875rem;
        width: 100%;
        padding-left: 4px;
      }

      .native-trigger-wrapper {
        position: relative;
        width: 32px;
        height: 32px;
      }

      .hidden-native-input {
        position: absolute;
        inset: 0;
        opacity: 0;
        width: 100%;
        height: 100%;
        cursor: pointer;
      }
    `,
  ],
})
export class TiptapColorBubbleMenuComponent implements OnInit, OnDestroy {
  private readonly i18nService = inject(TiptapI18nService);
  private readonly editorCommands = inject(EditorCommandsService);
  private readonly colorPickerSvc = inject(ColorPickerService);

  readonly t = this.i18nService.toolbar;
  readonly common = this.i18nService.common;
  readonly state = this.editorCommands.editorState;
  readonly presets = PRESET_COLORS;

  editor = input.required<Editor>();

  @ViewChild("menuRef", { static: false }) menuRef!: ElementRef<HTMLDivElement>;
  private colorInputRef = viewChild<ElementRef<HTMLInputElement>>("colorInput");

  protected tippyInstance: TippyInstance | null = null;
  protected updateTimeout: number | null = null;

  /**
   * LOCAL MODE: We lock the mode when the menu is shown to avoid race conditions
   * where the parent (bubble menu) clears the global signal before we apply the color.
   */
  activeMode = signal<"text" | "highlight">("text");

  constructor() {
    effect(() => {
      this.state();
      this.colorPickerSvc.editMode();
      this.colorPickerSvc.menuTrigger();
      this.colorPickerSvc.isInteracting();

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
        // 1. Lock the mode immediately to be immune to external signal changes
        const currentMode = this.colorPickerSvc.editMode() || "text";
        this.activeMode.set(currentMode);

        // 2. Capture selection for the command fallback
        this.colorPickerSvc.captureSelection(this.editor());

        // Note: We don't auto-focus the Hex input anymore to keep the
        // visual selection (blue highlight) active in the editor.
      },
      onHide: () => {
        // Clear trigger only AFTER the menu is hidden to maintain anchor stability during animation
        this.colorPickerSvc.done();
        this.colorPickerSvc.close();
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

  shouldShow(): boolean {
    const { isEditable } = this.state();
    if (!isEditable) return false;

    if (this.colorPickerSvc.editMode() !== null || this.colorPickerSvc.isInteracting()) {
      return true;
    }

    return false;
  }

  getSelectionRect(): DOMRect {
    const trigger = this.colorPickerSvc.menuTrigger();
    const ed = this.editor();
    if (!ed) return new DOMRect(0, 0, 0, 0);

    // 1. If we have a stable trigger from service (toolbar or parent menu), anchor to it
    if (trigger) {
      const rect = trigger.getBoundingClientRect();
      // Only use if it's still visible/in DOM (width > 0)
      if (rect.width > 0) return rect;
    }

    // 2. Otherwise (bubble menu / relay), anchor to text selection
    const { from } = ed.state.selection;

    try {
      const { node } = ed.view.domAtPos(from);
      const element = node instanceof Element ? node : node.parentElement;
      const colorElement = element?.closest('[style*="color"], [style*="background"], mark');
      if (colorElement) return colorElement.getBoundingClientRect();
    } catch (_e) {
      /* ignore */
    }

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

  readonly currentColor = computed(() => {
    const marks = this.state().marks;
    const color = this.activeMode() === "text" ? marks.computedColor : marks.computedBackground;
    return color || (this.activeMode() === "text" ? "#000000" : "#ffff00");
  });

  readonly hexValue = computed(() => {
    const color = this.currentColor();
    return color.replace("#", "").toUpperCase();
  });

  isColorActive(color: string): boolean {
    return this.colorPickerSvc.normalizeColor(this.currentColor()) === this.colorPickerSvc.normalizeColor(color);
  }

  applyColor(color: string, addToHistory = true, event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const editor = this.editor();
    // Use our LOCKED mode instead of the global signal
    // Determine if we should focus back to the editor.
    const shouldFocus = !this.colorPickerSvc.isInteracting();

    if (this.activeMode() === "text") {
      this.colorPickerSvc.applyColor(editor, color, addToHistory, shouldFocus);
    } else {
      this.colorPickerSvc.applyHighlight(editor, color, addToHistory, shouldFocus);
    }
  }

  onApply(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.colorPickerSvc.close();
  }

  onHexInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.trim();
    if (!value.startsWith("#")) value = "#" + value;
    if (/^#?[0-9A-Fa-f]{3,6}$/.test(value)) {
      this.applyColor(value, false);
    }
  }

  onHexChange(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.trim();
    if (!value.startsWith("#")) value = "#" + value;
    if (/^#?[0-9A-Fa-f]{3,6}$/.test(value)) {
      this.applyColor(value, true, event);
    }
  }

  triggerNativePicker(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.colorInputRef()?.nativeElement.click();
  }

  onNativeInput(event: Event) {
    this.applyColor((event.target as HTMLInputElement).value, false);
  }

  onNativeChange(event: Event) {
    this.applyColor((event.target as HTMLInputElement).value, true, event);
  }

  onClearColor(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const editor = this.editor();
    if (this.activeMode() === "text") {
      this.colorPickerSvc.unsetColor(editor);
    } else {
      this.colorPickerSvc.unsetHighlight(editor);
    }
  }

  onMouseDown(event: MouseEvent) {
    event.stopPropagation();
    const target = event.target as HTMLElement;
    if (target.tagName !== "INPUT") {
      event.preventDefault();
    }
  }

  onFocus() {
    this.colorPickerSvc.setInteracting(true);
  }

  onBlur() {
    setTimeout(() => {
      this.colorPickerSvc.setInteracting(false);
      this.updateMenu();
    }, 150);
  }
}
