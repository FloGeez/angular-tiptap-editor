import {
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from "@angular/core";
import type { Editor } from "@tiptap/core";
import { ColorPickerService } from "../services/color-picker.service";
import { TiptapButtonComponent } from "../tiptap-button.component";
import { TiptapI18nService } from "../services/i18n.service";

@Component({
  selector: "tiptap-text-color-picker",
  standalone: true,
  imports: [TiptapButtonComponent],
  template: `
    <div class="text-color-picker-container">
      <tiptap-button
        icon="format_color_text"
        [title]="t().textColor"
        [color]="hasColorApplied() ? currentColor() : undefined"
        (onClick)="triggerPicker()"
      >
        <input
          #colorInput
          type="color"
          [value]="currentColor()"
          (mousedown)="onColorMouseDown($event)"
          (input)="onColorInput($event)"
          (change)="onColorPickerClose()"
          (blur)="onColorPickerClose()"
        />
      </tiptap-button>

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
  `,
  styles: [
    `
      .text-color-picker-container {
        position: relative;
        display: inline-flex;
        align-items: center;
      }

      .text-color-picker-container tiptap-button {
        position: relative;
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

      .text-color-picker-container:hover .btn-clear-badge {
        opacity: 1;
        pointer-events: auto;
      }

      .btn-clear-badge .material-symbols-outlined {
        font-size: 10px;
        line-height: 1;
      }

      input[type="color"] {
        position: absolute;
        inset: 0;
        opacity: 0;
        width: 100%;
        height: 100%;
        cursor: pointer;
        z-index: 5;
      }
    `,
  ],
})
export class TiptapTextColorPickerComponent {
  editor = input.required<Editor>();

  constructor() {
    effect(() => {
      const ed = this.editor();
      if (!ed) return;

      const update = () => this.notifyEditorChange();

      ed.on("transaction", update);
      ed.on("selectionUpdate", update);
      ed.on("focus", update);

      return () => {
        ed.off("transaction", update);
        ed.off("selectionUpdate", update);
        ed.off("focus", update);
      };
    });
  }

  interactionChange = output<boolean>();
  requestUpdate = output<void>();

  private colorInputRef = viewChild<ElementRef<HTMLInputElement>>("colorInput");

  private colorPickerSvc = inject(ColorPickerService);
  private i18nService = inject(TiptapI18nService);

  readonly t = this.i18nService.toolbar;

  private previewColor = signal<string | null>(null);
  private isPicking = signal(false);
  private editorChange = signal(0);

  /**
   * Notify Angular that the editor state should be re-read.
   */
  private notifyEditorChange() {
    this.editorChange.update((v) => v + 1);
  }

  readonly currentColor = computed(() => {
    this.editorChange();
    return (
      this.previewColor() ?? this.colorPickerSvc.getCurrentColor(this.editor())
    );
  });

  readonly hasColorApplied = computed(() => {
    this.editorChange();
    return this.previewColor()
      ? true
      : this.colorPickerSvc.hasColorApplied(this.editor());
  });

  private _syncEffect = void effect(() => {
    const el = this.colorInputRef()?.nativeElement;
    if (!el) return;
    el.value = this.currentColor();
  });

  /**
   * Keep the native <input type="color"> in sync with selection changes.
   */
  syncColorInputValue() {
    this.previewColor.set(null);
    this.isPicking.set(false);

    // Reason: force recomputation from editor selection when bubble menu re-opens.
    this.notifyEditorChange();
  }

  /**
   * Programmatically click the hidden color input.
   */
  triggerPicker() {
    this.colorInputRef()?.nativeElement.click();
  }

  /**
   * Preserve selection while interacting with native color input.
   */
  onColorMouseDown(event: MouseEvent) {
    event.stopPropagation();

    this.colorPickerSvc.captureSelection(this.editor());
    this.isPicking.set(true);
    this.interactionChange.emit(true);
  }

  /**
   * Called when the native color picker is closed.
   */
  onColorPickerClose() {
    this.previewColor.set(null);
    this.isPicking.set(false);

    // Commit the final color to history
    const inputEl = this.colorInputRef()?.nativeElement;
    if (inputEl) {
      this.colorPickerSvc.applyColor(this.editor(), inputEl.value, {
        addToHistory: true,
      });
    }

    this.colorPickerSvc.done();
    this.interactionChange.emit(false);
    this.requestUpdate.emit();
  }

  /**
   * Apply selected color.
   */
  onColorInput(event: Event) {
    const inputEl = event.target as HTMLInputElement;
    const color = inputEl.value;

    // Update the UI immediately while the user drags in the native picker.
    this.previewColor.set(this.colorPickerSvc.normalizeColor(color));

    // Live preview WITHOUT history pollution
    this.colorPickerSvc.applyColor(this.editor(), color, {
      addToHistory: false,
    });

    this.requestUpdate.emit();
  }

  /**
   * Prevent opening the native picker when clicking the clear badge.
   */
  onClearBadgeMouseDown(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Clear color via the badge.
   */
  onClearBadgeClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.previewColor.set(null);
    this.isPicking.set(false);
    this.colorPickerSvc.unsetColor(this.editor());
    this.requestUpdate.emit();
  }

  /**
   * Called when the color picker is done interacting.
   */
  done() {
    this.colorPickerSvc.done();
  }
}
