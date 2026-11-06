import { NodeSelection } from "@tiptap/pm/state";
import { AteStateCalculator } from "../../models/ate-editor-state.model";
import {
  selectionTableHasHiddenRows,
  selectionTouchesHiddenRows,
} from "../ate-table-sort.extension";

export const AteTableCalculator: AteStateCalculator = editor => {
  const isTable = editor.isActive("table");

  if (!isTable) {
    return {
      nodes: {
        isTable: false,
        isTableCell: false,
        isTableHeaderRow: false,
        isTableHeaderColumn: false,
      },
    };
  }

  const { selection } = editor.state;
  // Cell and row operations over rows a filter hides would change rows the user cannot see
  const visibleOnly = !selectionTouchesHiddenRows(editor.state);
  const noHiddenRows = !selectionTableHasHiddenRows(editor.state);

  return {
    nodes: {
      isTable: true,
      isTableNodeSelected:
        selection instanceof NodeSelection && selection.node.type.name === "table",
      isTableCell: editor.isActive("tableCell") || editor.isActive("tableHeader"),
      isTableHeaderRow: editor.isActive("tableHeader", { row: true }),
      isTableHeaderColumn: editor.isActive("tableHeader", { column: true }),
    },
    can: {
      addRowBefore: editor.can().addRowBefore(),
      addRowAfter: editor.can().addRowAfter(),
      deleteRow: visibleOnly && editor.can().deleteRow(),
      addColumnBefore: visibleOnly && editor.can().addColumnBefore(),
      addColumnAfter: visibleOnly && editor.can().addColumnAfter(),
      deleteColumn: noHiddenRows && editor.can().deleteColumn(),
      deleteTable: noHiddenRows && editor.can().deleteTable(),
      mergeCells: visibleOnly && editor.can().mergeCells(),
      splitCell: visibleOnly && editor.can().splitCell(),
      toggleHeaderRow: noHiddenRows && editor.can().toggleHeaderRow(),
      toggleHeaderColumn: noHiddenRows && editor.can().toggleHeaderColumn(),
    },
  };
};
