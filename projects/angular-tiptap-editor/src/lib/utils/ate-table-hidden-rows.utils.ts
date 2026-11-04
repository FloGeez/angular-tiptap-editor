import { type Node as PMNode, type ResolvedPos } from "@tiptap/pm/model";
import { type Selection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";

/** Rows hidden by a filter: table position to the indexes of its hidden rows */
export type AteHiddenRows = ReadonlyMap<number, ReadonlySet<number>>;

function isTable(node: PMNode | null | undefined): node is PMNode {
  return node?.type.spec["tableRole"] === "table";
}

function tableDepth($pos: ResolvedPos): number | null {
  for (let depth = $pos.depth; depth >= 0; depth--) {
    if (isTable($pos.node(depth))) {
      return depth;
    }
  }
  return null;
}

/** The index of the row holding `pos` in the table at `tablePos` */
export function rowIndexIn(doc: PMNode, tablePos: number, pos: number): number | null {
  const table = doc.nodeAt(tablePos);
  if (!isTable(table) || pos <= tablePos || pos >= tablePos + table.nodeSize) {
    return null;
  }
  const $pos = doc.resolve(pos);
  const depth = tableDepth($pos);
  if (depth === null || $pos.before(depth) !== tablePos || $pos.depth <= depth) {
    return null;
  }
  return $pos.index(depth);
}

/** The rows of the table at `tablePos` holding the ends of the selection */
export function selectionRows(selection: Selection, tablePos: number): Set<number> {
  const doc = selection.$head.doc;
  const points =
    selection instanceof CellSelection
      ? [selection.$anchorCell.pos + 1, selection.$headCell.pos + 1]
      : [selection.$anchor.pos, selection.$head.pos];
  const rows = new Set<number>();
  points.forEach(point => {
    const row = rowIndexIn(doc, tablePos, point);
    if (row !== null) {
      rows.add(row);
    }
  });
  return rows;
}
