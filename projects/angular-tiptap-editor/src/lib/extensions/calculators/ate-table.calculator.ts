import { NodeSelection } from "@tiptap/pm/state";
import { StateCalculator } from "../../models/ate-editor-state.model";

export const TableCalculator: StateCalculator = editor => {
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
      deleteRow: editor.can().deleteRow(),
      addColumnBefore: editor.can().addColumnBefore(),
      addColumnAfter: editor.can().addColumnAfter(),
      deleteColumn: editor.can().deleteColumn(),
      deleteTable: editor.can().deleteTable(),
      mergeCells: editor.can().mergeCells(),
      splitCell: editor.can().splitCell(),
      toggleHeaderRow: editor.can().toggleHeaderRow(),
      toggleHeaderColumn: editor.can().toggleHeaderColumn(),
    },
  };
};
