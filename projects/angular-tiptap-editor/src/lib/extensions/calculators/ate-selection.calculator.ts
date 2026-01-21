import { TextSelection, NodeSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import { AteStateCalculator } from "../../models/ate-editor-state.model";

export const AteSelectionCalculator: AteStateCalculator = editor => {
  const { selection } = editor.state;
  const { from, to } = selection;

  let selectionType: "text" | "node" | "cell" | "none" = "none";
  if (selection instanceof TextSelection) selectionType = "text";
  else if (selection instanceof NodeSelection) selectionType = "node";
  else if (selection instanceof CellSelection) selectionType = "cell";

  let isSingleCell = false;
  if (selection instanceof CellSelection) {
    isSingleCell = selection.$anchorCell.pos === selection.$headCell.pos;
  }

  return {
    isFocused: editor.view.hasFocus(),
    isEditable: editor.isEditable,
    selection: {
      type: selectionType,
      from,
      to,
      empty: selection.empty || (selectionType === "text" && from === to),
      isSingleCell: isSingleCell,
    },
    nodes: {
      activeNodeName: editor.state.doc.nodeAt(editor.state.selection.$head.pos)?.type.name || null,
    },
  };
};
