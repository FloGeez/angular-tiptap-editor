import { Component, input, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { type Editor } from "@tiptap/core";
import { TiptapButtonComponent } from "../../ui/ate-button.component";
import { TiptapSeparatorComponent } from "../../ui/ate-separator.component";
import { TiptapBaseBubbleMenu } from "../base/ate-base-bubble-menu";

import { TableBubbleMenuConfig } from "../../../models/ate-bubble-menu.model";

@Component({
  selector: "ate-table-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TiptapButtonComponent, TiptapSeparatorComponent],
  template: `
    <div #menuRef class="bubble-menu" (mousedown)="$event.preventDefault()">
      <!-- Row actions -->
      @if (config().addRowBefore !== false) {
        <ate-button
          icon="add_row_above"
          [title]="t().addRowBefore"
          [disabled]="!state().can.addRowBefore"
          (buttonClick)="onCommand('addRowBefore', $event)"></ate-button>
      }
      @if (config().addRowAfter !== false) {
        <ate-button
          icon="add_row_below"
          [title]="t().addRowAfter"
          [disabled]="!state().can.addRowAfter"
          (buttonClick)="onCommand('addRowAfter', $event)"></ate-button>
      }
      @if (config().deleteRow !== false) {
        <ate-button
          icon="delete"
          [title]="t().deleteRow"
          variant="danger"
          [disabled]="!state().can.deleteRow"
          (buttonClick)="onCommand('deleteRow', $event)"></ate-button>
      }
      @if (config().separator !== false) {
        <ate-separator />
      }

      <!-- Column actions -->
      @if (config().addColumnBefore !== false) {
        <ate-button
          icon="add_column_left"
          [title]="t().addColumnBefore"
          [disabled]="!state().can.addColumnBefore"
          (buttonClick)="onCommand('addColumnBefore', $event)"></ate-button>
      }
      @if (config().addColumnAfter !== false) {
        <ate-button
          icon="add_column_right"
          [title]="t().addColumnAfter"
          [disabled]="!state().can.addColumnAfter"
          (buttonClick)="onCommand('addColumnAfter', $event)"></ate-button>
      }
      @if (config().deleteColumn !== false) {
        <ate-button
          icon="delete"
          [title]="t().deleteColumn"
          variant="danger"
          [disabled]="!state().can.deleteColumn"
          (buttonClick)="onCommand('deleteColumn', $event)"></ate-button>
      }
      @if (config().separator !== false) {
        <ate-separator />
      }

      <!-- Cell actions -->
      @if (config().toggleHeaderRow !== false) {
        <ate-button
          icon="toolbar"
          [title]="t().toggleHeaderRow"
          [active]="state().nodes.isTableHeaderRow"
          [disabled]="!state().can.toggleHeaderRow"
          (buttonClick)="onCommand('toggleHeaderRow', $event)"></ate-button>
      }
      @if (config().toggleHeaderColumn !== false) {
        <ate-button
          icon="dock_to_right"
          [title]="t().toggleHeaderColumn"
          [active]="state().nodes.isTableHeaderColumn"
          [disabled]="!state().can.toggleHeaderColumn"
          (buttonClick)="onCommand('toggleHeaderColumn', $event)"></ate-button>
      }
      @if (config().separator !== false && config().deleteTable !== false) {
        <ate-separator />
      }

      <!-- Table actions -->
      @if (config().deleteTable !== false) {
        <ate-button
          icon="delete_forever"
          [title]="t().deleteTable"
          variant="danger"
          [disabled]="!state().can.deleteTable"
          (buttonClick)="onCommand('deleteTable', $event)"></ate-button>
      }
    </div>
  `,
})
export class TiptapTableBubbleMenuComponent extends TiptapBaseBubbleMenu {
  // Alias for template
  readonly t = this.i18nService.table;

  config = input<TableBubbleMenuConfig>({
    addRowBefore: true,
    addRowAfter: true,
    deleteRow: true,
    addColumnBefore: true,
    addColumnAfter: true,
    deleteColumn: true,
    deleteTable: true,
    toggleHeaderRow: true,
    toggleHeaderColumn: true,
    separator: true,
  });

  override shouldShow(): boolean {
    const { selection, nodes, isEditable, isFocused } = this.state();

    if (this.editorCommands.linkEditMode() || this.editorCommands.colorEditMode()) {
      return false;
    }

    // Only show table bubble menu if:
    // 1. We are inside a table (nodes.isTable)
    // 2. Editor is editable and focused
    // 3. Selection is EMPTY (cursor) OR the Table node itself is selected
    // 4. It's NOT a CellSelection (cell bubble menu takes priority)
    return (
      nodes.isTable &&
      isEditable &&
      isFocused &&
      (selection.empty || nodes.isTableNodeSelected) &&
      selection.type !== "cell"
    );
  }

  override getSelectionRect(): DOMRect {
    const ed = this.editor();
    if (!ed) return new DOMRect(0, 0, 0, 0);

    const { from } = ed.state.selection;

    try {
      // 1. Direct ProseMirror approach: get DOM node at position
      const dom = ed.view.domAtPos(from).node;

      // Find closest table element
      const tableElement =
        dom instanceof HTMLElement ? dom.closest("table") : dom.parentElement?.closest("table");

      if (tableElement) {
        return tableElement.getBoundingClientRect();
      }
    } catch (_e) {
      // Fallback
    }

    // 2. Fallback via coordinates
    const coords = ed.view.coordsAtPos(from);
    if (coords) {
      // Search for table element at these coordinates
      const element = document.elementFromPoint(coords.left, coords.top);
      const table = element?.closest("table");
      if (table) return table.getBoundingClientRect();
    }

    // 3. Ultimate fallback if selection is ambiguous
    const activeTable = ed.view.dom.querySelector(
      "table.selected, table:has(.selected), table:has(.selected-cell), table:has(.selected-node)"
    );
    if (activeTable) {
      return activeTable.getBoundingClientRect();
    }

    return new DOMRect(-9999, -9999, 0, 0);
  }

  protected override executeCommand(editor: Editor, command: string, ...args: unknown[]): void {
    this.editorCommands.execute(editor, command, ...args);
  }
}
