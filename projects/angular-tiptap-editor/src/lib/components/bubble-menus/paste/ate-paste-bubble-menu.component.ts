import { Component, ChangeDetectionStrategy, effect } from "@angular/core";
import { Instance as TippyInstance } from "tippy.js";
import { AteButtonComponent } from "../../ui/ate-button.component";
import { AteSeparatorComponent } from "../../ui/ate-separator.component";
import { AteBaseSubBubbleMenu } from "../base/ate-base-sub-bubble-menu";
import {
  cleanPastedFormatting,
  getPastePrompt,
  keepPastedFormatting,
} from "../../../extensions/ate-paste.extension";

/** Time after which an unanswered prompt goes away, keeping the formatting, in milliseconds */
const PROMPT_TIMEOUT = 8000;

/**
 * "Keep | Clean up" next to the text just pasted, in the `prompt` paste mode. It never takes the
 * focus: typing, moving the cursor, Enter, Escape or a click elsewhere keep the formatting, as does
 * waiting a few seconds. Mod+Shift+Backspace cleans it up, like the button.
 */
@Component({
  selector: "ate-paste-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AteButtonComponent, AteSeparatorComponent],
  template: `
    <div #menuRef class="bubble-menu" role="toolbar" (mousedown)="$event.preventDefault()">
      <ate-button variant="text" icon="apply" [title]="t().keepTooltip" (buttonClick)="keep()">
        {{ t().keep }}
      </ate-button>
      <ate-separator />
      <ate-button variant="text" [title]="t().cleanTooltip" (buttonClick)="clean()">
        {{ t().clean }}
      </ate-button>
    </div>
  `,
  styles: [
    `
      /* Text buttons are 32px wide in the medium size: let them fit their label, as in the font menu */
      .bubble-menu ::ng-deep .ate-button.text-button {
        width: auto;
        padding: 0 10px;
        font-size: 13px;
      }
    `,
  ],
})
export class AtePasteBubbleMenuComponent extends AteBaseSubBubbleMenu {
  readonly t = this.i18nService.paste;

  private timeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    // The shared editor state only notifies when something it tracks changes: answering the
    // prompt (Enter, Escape) changes neither the text nor the selection, so follow every transaction.
    // While the prompt is offered, the other bubble menus step aside (a pasted table ends with the
    // cursor in it, where the table menu would show over the prompt)
    effect(
      onCleanup => {
        const editor = this.editor();
        const onTransaction = () => {
          this.editorCommands.pastePromptOpen.set(getPastePrompt(editor.state) !== null);
          this.updateMenu();
        };
        editor.on("transaction", onTransaction);
        onCleanup(() => {
          editor.off("transaction", onTransaction);
          this.editorCommands.pastePromptOpen.set(false);
        });
      },
      { allowSignalWrites: true }
    );
  }

  protected override onStateChange() {
    /* The prompt lives in the editor state, read by shouldShow on every transaction */
  }

  override shouldShow(): boolean {
    return this.state().isEditable && getPastePrompt(this.editor().state) !== null;
  }

  /** Anchored to the end of the pasted text, where the cursor is */
  override getSelectionRect(): DOMRect {
    const editor = this.editor();
    const prompt = getPastePrompt(editor.state);
    if (!prompt) {
      return new DOMRect(-9999, -9999, 0, 0);
    }
    const { top, bottom, left } = editor.view.coordsAtPos(prompt.to);
    return new DOMRect(left, top, 0, bottom - top);
  }

  protected override onTippyShow(_instance: TippyInstance) {
    this.clearTimeout();
    this.timeout = setTimeout(() => this.keep(), PROMPT_TIMEOUT);
  }

  protected override onTippyHide(_instance: TippyInstance) {
    this.clearTimeout();
    // Hidden by a click elsewhere: the formatting stays
    keepPastedFormatting(this.editor());
  }

  override ngOnDestroy() {
    this.clearTimeout();
    super.ngOnDestroy();
  }

  keep() {
    keepPastedFormatting(this.editor());
  }

  clean() {
    cleanPastedFormatting(this.editor());
  }

  private clearTimeout() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
