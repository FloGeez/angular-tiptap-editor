import {
  Component,
  input,
  signal,
  ViewChild,
  ChangeDetectionStrategy,
  computed,
} from "@angular/core";
import { type Editor } from "@tiptap/core";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapColorPickerComponent } from "./components/tiptap-color-picker.component";
import { BubbleMenuConfig } from "./models/bubble-menu.model";
import { TiptapBaseBubbleMenu } from "./base/tiptap-base-bubble-menu";

@Component({
  selector: "tiptap-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TiptapButtonComponent,
    TiptapColorPickerComponent,
  ],
  template: `
    <div #menuRef class="bubble-menu">
      @if (bubbleMenuConfig().bold) {
      <tiptap-button
        icon="format_bold"
        [title]="t().bold"
        [active]="state().marks.bold"
        [disabled]="!state().can.toggleBold"
        (onClick)="onCommand('toggleBold', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().italic) {
      <tiptap-button
        icon="format_italic"
        [title]="t().italic"
        [active]="state().marks.italic"
        [disabled]="!state().can.toggleItalic"
        (onClick)="onCommand('toggleItalic', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().underline) {
      <tiptap-button
        icon="format_underlined"
        [title]="t().underline"
        [active]="state().marks.underline"
        [disabled]="!state().can.toggleUnderline"
        (onClick)="onCommand('toggleUnderline', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().strike) {
      <tiptap-button
        icon="strikethrough_s"
        [title]="t().strike"
        [active]="state().marks.strike"
        [disabled]="!state().can.toggleStrike"
        (onClick)="onCommand('toggleStrike', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().code) {
      <tiptap-button
        icon="code"
        [title]="t().code"
        [active]="state().marks.code"
        [disabled]="!state().can.toggleCode"
        (onClick)="onCommand('toggleCode', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().superscript) {
      <tiptap-button
        icon="superscript"
        [title]="t().superscript"
        [active]="state().marks.superscript"
        [disabled]="!state().can.toggleSuperscript"
        (onClick)="onCommand('toggleSuperscript', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().subscript) {
      <tiptap-button
        icon="subscript"
        [title]="t().subscript"
        [active]="state().marks.subscript"
        [disabled]="!state().can.toggleSubscript"
        (onClick)="onCommand('toggleSubscript', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().highlight) {
      <tiptap-button
        icon="highlight"
        [title]="t().highlight"
        [active]="state().marks.highlight"
        [disabled]="!state().can.toggleHighlight"
        (onClick)="onCommand('toggleHighlight', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().highlightPicker) {
      <tiptap-color-picker
        mode="highlight"
        [editor]="editor()"
        [disabled]="!state().can.setHighlight"
        [anchorToText]="true"
      />
      } @if (bubbleMenuConfig().textColor) {
      <tiptap-color-picker
        mode="text"
        [editor]="editor()"
        [disabled]="!state().can.setColor"
        [anchorToText]="true"
      />
      } @if (bubbleMenuConfig().link) {
      <tiptap-button
        icon="link"
        [title]="t().link"
        [active]="state().marks.link"
        [disabled]="!state().can.toggleLink"
        (onClick)="onCommand('toggleLink', $event)"
      ></tiptap-button>
      }
    </div>
  `,
})
export class TiptapBubbleMenuComponent extends TiptapBaseBubbleMenu {
  readonly t = this.i18nService.bubbleMenu;

  config = input<BubbleMenuConfig>({
    bold: true,
    italic: true,
    underline: true,
    strike: true,
    code: true,
    superscript: false,
    subscript: false,
    highlight: true,
    textColor: false,
    link: true,
    separator: true,
  });

  bubbleMenuConfig = computed(() => ({
    bold: true,
    italic: true,
    underline: true,
    strike: true,
    code: true,
    superscript: false,
    subscript: false,
    highlight: true,
    textColor: false,
    link: true,
    separator: true,
    ...this.config(),
  }));

  override shouldShow(): boolean {
    const { selection, nodes, isEditable, isFocused } = this.state();

    if (!isEditable) {
      return false;
    }

    // PRIORITY: If we are editing a link or color, HIDE this main bubble menu
    // to give full priority to the specialized sub-menus.
    if (this.editorCommands.linkEditMode() || this.editorCommands.colorEditMode()) {
      return false;
    }

    // Now we can check focus for the standard text selection menu
    if (!isFocused) {
      return false;
    }

    // Only show text bubble menu if there is a non-empty text selection
    // and no higher-priority node (image, table) is selected.
    return (
      selection.type === 'text' &&
      !selection.empty &&
      !nodes.isImage &&
      !nodes.isTableNodeSelected
    );
  }

  override getSelectionRect(): DOMRect {
    return this.getRectForSelection(this.editor());
  }

  protected override executeCommand(editor: Editor, command: string): void {
    this.editorCommands.execute(editor, command);
  }

  protected override onTippyHide() {
    // Sub-menus now manage their own state. Clearing them here causes 
    // premature closing when clicking between 'sibling' menu instances.
  }
}
