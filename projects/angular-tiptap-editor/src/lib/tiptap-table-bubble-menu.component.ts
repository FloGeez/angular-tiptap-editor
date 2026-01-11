import {
  Component,
  input,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { type Editor } from "@tiptap/core";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapSeparatorComponent } from "./tiptap-separator.component";
import { TiptapBaseBubbleMenu } from "./base/tiptap-base-bubble-menu";

@Component({
  selector: "tiptap-table-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TiptapButtonComponent, TiptapSeparatorComponent],
  template: `
    <div #menuRef class="bubble-menu">
      <!-- Actions de lignes -->
      @if (config().addRowBefore !== false) {
      <tiptap-button
        icon="add_row_above"
        [title]="t().addRowBefore"
        [disabled]="!state().can.addRowBefore"
        (onClick)="onCommand('addRowBefore', $event)"
      ></tiptap-button>
      } @if (config().addRowAfter !== false) {
      <tiptap-button
        icon="add_row_below"
        [title]="t().addRowAfter"
        [disabled]="!state().can.addRowAfter"
        (onClick)="onCommand('addRowAfter', $event)"
      ></tiptap-button>
      } @if (config().deleteRow !== false) {
      <tiptap-button
        icon="delete"
        [title]="t().deleteRow"
        variant="danger"
        [disabled]="!state().can.deleteRow"
        (onClick)="onCommand('deleteRow', $event)"
      ></tiptap-button>
      } @if (config().separator !== false) {
      <tiptap-separator></tiptap-separator>
      }

      <!-- Actions de colonnes -->
      @if (config().addColumnBefore !== false) {
      <tiptap-button
        icon="add_column_left"
        [title]="t().addColumnBefore"
        [disabled]="!state().can.addColumnBefore"
        (onClick)="onCommand('addColumnBefore', $event)"
      ></tiptap-button>
      } @if (config().addColumnAfter !== false) {
      <tiptap-button
        icon="add_column_right"
        [title]="t().addColumnAfter"
        [disabled]="!state().can.addColumnAfter"
        (onClick)="onCommand('addColumnAfter', $event)"
      ></tiptap-button>
      } @if (config().deleteColumn !== false) {
      <tiptap-button
        icon="delete"
        [title]="t().deleteColumn"
        variant="danger"
        [disabled]="!state().can.deleteColumn"
        (onClick)="onCommand('deleteColumn', $event)"
      ></tiptap-button>
      } @if (config().separator !== false) {
      <tiptap-separator></tiptap-separator>
      }

      <!-- Actions de cellules -->
      @if (config().toggleHeaderRow !== false) {
      <tiptap-button
        icon="toolbar"
        [title]="t().toggleHeaderRow"
        [active]="state().nodes.isTableHeaderRow"
        [disabled]="!state().can.toggleHeaderRow"
        (onClick)="onCommand('toggleHeaderRow', $event)"
      ></tiptap-button>
      } @if (config().toggleHeaderColumn !== false) {
      <tiptap-button
        icon="dock_to_right"
        [title]="t().toggleHeaderColumn"
        [active]="state().nodes.isTableHeaderColumn"
        [disabled]="!state().can.toggleHeaderColumn"
        (onClick)="onCommand('toggleHeaderColumn', $event)"
      ></tiptap-button>
      } @if (config().separator !== false && config().deleteTable !== false) {
      <tiptap-separator></tiptap-separator>
      }

      <!-- Actions de table -->
      @if (config().deleteTable !== false) {
      <tiptap-button
        icon="delete_forever"
        [title]="t().deleteTable"
        variant="danger"
        [disabled]="!state().can.deleteTable"
        (onClick)="onCommand('deleteTable', $event)"
      ></tiptap-button>
      }
    </div>
  `,
})
export class TiptapTableBubbleMenuComponent extends TiptapBaseBubbleMenu {
  // Alias pour le template
  readonly t = this.i18nService.table;

  config = input<any>({
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

    // Ne montrer le menu de table que si :
    // 1. On est dans une table (nodes.isTable)
    // 2. L'éditeur est éditable et a le focus
    // 3. La sélection est VIDE (curseur simple) OU c'est le nœud Table qui est sélectionné
    // 4. Ce n'est pas une sélection de cellules (priorité au menu de cellules)
    return (
      nodes.isTable &&
      isEditable &&
      isFocused &&
      (selection.empty || nodes.isTableNodeSelected) &&
      selection.type !== 'cell'
    );
  }

  override getSelectionRect(): DOMRect {
    const ed = this.editor();
    if (!ed) return new DOMRect(0, 0, 0, 0);

    const { from } = ed.state.selection;

    try {
      // 1. Approche directe ProseMirror : obtenir le nœud DOM à la position
      const dom = ed.view.domAtPos(from).node;

      // On remonte le DOM pour trouver la table la plus proche
      const tableElement = dom instanceof HTMLElement
        ? dom.closest('table')
        : dom.parentElement?.closest('table');

      if (tableElement) {
        return tableElement.getBoundingClientRect();
      }
    } catch (e) {
      // Fallback en cas d'erreur
    }

    // 2. Fallback via coordonnées si le DOM direct échoue
    const coords = ed.view.coordsAtPos(from);
    if (coords) {
      // Rechercher l'élément table à ces coordonnées
      const element = document.elementFromPoint(coords.left, coords.top);
      const table = element?.closest('table');
      if (table) return table.getBoundingClientRect();
    }

    // 3. Fallback ultime si la sélection est ambiguë
    const activeTable = ed.view.dom.querySelector('table.selected, table:has(.selected), table:has(.selected-cell), table:has(.selected-node)');
    if (activeTable) {
      return activeTable.getBoundingClientRect();
    }

    return new DOMRect(-9999, -9999, 0, 0);
  }

  protected override executeCommand(editor: Editor, command: string): void {
    this.editorCommands.execute(editor, command);
  }
}
