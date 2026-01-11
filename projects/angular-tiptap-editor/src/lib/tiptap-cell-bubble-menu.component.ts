import {
    Component,
    input,
    ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { type Editor } from "@tiptap/core";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapBaseBubbleMenu } from "./base/tiptap-base-bubble-menu";

import { CellBubbleMenuConfig } from "./models/bubble-menu.model";

@Component({
    selector: "tiptap-cell-bubble-menu",
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TiptapButtonComponent],
    template: `
    <div #menuRef class="bubble-menu">
      <!-- Cell specific actions -->
      @if (config().mergeCells !== false && !state().selection.isSingleCell) {
      <tiptap-button
        icon="cell_merge"
        [title]="i18n().table().mergeCells"
        [disabled]="!state().can.mergeCells"
        (onClick)="onCommand('mergeCells', $event)"
      ></tiptap-button>
      } @if (config().splitCell !== false && state().selection.isSingleCell) {
      <tiptap-button
        icon="split_scene"
        [title]="i18n().table().splitCell"
        [disabled]="!state().can.splitCell"
        (onClick)="onCommand('splitCell', $event)"
      ></tiptap-button>
      }
    </div>
  `,
})
export class TiptapCellBubbleMenuComponent extends TiptapBaseBubbleMenu {
    // Inputs
    config = input<CellBubbleMenuConfig>({});

    // Signals
    readonly i18n = () => this.i18nService;

    override shouldShow(): boolean {
        const { selection, nodes, isEditable, isFocused } = this.state();

        // Only show cell bubble menu for CellSelection
        return (
            selection.type === 'cell' &&
            nodes.isTableCell &&
            isEditable &&
            isFocused
        );
    }

    override getSelectionRect(): DOMRect {
        const ed = this.editor();
        if (!ed) return new DOMRect(0, 0, 0, 0);

        // CellSelection
        const selection = ed.state.selection as any;

        // 1. Multiple cells selected
        if (selection.$anchorCell && selection.$headCell) {
            const cells: HTMLElement[] = [];

            // Try to find all selected cell nodes
            ed.view.dom.querySelectorAll('.selectedCell').forEach(el => {
                if (el instanceof HTMLElement) cells.push(el);
            });

            if (cells.length > 0) {
                let top = Infinity, bottom = -Infinity, left = Infinity, right = -Infinity;

                cells.forEach(cell => {
                    const r = cell.getBoundingClientRect();
                    top = Math.min(top, r.top);
                    bottom = Math.max(bottom, r.bottom);
                    left = Math.min(left, r.left);
                    right = Math.max(right, r.right);
                });

                return new DOMRect(left, top, right - left, bottom - top);
            }

            // Fallback to anchor/head if no .selectedCell (rare)
            const anchor = ed.view.nodeDOM(selection.$anchorCell.pos) as HTMLElement;
            const head = ed.view.nodeDOM(selection.$headCell.pos) as HTMLElement;

            if (anchor && head) {
                const anchorRect = anchor.getBoundingClientRect();
                const headRect = head.getBoundingClientRect();

                const top = Math.min(anchorRect.top, headRect.top);
                const bottom = Math.max(anchorRect.bottom, headRect.bottom);
                const left = Math.min(anchorRect.left, headRect.left);
                const right = Math.max(anchorRect.right, headRect.right);

                return new DOMRect(left, top, right - left, bottom - top);
            }
        }

        // 2. Ultimate fallback via ProseMirror class
        const singleCell = ed.view.dom.querySelector('.selectedCell');
        if (singleCell) {
            return singleCell.getBoundingClientRect();
        }

        return new DOMRect(-9999, -9999, 0, 0);
    }

    protected override executeCommand(editor: Editor, command: string): void {
        this.editorCommands.execute(editor, command);
    }
}
