import { Component, input, ChangeDetectionStrategy, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { type Editor } from "@tiptap/core";
import { AteButtonComponent } from "../../ui/ate-button.component";
import { AteSeparatorComponent } from "../../ui/ate-separator.component";
import { AteBaseBubbleMenu } from "../base/ate-base-bubble-menu";

import {
  AteTableBubbleMenuConfig,
  ATE_TABLE_BUBBLE_MENU_KEYS,
} from "../../../models/ate-bubble-menu.model";
import { ATE_DEFAULT_TABLE_MENU_CONFIG } from "../../../config/ate-editor.config";

@Component({
  selector: "ate-table-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, AteButtonComponent, AteSeparatorComponent],
  template: `
    <div #menuRef class="bubble-menu" (mousedown)="$event.preventDefault()">
      <!-- Row actions -->
      @if (tableBubbleMenuConfig().addRowBefore !== false) {
        <ate-button
          icon="add_row_above"
          [title]="t().addRowBefore"
          [disabled]="!state().can.addRowBefore"
          (buttonClick)="onCommand('addRowBefore', $event)"></ate-button>
      }
      @if (tableBubbleMenuConfig().addRowAfter !== false) {
        <ate-button
          icon="add_row_below"
          [title]="t().addRowAfter"
          [disabled]="!state().can.addRowAfter"
          (buttonClick)="onCommand('addRowAfter', $event)"></ate-button>
      }
      @if (tableBubbleMenuConfig().deleteRow !== false) {
        <ate-button
          icon="delete"
          [title]="t().deleteRow"
          variant="danger"
          [disabled]="!state().can.deleteRow"
          (buttonClick)="onCommand('deleteRow', $event)"></ate-button>
      }
      @if (tableBubbleMenuConfig().separator !== false) {
        <ate-separator />
      }

      <!-- Column actions -->
      @if (tableBubbleMenuConfig().addColumnBefore !== false) {
        <ate-button
          icon="add_column_left"
          [title]="t().addColumnBefore"
          [disabled]="!state().can.addColumnBefore"
          (buttonClick)="onCommand('addColumnBefore', $event)"></ate-button>
      }
      @if (tableBubbleMenuConfig().addColumnAfter !== false) {
        <ate-button
          icon="add_column_right"
          [title]="t().addColumnAfter"
          [disabled]="!state().can.addColumnAfter"
          (buttonClick)="onCommand('addColumnAfter', $event)"></ate-button>
      }
      @if (tableBubbleMenuConfig().deleteColumn !== false) {
        <ate-button
          icon="delete"
          [title]="t().deleteColumn"
          variant="danger"
          [disabled]="!state().can.deleteColumn"
          (buttonClick)="onCommand('deleteColumn', $event)"></ate-button>
      }
      @if (tableBubbleMenuConfig().separator !== false) {
        <ate-separator />
      }

      <!-- Cell actions -->
      @if (tableBubbleMenuConfig().toggleHeaderRow !== false) {
        <ate-button
          icon="toolbar"
          [title]="t().toggleHeaderRow"
          [active]="state().nodes.isTableHeaderRow"
          [disabled]="!state().can.toggleHeaderRow"
          (buttonClick)="onCommand('toggleHeaderRow', $event)"></ate-button>
      }
      @if (tableBubbleMenuConfig().toggleHeaderColumn !== false) {
        <ate-button
          icon="dock_to_right"
          [title]="t().toggleHeaderColumn"
          [active]="state().nodes.isTableHeaderColumn"
          [disabled]="!state().can.toggleHeaderColumn"
          (buttonClick)="onCommand('toggleHeaderColumn', $event)"></ate-button>
      }
      @if (
        tableBubbleMenuConfig().separator !== false && tableBubbleMenuConfig().deleteTable !== false
      ) {
        <ate-separator />
      }

      <!-- Table actions -->
      @if (tableBubbleMenuConfig().deleteTable !== false) {
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
export class AteTableBubbleMenuComponent extends AteBaseBubbleMenu {
  // Alias for template
  readonly t = this.i18nService.table;

  config = input<AteTableBubbleMenuConfig>(ATE_DEFAULT_TABLE_MENU_CONFIG);

  tableBubbleMenuConfig = computed(() => {
    const c = this.config();
    const result: Record<string, boolean> = {};
    ATE_TABLE_BUBBLE_MENU_KEYS.forEach(key => {
      result[key] = c[key] ?? true;
    });
    return result as Required<AteTableBubbleMenuConfig>;
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
    if (!ed) {
      return new DOMRect(0, 0, 0, 0);
    }

    const { from } = ed.state.selection;

    try {
      // 1. Direct ProseMirror approach: get DOM node at position
      const dom = ed.view.domAtPos(from).node;

      // Find closest table element
      const tableElement =
        dom instanceof HTMLElement
          ? dom.closest("table")
          : (dom.parentElement as HTMLElement)?.closest("table");

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
      const table = (element as Element)?.closest("table");
      if (table) {
        return table.getBoundingClientRect();
      }
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
