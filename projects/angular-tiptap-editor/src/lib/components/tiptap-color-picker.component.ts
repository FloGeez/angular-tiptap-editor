import {
  Component,
  computed,
  inject,
  input,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import type { Editor } from "@tiptap/core";
import { ColorPickerService } from "../services/color-picker.service";
import { TiptapButtonComponent } from "../tiptap-button.component";
import { TiptapI18nService } from "../services/i18n.service";
import { EditorCommandsService } from "../services/editor-commands.service";

export type ColorPickerMode = "text" | "highlight";

@Component({
  selector: "tiptap-color-picker",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TiptapButtonComponent, CommonModule],
  template: `
    <div class="color-picker-wrapper">
      <div class="color-picker-container" [class.is-highlight]="mode() === 'highlight'">
        <tiptap-button
          [icon]="buttonIcon()"
          [title]="mode() === 'text' ? t().textColor : t().highlight"
          [color]="buttonTextColor()"
          [backgroundColor]="buttonBgColor()"
          [disabled]="disabled() || !state().isEditable"
          (onClick)="onToggle($event)"
        />

        @if (hasColorApplied()) {
        <button
          class="btn-clear-badge"
          type="button"
          [title]="t().clear"
          (click)="onClear($event)"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
        }
      </div>
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
    `,
  ],
})
export class TiptapColorPickerComponent {
  editor = input.required<Editor>();
  mode = input<ColorPickerMode>("text");
  disabled = input<boolean>(false);
  anchorToText = input<boolean>(false);

  private colorPickerSvc = inject(ColorPickerService);
  private i18nService = inject(TiptapI18nService);
  private editorCommands = inject(EditorCommandsService);

  readonly t = this.i18nService.toolbar;
  readonly state = this.editorCommands.editorState;

  readonly currentColor = computed(() => {
    const marks = this.state().marks;
    const color = this.mode() === "text" ? marks.color : marks.background;
    return color || (this.mode() === "text" ? "#000000" : "#ffff00");
  });

  readonly hasColorApplied = computed(() => {
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

  onToggle(event: Event) {
    // If anchorToText is true, we don't pass the event so it defaults to text selection anchoring
    this.editorCommands.execute(this.editor(), 'toggleColorPicker', this.mode(), this.anchorToText() ? undefined : event);
  }

  onClear(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const cmd = this.mode() === "text" ? "unsetColor" : "unsetHighlight";
    this.editorCommands.execute(this.editor(), cmd);

    this.editorCommands.closeColorPicker();
  }
}
