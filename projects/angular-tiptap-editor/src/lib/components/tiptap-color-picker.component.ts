import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  HostListener,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import type { Editor } from "@tiptap/core";
import { ColorPickerService } from "../services/color-picker.service";
import { TiptapButtonComponent } from "../tiptap-button.component";
import { TiptapI18nService } from "../services/i18n.service";
import { EditorCommandsService } from "../services/editor-commands.service";
import { EditorStateSnapshot } from "../models/editor-state.model";

export type ColorPickerMode = "text" | "highlight";

const PRESET_COLORS = [
  "#000000", "#666666", "#CCCCCC", "#FFFFFF",
  "#F44336", "#FF9800", "#FFEB3B", "#4CAF50",
  "#00BCD4", "#2196F3", "#9C27B0", "#E91E63"
];

@Component({
  selector: "tiptap-color-picker",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TiptapButtonComponent],
  template: `
    <div class="color-picker-wrapper" #wrapperRef>
      <div class="color-picker-container" [class.is-highlight]="mode() === 'highlight'">
        <tiptap-button
          [icon]="buttonIcon()"
          [title]="mode() === 'text' ? t().textColor : t().highlight"
          [color]="buttonTextColor()"
          [backgroundColor]="buttonBgColor()"
          [disabled]="disabled() || !state().isEditable"
          (onClick)="toggleDropdown()"
        />

        @if (hasColorApplied()) {
        <button
          class="btn-clear-badge"
          type="button"
          [title]="t().clear"
          (mousedown)="onClearBadgeMouseDown($event)"
          (click)="onClearBadgeClick($event)"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
        }
      </div>

      @if (showDropdown()) {
        <div class="color-picker-dropdown compact" (mousedown)="$event.stopPropagation()">
            <div class="dropdown-row presets">
                <div class="color-grid">
                    @for (color of presets; track color) {
                        <button 
                            class="color-swatch" 
                            [style.backgroundColor]="color"
                            [class.is-active]="isColorActive(color)"
                            [title]="color"
                            (click)="applyColor(color)"
                        ></button>
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
                        (input)="onHexInput($event)"
                        (change)="onHexChange($event)"
                        maxlength="6"
                        placeholder="000000"
                    />
                </div>
                
                <div class="native-trigger-wrapper">
                    <button class="btn-native-picker" (click)="triggerNativePicker()" [style.backgroundColor]="currentColor()" [title]="t().customColor">
                        <span class="material-symbols-outlined">colorize</span>
                    </button>
                    <input
                        #colorInput
                        type="color"
                        class="hidden-native-input"
                        [value]="currentColor()"
                        (input)="onNativeInput($event)"
                        (change)="onNativeChange($event)"
                    />
                </div>

                <div class="divider-v"></div>

                <button class="btn-clear-compact" (click)="onClearBadgeClick($event)" [title]="t().clear">
                    <span class="material-symbols-outlined">format_color_reset</span>
                </button>
            </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .color-picker-wrapper {
        position: relative;
        display: inline-block;
      }

      .color-picker-container {
        position: relative;
        display: inline-flex;
        align-items: center;
      }

      .btn-clear-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 14px;
        height: 14px;
        padding: 0;
        border: none;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.75);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        opacity: 0;
        pointer-events: none;
        transition: opacity 120ms ease;
      }

      .color-picker-container:hover .btn-clear-badge {
        opacity: 1;
        pointer-events: auto;
      }

      .btn-clear-badge .material-symbols-outlined {
        font-size: 10px;
        line-height: 1;
      }

      .color-picker-dropdown.compact {
        position: absolute;
        top: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 2000;
        background: var(--ate-menu-bg, #ffffff);
        border: 1px solid var(--ate-border, #e2e8f0);
        border-radius: var(--ate-border-radius, 12px);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        padding: 8px 12px;
        width: 310px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        animation: slideDown 200ms cubic-bezier(0, 0, 0.2, 1);
        backdrop-filter: blur(8px);
      }

      @keyframes slideDown {
        from { opacity: 0; transform: translate(-50%, -10px); }
        to { opacity: 1; transform: translate(-50%, 0); }
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

      .color-swatch {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 4px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        cursor: pointer;
        padding: 0;
        transition: all 120ms ease;
      }

      .color-swatch:hover {
        transform: scale(1.15);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        z-index: 1;
      }

      .color-swatch.is-active {
        border-color: var(--ate-primary, #3b82f6);
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
      }

      .divider-v {
        width: 1px;
        height: 24px;
        background: var(--ate-border, #e2e8f0);
      }

      .btn-clear-compact {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: var(--ate-surface-secondary, #f1f5f9);
        border: none;
        border-radius: 6px;
        color: var(--ate-text-secondary, #64748b);
        cursor: pointer;
        transition: all 150ms ease;
      }

      .btn-clear-compact:hover {
        background: #fee2e2;
        color: #ef4444;
      }

      .btn-clear-compact .material-symbols-outlined {
        font-size: 18px;
      }

      .hex-input-wrapper {
        flex: 1;
        display: flex;
        align-items: center;
        background: var(--ate-surface-secondary, #f8fafc);
        border: 1px solid var(--ate-border, #e2e8f0);
        border-radius: 6px;
        padding: 0 8px;
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

      .btn-native-picker {
        width: 100%;
        height: 100%;
        border-radius: 8px;
        border: 1px solid var(--ate-border, #e2e8f0);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        padding: 0;
        color: #ffffff;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
        transition: transform 150ms ease;
      }

      .btn-native-picker:hover {
        transform: scale(1.05);
      }

      .btn-native-picker .material-symbols-outlined {
        font-size: 20px;
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
export class TiptapColorPickerComponent {
  editor = input.required<Editor>();
  mode = input<ColorPickerMode>("text");
  disabled = input<boolean>(false);

  interactionChange = output<boolean>();
  requestUpdate = output<void>();

  private colorInputRef = viewChild<ElementRef<HTMLInputElement>>("colorInput");
  private wrapperRef = viewChild<ElementRef<HTMLDivElement>>("wrapperRef");

  private colorPickerSvc = inject(ColorPickerService);
  private i18nService = inject(TiptapI18nService);
  private editorCommands = inject(EditorCommandsService);
  private platformId = inject(PLATFORM_ID);

  readonly t = this.i18nService.toolbar;
  readonly presets = PRESET_COLORS;
  readonly state = this.editorCommands.editorState;

  private previewColor = signal<string | null>(null);
  showDropdown = signal(false);

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!isPlatformBrowser(this.platformId)) return;

    const wrapper = this.wrapperRef()?.nativeElement;
    if (wrapper && !wrapper.contains(event.target as Node)) {
      if (this.showDropdown()) {
        this.closeDropdown();
      }
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape() {
    if (this.showDropdown()) {
      this.closeDropdown();
    }
  }

  readonly currentColor = computed(() => {
    if (this.previewColor()) return this.previewColor()!;
    const marks = this.state().marks;
    const color = this.mode() === "text" ? marks.color : marks.background;
    return color || (this.mode() === "text" ? "#000000" : "#ffff00"); // default fallback
  });

  readonly hexValue = computed(() => {
    const color = this.currentColor();
    return color.replace('#', '').toUpperCase();
  });

  readonly hasColorApplied = computed(() => {
    if (this.previewColor()) return true;
    const marks = this.state().marks;
    return (this.mode() === "text" ? marks.color : marks.background) !== null;
  });

  readonly buttonIcon = computed(() => {
    return this.mode() === "text" ? "format_color_text" : "format_color_fill";
  });

  readonly buttonBgColor = computed(() => {
    const color = this.currentColor();
    if (this.mode() === "highlight") {
      return this.hasColorApplied() ? color : "";
    }
    if (this.hasColorApplied() && this.colorPickerSvc.getLuminance(color) > 200) {
      return "#333333";
    }
    return "";
  });

  readonly buttonTextColor = computed(() => {
    const color = this.currentColor();
    if (this.mode() === "text") {
      return this.hasColorApplied() ? color : "var(--ate-text-secondary)";
    }
    if (this.hasColorApplied()) {
      return this.colorPickerSvc.getLuminance(color) > 128 ? "#000000" : "#ffffff";
    }
    return "var(--ate-text-secondary)";
  });

  toggleDropdown() {
    if (this.disabled()) return;
    this.showDropdown() ? this.closeDropdown() : this.openDropdown();
  }

  openDropdown() {
    this.showDropdown.set(true);
    this.interactionChange.emit(true);
    this.colorPickerSvc.captureSelection(this.editor());
  }

  closeDropdown() {
    this.showDropdown.set(false);
    this.interactionChange.emit(false);
    this.done();
  }

  isColorActive(color: string): boolean {
    return this.colorPickerSvc.normalizeColor(this.currentColor()) === this.colorPickerSvc.normalizeColor(color);
  }

  applyColor(color: string, addToHistory = true) {
    const editor = this.editor();
    if (this.mode() === "text") {
      this.colorPickerSvc.applyColor(editor, color, { addToHistory });
    } else {
      this.colorPickerSvc.applyHighlight(editor, color, { addToHistory });
    }
    this.requestUpdate.emit();
  }

  onHexInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.trim();
    if (!value.startsWith("#")) value = "#" + value;
    if (/^#[0-9A-Fa-f]{3,6}$/.test(value)) this.applyColor(value, false);
  }

  onHexChange(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.trim();
    if (!value.startsWith("#")) value = "#" + value;
    if (/^#[0-9A-Fa-f]{3,6}$/.test(value)) this.applyColor(value, true);
  }

  triggerNativePicker() {
    this.colorInputRef()?.nativeElement.click();
  }

  onNativeInput(event: Event) {
    this.applyColor((event.target as HTMLInputElement).value, false);
  }

  onNativeChange(event: Event) {
    this.applyColor((event.target as HTMLInputElement).value, true);
  }

  onClearBadgeMouseDown(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onClearBadgeClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (this.mode() === "text") {
      this.colorPickerSvc.unsetColor(this.editor());
    } else {
      this.colorPickerSvc.unsetHighlight(this.editor());
    }

    this.showDropdown.set(false);
    this.interactionChange.emit(false);
    this.requestUpdate.emit();
  }

  done() {
    this.colorPickerSvc.done();
  }
}
