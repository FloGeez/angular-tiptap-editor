import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  computed,
  inject,
  input,
} from "@angular/core";
import type { Editor } from "@tiptap/core";
import { AteFontService } from "../../services/ate-font.service";
import { AteEditorI18n } from "../../services/ate-editor-i18n.service";
import { AteEditorCommandsService } from "../../services/ate-editor-commands.service";
import { AteButtonComponent } from "../ui/ate-button.component";
import { fontFamilyLabel } from "../../utils/ate-font.utils";

/**
 * Trigger of the font family menu. Like the color picker shows the color, it shows the font:
 * "Aa" drawn in the font of the selection, named in the tooltip.
 */
@Component({
  selector: "ate-font-family-button",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AteButtonComponent],
  template: `
    <ate-button
      class="ate-font-family"
      [title]="title()"
      ariaHasPopup="listbox"
      [ariaExpanded]="isOpen()"
      [active]="isOpen()"
      [disabled]="isDisabled()"
      (buttonClick)="onToggle($event)">
      <span class="ate-font-family-sample" [style.font-family]="state().marks.fontFamily">Aa</span>
    </ate-button>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        align-items: center;
      }

      .ate-font-family-sample {
        position: relative;
        z-index: 1;
        font-size: 15px;
        font-weight: 600;
        line-height: 1;
      }
    `,
  ],
})
export class AteFontFamilyButtonComponent {
  editor = input.required<Editor>();
  disabled = input<boolean>(false);
  /** Anchor the dropdown to the selected text instead of this button, as in the bubble menu */
  anchorToText = input<boolean>(false);

  private readonly fontService = inject(AteFontService);
  private readonly i18nService = inject(AteEditorI18n);
  private readonly editorCommands = inject(AteEditorCommandsService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly t = this.i18nService.toolbar;
  readonly state = this.editorCommands.editorState;

  /** Open from this button: the toolbar and the bubble menu each have their own */
  readonly isOpen = computed(
    () =>
      this.fontService.editMode() === "family" &&
      this.host.nativeElement.contains(this.fontService.menuTrigger())
  );

  readonly isDisabled = computed(() => {
    const { can, isEditable } = this.state();
    return this.disabled() || !isEditable || !can.setFontFamily;
  });

  /** The tooltip names the font, which the button only shows drawn */
  readonly title = computed(() => {
    const { fontFamily } = this.state().marks;
    const label = fontFamily
      ? fontFamilyLabel(fontFamily, this.fontService.fonts().families)
      : this.t().defaultFont;
    return `${this.t().fontFamily} · ${label}`;
  });

  onToggle(event: Event) {
    const trigger = event.currentTarget as HTMLElement;
    this.fontService.open("family", this.anchorToText() ? null : trigger);
  }
}
