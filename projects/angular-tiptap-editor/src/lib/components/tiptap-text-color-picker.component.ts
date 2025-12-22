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

@Component({
  selector: "tiptap-text-color-picker",
  standalone: true,
  providers: [ColorPickerService],
  template: `
    <label
      class="btn-text-color"
      title="Color"
      [style.color]="hasColorApplied() ? currentColor() : undefined"
      (mousedown)="onColorMouseDown($event)"
    >
      <span class="material-symbols-outlined">format_color_text</span>

      @if (hasColorApplied()) {
      <button
        class="btn-clear-badge"
        type="button"
        title="Clear color"
        (mousedown)="onClearBadgeMouseDown($event)"
        (click)="onClearBadgeClick($event)"
      >
        <span class="material-symbols-outlined">close</span>
      </button>
      }

      <input
        #colorInput
        type="color"
        [value]="currentColor()"
        (mousedown)="onColorMouseDown($event)"
        (input)="onColorInput($event)"
        (change)="onColorPickerClose()"
        (blur)="onColorPickerClose()"
      />
    </label>
  `,
  styles: [
    `
      .btn-text-color {
        width: 32px;
        height: 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        cursor: pointer;
        position: relative;
        color: #64748b;
      }

      .btn-text-color:hover {
        background: rgba(99, 102, 241, 0.1);
      }

      .btn-clear-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        width: 16px;
        height: 16px;
        padding: 0;
        border: none;
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.75);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
        opacity: 0;
        pointer-events: none;
        transition: opacity 120ms ease;
      }

      .btn-text-color:hover .btn-clear-badge {
        opacity: 1;
        pointer-events: auto;
      }

      .btn-clear-badge .material-symbols-outlined {
        font-size: 12px;
        line-height: 1;
      }

      .btn-text-color input[type="color"] {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
        z-index: 1;
      }
    `,
  ],
})
export class TiptapTextColorPickerComponent {
  editor = input.required<Editor>();

  interactionChange = output<boolean>();
  requestUpdate = output<void>();

  private colorInputRef = viewChild<ElementRef<HTMLInputElement>>("colorInput");

  private colorPickerSvc = inject(ColorPickerService);

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

    this.colorPickerSvc.applyColor(
      this.editor(),
      color,
      this.editor().state.selection
    );

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
