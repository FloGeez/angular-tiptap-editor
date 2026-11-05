import { getTextBetween, getTextSerializersFromSchema } from "@tiptap/core";
import {
  Fragment,
  Slice,
  type Node as PMNode,
  type ResolvedPos,
  type Schema,
} from "@tiptap/pm/model";
import { Selection, TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import { CellSelection, TableMap, fixTablesKey } from "@tiptap/pm/tables";
import {
  AddMarkStep,
  AddNodeMarkStep,
  AttrStep,
  DocAttrStep,
  RemoveMarkStep,
  RemoveNodeMarkStep,
  ReplaceAroundStep,
  ReplaceStep,
  type Step,
} from "@tiptap/pm/transform";

/** Rows hidden by a filter: table position to the indexes of its hidden rows */
export type AteHiddenRows = ReadonlyMap<number, ReadonlySet<number>>;

const HEADER_ROW = 0;
const COLLABORATION_META = "y-sync$";
const HISTORY_META = "history$";
const VISIBLE_ONLY_META = "ateTableVisibleOnly";
const CARRIED_META = ["addToHistory", "preventUpdate", "uiEvent", "paste"];

interface HiddenRow {
  from: number;
  to: number;
  node: PMNode;
}

interface CellTarget {
  pos: number;
  node: PMNode;
}

function isTable(node: PMNode | null | undefined): node is PMNode {
  return node?.type.spec["tableRole"] === "table";
}

function isCell(node: PMNode): boolean {
  const role = node.type.spec["tableRole"];
  return role === "cell" || role === "header_cell";
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

export function hasHiddenRows(hidden: AteHiddenRows): boolean {
  return Array.from(hidden.values()).some(rows => rows.size > 0);
}

function hiddenRowRanges(doc: PMNode, hidden: AteHiddenRows): HiddenRow[] {
  const ranges: HiddenRow[] = [];
  hidden.forEach((rows, tablePos) => {
    const table = doc.nodeAt(tablePos);
    if (!isTable(table) || rows.size === 0) {
      return;
    }
    let from = tablePos + 1;
    table.forEach((node, _offset, row) => {
      if (rows.has(row)) {
        ranges.push({ from, to: from + node.nodeSize, node });
      }
      from += node.nodeSize;
    });
  });
  return ranges;
}

function cellSelectionRect(selection: CellSelection) {
  const table = selection.$anchorCell.node(-1);
  const tableStart = selection.$anchorCell.start(-1);
  const map = TableMap.get(table);
  const rect = map.rectBetween(
    selection.$anchorCell.pos - tableStart,
    selection.$headCell.pos - tableStart
  );
  return { table, tablePos: tableStart - 1, tableStart, map, rect };
}

export function selectionTouchesHidden(selection: Selection, hidden: AteHiddenRows): boolean {
  if (!hasHiddenRows(hidden)) {
    return false;
  }
  if (selection instanceof CellSelection) {
    const { tablePos, rect } = cellSelectionRect(selection);
    const rows = hidden.get(tablePos);
    for (let row = rect.top; row < rect.bottom; row++) {
      if (rows?.has(row)) {
        return true;
      }
    }
    return false;
  }
  if (selection.empty) {
    return false;
  }
  const { from, to } = selection;
  return hiddenRowRanges(selection.$from.doc, hidden).some(
    range => range.from < to && range.to > from
  );
}

function emptyContent(cell: PMNode): Fragment {
  return cell.type.createAndFill()?.content ?? Fragment.empty;
}

function clearCell(tr: Transaction, pos: number, cell: PMNode): void {
  const empty = emptyContent(cell);
  if (!cell.content.eq(empty)) {
    tr.replace(
      tr.mapping.map(pos + 1),
      tr.mapping.map(pos + cell.nodeSize - 1),
      new Slice(empty, 0, 0)
    );
  }
}

function clearVisibleCells(tr: Transaction, selection: CellSelection, hidden: AteHiddenRows) {
  const { tablePos, tableStart, map } = cellSelectionRect(selection);
  const rows = hidden.get(tablePos);
  selection.forEachCell((cell, pos) => {
    if (!rows?.has(map.findCell(pos - tableStart).top)) {
      clearCell(tr, pos, cell);
    }
  });
}

function clearVisibleRangeInTable(
  tr: Transaction,
  table: PMNode,
  tablePos: number,
  rows: ReadonlySet<number>,
  from: number,
  to: number
): void {
  const deletions: [number, number, PMNode | null][] = [];
  let rowPos = tablePos + 1;
  table.forEach((row, _offset, index) => {
    const rowEnd = rowPos + row.nodeSize;
    if (!rows.has(index) && rowPos < to && rowEnd > from) {
      let cellPos = rowPos + 1;
      row.forEach(cell => {
        const start = cellPos + 1;
        const end = cellPos + cell.nodeSize - 1;
        if (from <= start && to >= end) {
          deletions.push([cellPos, cellPos + cell.nodeSize, cell]);
        } else if (from < end && to > start) {
          deletions.push([Math.max(from, start), Math.min(to, end), null]);
        }
        cellPos += cell.nodeSize;
      });
    }
    rowPos = rowEnd;
  });
  for (let index = deletions.length - 1; index >= 0; index--) {
    const [start, end, cell] = deletions[index];
    if (cell) {
      clearCell(tr, start, cell);
    } else {
      tr.delete(tr.mapping.map(start), tr.mapping.map(end));
    }
  }
}

/** Deletes a text selection, emptying the visible cells of the filtered tables it crosses */
function deleteRangeKeepingHidden(tr: Transaction, state: EditorState, hidden: AteHiddenRows) {
  const { from, to } = state.selection;
  const tables = Array.from(hidden, ([tablePos, rows]) => ({
    tablePos,
    rows,
    table: state.doc.nodeAt(tablePos),
  }))
    .filter(
      (entry): entry is { tablePos: number; rows: ReadonlySet<number>; table: PMNode } =>
        isTable(entry.table) &&
        entry.rows.size > 0 &&
        entry.tablePos < to &&
        entry.tablePos + entry.table.nodeSize > from
    )
    .sort((a, b) => b.tablePos - a.tablePos);
  let cursor = to;
  for (const { tablePos, rows, table } of tables) {
    const tableEnd = tablePos + table.nodeSize;
    if (tableEnd < cursor) {
      tr.delete(tableEnd, cursor);
    }
    clearVisibleRangeInTable(
      tr,
      table,
      tablePos,
      rows,
      Math.max(from, tablePos),
      Math.min(to, tableEnd)
    );
    cursor = tablePos;
  }
  if (from < cursor) {
    tr.delete(from, cursor);
  }
  tr.setSelection(Selection.near(tr.doc.resolve(tr.mapping.map(from, -1))));
}

/** Deletes the selection without touching hidden rows; null when it holds none */
export function deleteVisibleSelection(
  state: EditorState,
  hidden: AteHiddenRows
): Transaction | null {
  const { selection } = state;
  if (!selectionTouchesHidden(selection, hidden)) {
    return null;
  }
  const tr = state.tr;
  if (selection instanceof CellSelection) {
    clearVisibleCells(tr, selection, hidden);
  } else {
    deleteRangeKeepingHidden(tr, state, hidden);
  }
  return tr;
}

/** Where content typed over `selection` goes once `tr` has deleted its visible part */
function visibleInsertPoint(tr: Transaction, selection: Selection): number {
  return selection instanceof CellSelection
    ? Selection.near(tr.doc.resolve(tr.mapping.map(selection.$headCell.pos + 1)), 1).from
    : tr.selection.from;
}

export function insertTextOverVisibleSelection(
  state: EditorState,
  hidden: AteHiddenRows,
  text: string
): Transaction | null {
  const tr = deleteVisibleSelection(state, hidden);
  if (!tr) {
    return null;
  }
  const at = visibleInsertPoint(tr, state.selection);
  tr.insertText(text, at);
  return tr.setSelection(TextSelection.create(tr.doc, at + text.length));
}

function unwrapSingle(slice: Slice): Fragment {
  let { content, openStart, openEnd } = slice;
  while (
    content.childCount === 1 &&
    ((openStart > 0 && openEnd > 0) || isTable(content.child(0)))
  ) {
    openStart = Math.max(0, openStart - 1);
    openEnd = Math.max(0, openEnd - 1);
    content = content.child(0).content;
  }
  return content;
}

function asCellContent(schema: Schema, content: Fragment): Fragment {
  return content.firstChild?.isInline
    ? Fragment.from(schema.nodes["paragraph"].create(null, content))
    : content;
}

/** The cell contents of a pasted table, rows, or cells; null for other content */
function sliceGrid(slice: Slice): Fragment[][] | null {
  const content = unwrapSingle(slice);
  const first = content.firstChild;
  if (first?.type.spec["tableRole"] === "row") {
    const grid: Fragment[][] = [];
    content.forEach(row => {
      const cells: Fragment[] = [];
      row.forEach(cell => cells.push(cell.content));
      grid.push(cells);
    });
    return grid;
  }
  if (first && isCell(first)) {
    const cells: Fragment[] = [];
    content.forEach(cell => cells.push(cell.content));
    return [cells];
  }
  return null;
}

function fillCell(tr: Transaction, target: CellTarget, content: Fragment, mapFrom = 0): void {
  const fitted = content.size === 0 ? emptyContent(target.node) : content;
  const mapping = tr.mapping.slice(mapFrom);
  tr.replaceWith(
    mapping.map(target.pos + 1),
    mapping.map(target.pos + target.node.nodeSize - 1),
    fitted
  );
}

function visibleRowsBetween(
  rows: ReadonlySet<number> | undefined,
  start: number,
  end: number
): number[] {
  const visible: number[] = [];
  for (let row = start; row < end; row++) {
    if (!rows?.has(row)) {
      visible.push(row);
    }
  }
  return visible;
}

function pasteGridIntoCellSelection(
  tr: Transaction,
  selection: CellSelection,
  hidden: AteHiddenRows,
  grid: Fragment[][]
): void {
  const { table, tablePos, tableStart, map, rect } = cellSelectionRect(selection);
  const seen = new Set<number>();
  const targets: [CellTarget, Fragment][] = [];
  visibleRowsBetween(hidden.get(tablePos), rect.top, rect.bottom).forEach((row, rowIndex) => {
    const source = grid[rowIndex % grid.length];
    for (let col = rect.left; col < rect.right; col++) {
      const offset = map.map[row * map.width + col];
      const node = table.nodeAt(offset);
      if (node && !seen.has(offset)) {
        seen.add(offset);
        targets.push([
          { pos: tableStart + offset, node },
          source[(col - rect.left) % source.length],
        ]);
      }
    }
  });
  targets.forEach(([target, content]) => fillCell(tr, target, content));
}

/**
 * Fills the visible rows from the cell at (startRow, startCol) and adds rows for what is left
 * right after the last filled row. Returns the positions of the added rows.
 */
function pasteGridAtCell(
  tr: Transaction,
  schema: Schema,
  tablePos: number,
  rows: ReadonlySet<number>,
  startRow: number,
  startCol: number,
  grid: Fragment[][]
): number[] {
  const table = tr.doc.nodeAt(tablePos);
  if (!isTable(table)) {
    return [];
  }
  const map = TableMap.get(table);
  const mapFrom = tr.steps.length;
  const targetRows = visibleRowsBetween(rows, startRow, map.height).slice(0, grid.length);
  targetRows.forEach((row, rowIndex) => {
    grid[rowIndex].slice(0, map.width - startCol).forEach((content, offsetCol) => {
      const offset = map.map[row * map.width + startCol + offsetCol];
      const node = offset === undefined ? null : table.nodeAt(offset);
      if (node) {
        fillCell(tr, { pos: tablePos + 1 + offset, node }, content, mapFrom);
      }
    });
  });
  const overflow = grid.slice(targetRows.length);
  const currentPos = tr.mapping.slice(mapFrom).map(tablePos);
  const current = tr.doc.nodeAt(currentPos);
  const lastRow = targetRows.at(-1);
  if (overflow.length === 0 || !isTable(current) || lastRow === undefined) {
    return [];
  }
  const rowType = current.child(lastRow).type;
  const cellType = schema.nodes["tableCell"];
  const newRows = overflow.map(source =>
    rowType.create(
      null,
      Array.from({ length: map.width }, (_, col) => {
        const content = col >= startCol ? source[col - startCol] : undefined;
        return content?.size ? cellType.create(null, content) : cellType.createAndFill()!;
      })
    )
  );
  let insertAt = currentPos + 1;
  for (let index = 0; index <= lastRow; index++) {
    insertAt += current.child(index).nodeSize;
  }
  tr.insert(insertAt, newRows);
  const added: number[] = [];
  newRows.reduce((pos, row) => {
    added.push(pos);
    return pos + row.nodeSize;
  }, insertAt);
  return added;
}

function gridWidth(grid: Fragment[][]): number {
  return Math.max(0, ...grid.map(row => row.length));
}

export interface AteVisiblePaste {
  tr: Transaction;
  /** Positions in `tr.doc` of the rows the paste added, shown until the filters change */
  addedRows: number[];
}

export interface AteUnfilteredPaste {
  /** Position of the table whose filters must be cleared before the default paste */
  unfilterTable: number;
}

/**
 * Pastes into the visible cells only; null to leave the paste to the default handling, which
 * also takes a grid wider than the cells right of the cursor (the table grows). When such a
 * grid would also cover hidden rows, the filters of the table must go first.
 */
export function pasteIntoVisible(
  state: EditorState,
  hidden: AteHiddenRows,
  slice: Slice
): AteVisiblePaste | AteUnfilteredPaste | null {
  const { selection, schema } = state;
  if (!hasHiddenRows(hidden)) {
    return null;
  }
  if (selection instanceof CellSelection) {
    if (!selectionTouchesHidden(selection, hidden)) {
      return null;
    }
    const grid = sliceGrid(slice) ?? [[asCellContent(schema, unwrapSingle(slice))]];
    const tr = state.tr;
    pasteGridIntoCellSelection(tr, selection, hidden, grid);
    return { tr, addedRows: [] };
  }
  const grid = sliceGrid(slice);
  const crossing = selectionTouchesHidden(selection, hidden);
  if (!crossing && !grid) {
    return null;
  }
  const tr = (crossing && deleteVisibleSelection(state, hidden)) || state.tr;
  const $cursor = tr.doc.resolve(tr.selection.from);
  const depth = tableDepth($cursor);
  const tablePos = depth === null ? null : $cursor.before(depth);
  const originalPos = Array.from(hidden.keys()).find(pos => tr.mapping.map(pos) === tablePos);
  const rows = originalPos === undefined ? undefined : hidden.get(originalPos);
  if (grid && depth !== null && tablePos !== null && rows?.size && $cursor.depth > depth + 1) {
    const table = $cursor.node(depth);
    const map = TableMap.get(table);
    const cell = map.findCell($cursor.before(depth + 2) - $cursor.start(depth));
    if (gridWidth(grid) > map.width - cell.left) {
      const visibleTargets = visibleRowsBetween(rows, cell.top, cell.top + grid.length).length;
      return visibleTargets < grid.length && originalPos !== undefined
        ? { unfilterTable: originalPos }
        : null;
    }
    const addedRows = pasteGridAtCell(tr, schema, tablePos, rows, cell.top, cell.left, grid);
    return { tr, addedRows };
  }
  return crossing ? { tr: tr.replaceSelection(slice), addedRows: [] } : null;
}

function stripHiddenRows(
  fragment: Fragment,
  base: number,
  doc: PMNode,
  hidden: AteHiddenRows
): Fragment {
  const children: PMNode[] = [];
  fragment.forEach((node, offset) => {
    const docPos = base + offset;
    if (node.type.spec["tableRole"] === "row" && doc.nodeAt(docPos) === node) {
      const $row = doc.resolve(docPos + 1);
      const depth = tableDepth($row);
      if (depth !== null && hidden.get($row.before(depth))?.has($row.index(depth))) {
        return;
      }
    }
    children.push(
      node.isLeaf ? node : node.copy(stripHiddenRows(node.content, docPos + 1, doc, hidden))
    );
  });
  return Fragment.from(children);
}

/** Drops the hidden rows from a copied slice */
export function filterCopiedSlice(slice: Slice, state: EditorState, hidden: AteHiddenRows): Slice {
  if (!hasHiddenRows(hidden)) {
    return slice;
  }
  const { selection } = state;
  if (!(selection instanceof CellSelection)) {
    const base = selection.from - slice.openStart;
    return new Slice(
      stripHiddenRows(slice.content, base, state.doc, hidden),
      slice.openStart,
      slice.openEnd
    );
  }
  if (!selectionTouchesHidden(selection, hidden)) {
    return slice;
  }
  const { tablePos, rect } = cellSelectionRect(selection);
  const rows = hidden.get(tablePos) ?? new Set<number>();
  const first = slice.content.firstChild;
  if (first && isTable(first)) {
    const kept: PMNode[] = [];
    first.forEach((row, _offset, index) => {
      if (!rows.has(index)) {
        kept.push(row);
      }
    });
    return new Slice(
      Fragment.from(first.copy(Fragment.from(kept))),
      slice.openStart,
      slice.openEnd
    );
  }
  const kept: PMNode[] = [];
  slice.content.forEach((row, _offset, index) => {
    if (!rows.has(rect.top + index)) {
      kept.push(row);
    }
  });
  return new Slice(Fragment.from(kept), slice.openStart, slice.openEnd);
}

/** Whether a copy of the selection leaves rows out */
export function copyIsFiltered(selection: Selection, hidden: AteHiddenRows): boolean {
  return selectionTouchesHidden(selection, hidden);
}

export function sliceText(slice: Slice, schema: Schema): string {
  const container = schema.topNodeType.create(null, slice.content);
  return getTextBetween(
    container,
    { from: 0, to: container.content.size },
    { blockSeparator: "\n\n", textSerializers: getTextSerializersFromSchema(schema) }
  );
}

function replacesWholeDocument(tr: Transaction, before: PMNode): boolean {
  const step = tr.steps[0];
  return step instanceof ReplaceStep && step.from === 0 && step.to === before.content.size;
}

function isTrusted(tr: Transaction, before: PMNode): boolean {
  return (
    !!tr.getMeta(COLLABORATION_META) ||
    !!tr.getMeta(HISTORY_META) ||
    !!tr.getMeta(fixTablesKey) ||
    replacesWholeDocument(tr, before)
  );
}

function collectRows(doc: PMNode): PMNode[] {
  const rows: PMNode[] = [];
  doc.descendants(node => {
    if (node.type.spec["tableRole"] === "row") {
      rows.push(node);
      return false;
    }
    return true;
  });
  return rows;
}

function sameNode(a: PMNode, b: PMNode): boolean {
  return a === b || a.eq(b);
}

/** Whether `after` holds every cell of `row`, in order, cells added around them aside */
function keepsCells(row: PMNode, after: PMNode): boolean {
  let next = 0;
  for (let index = 0; index < row.childCount; index++) {
    while (next < after.childCount && !sameNode(after.child(next), row.child(index))) {
      next++;
    }
    if (next === after.childCount) {
      return false;
    }
    next++;
  }
  return true;
}

/**
 * Whether every hidden row is still in `tr.doc`: unchanged when `strict`, else with at least
 * its cells (a column added to the table)
 */
function keepsHiddenRows(
  tr: Transaction,
  before: PMNode,
  hidden: AteHiddenRows,
  strict: boolean
): boolean {
  const matches = (row: PMNode, candidate: PMNode | null | undefined) =>
    !!candidate &&
    candidate.type === row.type &&
    (strict ? sameNode(candidate, row) : keepsCells(row, candidate));
  const missing = hiddenRowRanges(before, hidden).filter(
    ({ from, node }) => !matches(node, tr.doc.nodeAt(tr.mapping.map(from, 1)))
  );
  if (missing.length === 0) {
    return true;
  }
  const remaining = collectRows(tr.doc);
  return missing.every(({ node }) => {
    const index = remaining.findIndex(row => matches(node, row));
    if (index < 0) {
      return false;
    }
    remaining.splice(index, 1);
    return true;
  });
}

/** Whether the filtered tables of `before` that are still in `tr.doc` keep a header row */
function keepsHeaderRows(tr: Transaction, before: PMNode, hidden: AteHiddenRows): boolean {
  return Array.from(hidden).every(([tablePos, rows]) => {
    if (!rows.size || !isTable(before.nodeAt(tablePos))) {
      return true;
    }
    const mapped = tr.mapping.mapResult(tablePos, 1);
    const table = mapped.deleted ? null : tr.doc.nodeAt(mapped.pos);
    const header = isTable(table) ? table.firstChild : null;
    if (!header) {
      return true;
    }
    let all = true;
    header.forEach(cell => {
      all &&= cell.type.spec["tableRole"] === "header_cell";
    });
    return all;
  });
}

/**
 * Refuses a change that would alter or remove rows a filter hides. While the selection touches
 * hidden rows, a hidden row must stay unchanged (deleting or merging rows over a filter); else
 * it must keep its cells (deleting a column, deleting the table, turning a column into headers)
 * and the table its header row. Undo, collaboration, table fixes and whole-document
 * replacements go through.
 */
export function protectsHiddenRows(
  tr: Transaction,
  state: EditorState,
  hidden: AteHiddenRows
): boolean {
  if (!tr.docChanged || !hasHiddenRows(hidden) || isTrusted(tr, state.doc)) {
    return true;
  }
  const strict = selectionTouchesHidden(state.selection, hidden);
  return keepsHiddenRows(tr, state.doc, hidden, strict) && keepsHeaderRows(tr, state.doc, hidden);
}

interface PosRange {
  from: number;
  to: number;
}

/** Whether a step only formats: marks, attributes, a node type changed in place */
function keepsPositions(step: Step): boolean {
  if (
    step instanceof AddMarkStep ||
    step instanceof RemoveMarkStep ||
    step instanceof AddNodeMarkStep ||
    step instanceof RemoveNodeMarkStep ||
    step instanceof AttrStep ||
    step instanceof DocAttrStep
  ) {
    return true;
  }
  if (
    !(step instanceof ReplaceAroundStep) ||
    !(step.toJSON() as { structure?: boolean }).structure
  ) {
    return false;
  }
  let same = true;
  step.getMap().forEach((oldStart, oldEnd, newStart, newEnd) => {
    same &&= oldEnd - oldStart === newEnd - newStart;
  });
  return same;
}

function stepRange(step: Step): PosRange | null {
  if (
    step instanceof AttrStep ||
    step instanceof AddNodeMarkStep ||
    step instanceof RemoveNodeMarkStep
  ) {
    return { from: step.pos, to: step.pos + 1 };
  }
  let range: PosRange | null = null;
  step.getMap().forEach((oldStart, oldEnd) => {
    range = {
      from: Math.min(range?.from ?? oldStart, oldStart),
      to: Math.max(range?.to ?? oldEnd, oldEnd),
    };
  });
  const from = (step as { from?: unknown }).from;
  const to = (step as { to?: unknown }).to;
  return typeof from === "number" && typeof to === "number" ? { from, to } : range;
}

/** The parts of a range outside the hidden rows */
function visibleParts(range: PosRange, hiddenRanges: PosRange[]): PosRange[] {
  const parts: PosRange[] = [];
  let start = range.from;
  hiddenRanges
    .filter(hidden => hidden.from < range.to && hidden.to > range.from)
    .forEach(hidden => {
      if (hidden.from > start) {
        parts.push({ from: start, to: hidden.from });
      }
      start = Math.max(start, hidden.to);
    });
  if (start < range.to) {
    parts.push({ from: start, to: range.to });
  }
  return parts;
}

/** The steps of a formatting step that leave the hidden rows alone */
function visibleSteps(step: Step, hiddenRanges: PosRange[]): Step[] {
  if (step instanceof AddMarkStep || step instanceof RemoveMarkStep) {
    const Kind = step instanceof AddMarkStep ? AddMarkStep : RemoveMarkStep;
    return visibleParts(step, hiddenRanges).map(part => new Kind(part.from, part.to, step.mark));
  }
  const range = stepRange(step);
  const touches =
    !!range && hiddenRanges.some(hidden => hidden.from < range.to && hidden.to > range.from);
  return touches ? [] : [step];
}

/** Whether a step turns a table, row or cell into another node type (a header toggle) */
function changesTableNodeType(step: Step, doc: PMNode): boolean {
  if (!(step instanceof ReplaceAroundStep)) {
    return false;
  }
  const before = doc.nodeAt(step.from);
  const after = step.slice.content.firstChild;
  return !!before?.type.spec["tableRole"] && !!after && after.type !== before.type;
}

/** Copies what the dispatcher of `from` asked for and marks `to` as already made visible-only */
function carryMeta(from: Transaction, to: Transaction): Transaction {
  CARRIED_META.forEach(key => {
    const value: unknown = from.getMeta(key);
    if (value !== undefined) {
      to.setMeta(key, value);
    }
  });
  if (from.scrolledIntoView) {
    to.scrollIntoView();
  }
  return to.setMeta(VISIBLE_ONLY_META, true);
}

/** Whether a transaction is the visible-only version of a refused one */
export function isVisibleOnly(tr: Transaction): boolean {
  return tr.getMeta(VISIBLE_ONLY_META) === true;
}

/** Where content goes when the selection spans hidden rows: the end of its visible part */
export function visibleEnd(selection: Selection): Selection {
  const { doc } = selection.$head;
  if (selection instanceof CellSelection) {
    const $cell = selection.$headCell;
    const cell = $cell.nodeAfter;
    return Selection.near(doc.resolve($cell.pos + (cell ? cell.nodeSize - 1 : 1)), -1);
  }
  return Selection.near(doc.resolve(selection.to), -1);
}

/**
 * The visible-only version of a change refused because it alters hidden rows, made while the
 * selection spans them:
 * - formatting (marks, alignment, cell attributes, block types) is applied to the visible rows
 * - content that replaced the whole selection replaces its visible part, as typing does
 * Null for anything else (row and cell structure changes and header toggles stay refused) and
 * for a change that is already visible-only.
 */
export function visibleOnlyTransaction(
  tr: Transaction,
  state: EditorState,
  hidden: AteHiddenRows
): Transaction | null {
  if (
    isVisibleOnly(tr) ||
    tr.steps.some((step, index) => changesTableNodeType(step, tr.docs[index]))
  ) {
    return null;
  }
  const hiddenRanges = hiddenRowRanges(state.doc, hidden)
    .map(({ from, to }) => ({ from, to }))
    .sort((a, b) => a.from - b.from);
  const next = state.tr;
  if (tr.steps.every(keepsPositions)) {
    tr.steps
      .flatMap(step => visibleSteps(step, hiddenRanges))
      .forEach(step => next.maybeStep(step));
    if (!next.docChanged) {
      return null;
    }
    try {
      next.setSelection(Selection.fromJSON(next.doc, tr.selection.toJSON()));
    } catch {
      next.setSelection(state.selection.map(next.doc, next.mapping));
    }
    if (tr.storedMarksSet) {
      next.setStoredMarks(tr.storedMarks);
    }
    return carryMeta(tr, next);
  }
  const first = tr.steps[0];
  const { from, to } = state.selection;
  if (
    !(first instanceof ReplaceStep) ||
    first.slice.size === 0 ||
    first.from > from ||
    first.to < to
  ) {
    return null;
  }
  const cleared = deleteVisibleSelection(state, hidden);
  if (!cleared) {
    return null;
  }
  const at = visibleInsertPoint(cleared, state.selection);
  const mapFrom = cleared.steps.length;
  cleared.replaceRange(at, at, first.slice);
  const end = cleared.mapping.slice(mapFrom).map(at);
  return carryMeta(tr, cleared.setSelection(Selection.near(cleared.doc.resolve(end), -1)));
}

function nextVisibleRow(
  rows: ReadonlySet<number>,
  from: number,
  dir: 1 | -1,
  height: number
): number | null {
  for (let row = from + dir; row >= HEADER_ROW && row < height; row += dir) {
    if (!rows.has(row)) {
      return row;
    }
  }
  return null;
}

function cellAround(doc: PMNode, pos: number): ResolvedPos | null {
  const $pos = doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth--) {
    if (isCell($pos.node(depth))) {
      return doc.resolve($pos.before(depth));
    }
  }
  return null;
}

/**
 * ArrowUp / ArrowDown (with Shift to extend) over hidden rows: the next visible row, out of
 * the table when none is left, or "blocked" (handled, nothing moves) when the selection cannot
 * extend further or nothing follows the table.
 * Null when no hidden row is next to the selection.
 */
export function verticalSkip(
  state: EditorState,
  hidden: AteHiddenRows,
  dir: 1 | -1,
  extend: boolean
): Transaction | "blocked" | null {
  const { selection } = state;
  const isCellSelection = selection instanceof CellSelection;
  if (!extend && (isCellSelection || !selection.empty)) {
    return null;
  }
  const $cell = isCellSelection ? selection.$headCell : cellAround(state.doc, selection.$head.pos);
  if (!$cell) {
    return null;
  }
  const table = $cell.node(-1);
  const tablePos = $cell.before(-1);
  const rows = hidden.get(tablePos);
  if (!rows?.size) {
    return null;
  }
  const map = TableMap.get(table);
  const rect = map.findCell($cell.pos - $cell.start(-1));
  const adjacent = dir > 0 ? rect.bottom : rect.top - 1;
  if (adjacent < HEADER_ROW || adjacent >= map.height || !rows.has(adjacent)) {
    return null;
  }
  const target = nextVisibleRow(rows, adjacent - dir, dir, map.height);
  if (target === null) {
    const outside = dir > 0 ? tablePos + table.nodeSize : tablePos;
    const next = extend ? null : Selection.findFrom(state.doc.resolve(outside), dir);
    return next ? state.tr.setSelection(next).scrollIntoView() : "blocked";
  }
  const $target = state.doc.resolve(tablePos + 1 + map.map[target * map.width + rect.left]);
  if (extend) {
    const $anchorCell = isCellSelection ? null : cellAround(state.doc, selection.$anchor.pos);
    const $anchor = isCellSelection
      ? selection.$anchorCell
      : $anchorCell && $anchorCell.before(-1) === tablePos
        ? $anchorCell
        : $cell;
    return state.tr.setSelection(new CellSelection($anchor, $target)).scrollIntoView();
  }
  return state.tr
    .setSelection(Selection.near(state.doc.resolve($target.pos + 1), 1))
    .scrollIntoView();
}

/**
 * Tab / Shift-Tab at the edge of a row next to hidden rows: the first cell of the next visible
 * row, or "append" when Tab leaves the last visible row and the table must grow.
 * Null when no hidden row is in the way.
 */
export function horizontalSkip(
  state: EditorState,
  hidden: AteHiddenRows,
  dir: 1 | -1
): Transaction | "append" | null {
  const $cell = cellAround(state.doc, state.selection.$head.pos);
  if (!$cell) {
    return null;
  }
  const table = $cell.node(-1);
  const tablePos = $cell.before(-1);
  const rows = hidden.get(tablePos);
  if (!rows?.size) {
    return null;
  }
  const map = TableMap.get(table);
  const rect = map.findCell($cell.pos - $cell.start(-1));
  const atRowEdge = dir > 0 ? rect.right >= map.width : rect.left <= 0;
  const adjacent = dir > 0 ? rect.bottom : rect.top - 1;
  if (!atRowEdge || adjacent < HEADER_ROW || adjacent >= map.height || !rows.has(adjacent)) {
    return null;
  }
  const target = nextVisibleRow(rows, adjacent - dir, dir, map.height);
  if (target === null) {
    return dir > 0 ? "append" : null;
  }
  const cellPos = tablePos + 1 + map.map[target * map.width + (dir > 0 ? 0 : map.width - 1)];
  const cell = state.doc.nodeAt(cellPos);
  if (!cell) {
    return null;
  }
  return state.tr
    .setSelection(
      TextSelection.between(
        state.doc.resolve(cellPos + 1),
        state.doc.resolve(cellPos + cell.nodeSize - 1)
      )
    )
    .scrollIntoView();
}
