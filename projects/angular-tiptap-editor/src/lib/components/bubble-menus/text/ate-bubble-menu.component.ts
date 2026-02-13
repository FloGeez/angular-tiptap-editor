import {
  Component,
  input,
  ChangeDetectionStrategy,
  computed,
  OnDestroy,
  OnInit,
} from "@angular/core";
import { type Editor } from "@tiptap/core";
import { AteButtonComponent } from "../../ui/ate-button.component";
import { AteColorPickerComponent } from "../../color-picker/ate-color-picker.component";
import { AteBubbleMenuConfig } from "../../../models/ate-bubble-menu.model";
import { ATE_DEFAULT_BUBBLE_MENU_CONFIG } from "../../../config/ate-editor.config";
import { AteBaseBubbleMenu } from "../base/ate-base-bubble-menu";

@Component({
  selector: "ate-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AteButtonComponent, AteColorPickerComponent],
  template: `
    <div #menuRef class="bubble-menu" (mousedown)="$event.preventDefault()">
      @if (bubbleMenuConfig().bold) {
        <ate-button
          icon="format_bold"
          [title]="t().bold"
          [active]="state().marks.bold"
          [disabled]="!state().can.toggleBold"
          (buttonClick)="onCommand('toggleBold', $event)"></ate-button>
      }
      @if (bubbleMenuConfig().italic) {
        <ate-button
          icon="format_italic"
          [title]="t().italic"
          [active]="state().marks.italic"
          [disabled]="!state().can.toggleItalic"
          (buttonClick)="onCommand('toggleItalic', $event)"></ate-button>
      }
      @if (bubbleMenuConfig().underline) {
        <ate-button
          icon="format_underlined"
          [title]="t().underline"
          [active]="state().marks.underline"
          [disabled]="!state().can.toggleUnderline"
          (buttonClick)="onCommand('toggleUnderline', $event)"></ate-button>
      }
      @if (bubbleMenuConfig().strike) {
        <ate-button
          icon="strikethrough_s"
          [title]="t().strike"
          [active]="state().marks.strike"
          [disabled]="!state().can.toggleStrike"
          (buttonClick)="onCommand('toggleStrike', $event)"></ate-button>
      }
      @if (bubbleMenuConfig().code) {
        <ate-button
          icon="code"
          [title]="t().code"
          [active]="state().marks.code"
          [disabled]="!state().can.toggleCode"
          (buttonClick)="onCommand('toggleCode', $event)"></ate-button>
      }
      @if (bubbleMenuConfig().superscript) {
        <ate-button
          icon="superscript"
          [title]="t().superscript"
          [active]="state().marks.superscript"
          [disabled]="!state().can.toggleSuperscript"
          (buttonClick)="onCommand('toggleSuperscript', $event)"></ate-button>
      }
      @if (bubbleMenuConfig().subscript) {
        <ate-button
          icon="subscript"
          [title]="t().subscript"
          [active]="state().marks.subscript"
          [disabled]="!state().can.toggleSubscript"
          (buttonClick)="onCommand('toggleSubscript', $event)"></ate-button>
      }
      @if (bubbleMenuConfig().highlight) {
        <ate-button
          icon="highlight"
          [title]="t().highlight"
          [active]="state().marks.highlight"
          [disabled]="!state().can.toggleHighlight"
          (buttonClick)="onCommand('toggleHighlight', $event)"></ate-button>
      }
      @if (bubbleMenuConfig().highlightPicker) {
        <ate-color-picker
          mode="highlight"
          [editor]="editor()"
          [disabled]="!state().can.setHighlight"
          [anchorToText]="true" />
      }
      @if (bubbleMenuConfig().textColor) {
        <ate-color-picker
          mode="text"
          [editor]="editor()"
          [disabled]="!state().can.setColor"
          [anchorToText]="true" />
      }
      @if (bubbleMenuConfig().link) {
        <ate-button
          icon="link"
          [title]="t().link"
          [active]="state().marks.link"
          [disabled]="!state().can.toggleLink"
          (buttonClick)="onCommand('toggleLink', $event)"></ate-button>
      }
      @if (bubbleMenuConfig().custom?.length) {
        @for (item of bubbleMenuConfig().custom; track item.key) {
          <ate-button
            [icon]="item.icon"
            [title]="item.label"
            (buttonClick)="item.command(editor())"></ate-button>
        }
      }
    </div>
  `,
})
export class AteBubbleMenuComponent extends AteBaseBubbleMenu implements OnInit, OnDestroy {
  readonly t = this.i18nService.bubbleMenu;

  ngOnInit() {
    const ed = this.editor();
    // Specialized mousedown listener for the text bubble menu:
    // This is necessary to hide the menu immediately when clicking elsewhere,
    // avoiding a 'jumping' effect where the menu moves to the new cursor position
    // before the reactive state has time to hide it.
    if (ed?.view?.dom) {
      ed.view.dom.addEventListener("mousedown", this.onMouseDown, { capture: true });
    }
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    const ed = this.editor();
    if (ed?.view?.dom) {
      ed.view.dom.removeEventListener("mousedown", this.onMouseDown, { capture: true });
    }
  }

  private onMouseDown = () => {
    this.hideTippy();
  };

  config = input<AteBubbleMenuConfig>(ATE_DEFAULT_BUBBLE_MENU_CONFIG);

  bubbleMenuConfig = computed(() => ({
    ...ATE_DEFAULT_BUBBLE_MENU_CONFIG,
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
      selection.type === "text" && !selection.empty && !nodes.isImage && !nodes.isTableNodeSelected
    );
  }

  override getSelectionRect(): DOMRect {
    return this.getRectForSelection(this.editor());
  }

  protected override executeCommand(editor: Editor, command: string, ...args: unknown[]): void {
    this.editorCommands.execute(editor, command, ...args);
  }

  protected override onTippyHide() {
    // Sub-menus now manage their own state. Clearing them here causes
    // premature closing when clicking between 'sibling' menu instances.
  }
}
