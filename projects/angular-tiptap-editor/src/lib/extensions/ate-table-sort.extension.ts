import { isDevMode } from "@angular/core";
import { Extension, type Editor } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { Fragment, type Node as PMNode, type ResolvedPos } from "@tiptap/pm/model";
import {
  Plugin,
  PluginKey,
  Selection,
  TextSelection,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";
import { CellSelection, TableMap, addRowAfter, goToNextCell } from "@tiptap/pm/tables";
import { ReplaceStep } from "@tiptap/pm/transform";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import {
  parseTableFilterDay,
  summarizeTableColumn,
  tableFilterMatches,
  tableSortOrder,
  type AteTableColumnSummary,
  type AteTableDecimalSeparator,
  type AteTableFilter,
  type AteTableSortDirection,
} from "../utils/ate-table-values.utils";
import {
  copyIsFiltered,
  deleteVisibleSelection,
  filterCopiedSlice,
  hasHiddenRows,
  horizontalSkip,
  insertTextOverVisibleSelection,
  pasteIntoVisible,
  protectsHiddenRows,
  rowIndexIn,
  selectionRows,
  selectionTouchesHidden,
  sliceText,
  verticalSkip,
  type AteHiddenRows,
} from "../utils/ate-table-hidden-rows.utils";
import { ATE_BLOCK_DRAG_MIME } from "./ate-block-controls.extension";

export type { AteTableSortDirection, AteTableFilter } from "../utils/ate-table-values.utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableSort: {
      /**
       * Sorts the body rows of a table by one of its columns. The header row stays first,
       * empty cells go last and equal cells keep their order.
       * @param column Column index, from 0
       * @param direction "asc" or "desc"
       * @param tablePos Position of the table; defaults to the table holding the selection
       */
      sortTableColumn: (
        column: number,
        direction: AteTableSortDirection,
        tablePos?: number
      ) => ReturnType;
      /**
       * Shows only the body rows whose cell in `column` passes the filter (`null` removes the
       * filter of that column). Filters of different columns combine. The filter is not part
       * of the document: it is not saved, exported or shared.
       * @param tablePos Position of the table; defaults to the table holding the selection
       */
      setTableColumnFilter: (
        column: number,
        filter: AteTableFilter | null,
        tablePos?: number
      ) => ReturnType;
      /**
       * Removes the filters of a table.
       * @param tablePos Position of the table; defaults to the table holding the selection
       */
      clearTableFilters: (tablePos?: number) => ReturnType;
      /** Removes the filters of the table holding `pos` when they hide the row at `pos` */
      revealTableRow: (pos: number) => ReturnType;
    };
  }
}

export interface AteTableSortLabels {
  columnMenu: string;
  sortUnavailable: string;
  columnFiltered: string;
  filterShowing: string;
  filterNoMatch: string;
  clearFilters: string;
}

export interface AteTableSortOptions {
  labels: () => AteTableSortLabels;
  /** Decimal separator of the editor language, for numbers no other value in the column settles */
  decimalSeparator: () => AteTableDecimalSeparator;
}

export interface AteTableColumnTarget {
  tablePos: number;
  col: number;
}

interface AteTrackedTable {
  width: number;
  sort: { col: number; dir: AteTableSortDirection } | null;
  filters: ReadonlyMap<number, AteTableFilter>;
}

export interface AteTableSortState {
  tables: ReadonlyMap<number, AteTrackedTable>;
  menu: AteTableColumnTarget | null;
  /** Whether the rows holding the selection stay visible; off right after a filter changes */
  sticky: boolean;
  /** Start positions of rows a paste added, shown until the filters change */
  pinned: readonly number[];
  decimal: AteTableDecimalSeparator;
  hidden: AteHiddenRows;
  decorations: DecorationSet;
}

type AteTableSortTracking = Pick<AteTableSortState, "tables" | "menu" | "sticky" | "pinned">;

type AteTableSortAction =
  | { type: "sorted"; tablePos: number; col: number; dir: AteTableSortDirection }
  | { type: "setFilter"; tablePos: number; col: number; filter: AteTableFilter | null }
  | { type: "clearColumn"; tablePos: number; col: number }
  | { type: "clearFilters"; tablePos: number }
  | { type: "reveal"; pos: number }
  | { type: "pin"; rows: number[] }
  | { type: "toggleMenu"; tablePos: number; col: number }
  | { type: "closeMenu" }
  | { type: "refresh" };

/** Column menu data: the column summary, its filter and how many rows it shows */
export interface AteTableColumnFilterInfo extends AteTableColumnSummary {
  filter: AteTableFilter | null;
  visible: number;
  total: number;
}

export const ateTableSortKey = new PluginKey<AteTableSortState>("ateTableSort");

/** Set on the wrapper of each column button, with the column index */
export const ATE_TABLE_COLUMN_ATTR = "data-ate-table-column";

/** Set on the rows a filter hides */
export const ATE_TABLE_HIDDEN_ROW_ATTR = "data-ate-table-hidden";

const HEADER_ROW = 0;

const CHEVRON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function isTable(node: PMNode | null | undefined): node is PMNode {
  return node?.type.spec["tableRole"] === "table";
}

export function tableAt(doc: PMNode, pos: number): PMNode | null {
  const node = pos >= 0 && pos <= doc.content.size ? doc.nodeAt(pos) : null;
  return isTable(node) ? node : null;
}

function tablePosAround($pos: ResolvedPos): number | null {
  for (let depth = $pos.depth; depth > 0; depth--) {
    if (isTable($pos.node(depth))) {
      return $pos.before(depth);
    }
  }
  return null;
}

/** The first row is the header when every cell in it is a header cell */
export function hasHeaderRow(table: PMNode): boolean {
  const first = table.firstChild;
  if (!first || first.childCount === 0) {
    return false;
  }
  let header = true;
  first.forEach(cell => {
    header &&= cell.type.spec["tableRole"] === "header_cell";
  });
  return header;
}

export function cellText(table: PMNode, map: TableMap, row: number, col: number): string {
  const offset = map.map[row * map.width + col];
  return (offset === undefined ? "" : (table.nodeAt(offset)?.textContent ?? "")).trim();
}

function bodyTexts(table: PMNode, map: TableMap, col: number): string[] {
  const texts: string[] = [];
  for (let row = HEADER_ROW + 1; row < map.height; row++) {
    texts.push(cellText(table, map, row, col));
  }
  return texts;
}

/** One entry per header cell, at the first column it covers */
function headerColumns(map: TableMap): number[] {
  const columns: number[] = [];
  for (let col = 0; col < map.width; col++) {
    if (col === 0 || map.map[col] !== map.map[col - 1]) {
      columns.push(col);
    }
  }
  return columns;
}

/** Whether a cell of the table spans several rows */
export function spansRows(table: PMNode): boolean {
  let spans = false;
  table.forEach(row =>
    row.forEach(cell => {
      spans ||= Number(cell.attrs["rowspan"] ?? 1) > 1;
    })
  );
  return spans;
}

/**
 * Whether the rows of a table can be reordered or filtered: a header row, a body and no cell
 * spanning rows
 */
export function canSortTable(table: PMNode): boolean {
  return hasHeaderRow(table) && table.childCount > HEADER_ROW + 1 && !spansRows(table);
}

function sortedBodyRows(
  table: PMNode,
  col: number,
  dir: AteTableSortDirection,
  decimal: AteTableDecimalSeparator
): PMNode[] | null {
  const map = TableMap.get(table);
  if (col < 0 || col >= map.width || !canSortTable(table)) {
    return null;
  }
  const body: PMNode[] = [];
  for (let row = HEADER_ROW + 1; row < map.height; row++) {
    body.push(table.child(row));
  }
  return tableSortOrder(bodyTexts(table, map, col), dir, decimal).map(index => body[index]);
}

const sortedByCache = new WeakMap<PMNode, Map<string, boolean>>();

function isSortedBy(
  table: PMNode,
  col: number,
  dir: AteTableSortDirection,
  decimal: AteTableDecimalSeparator
): boolean {
  const key = `${col}:${dir}:${decimal}`;
  const cached = sortedByCache.get(table)?.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const rows = sortedBodyRows(table, col, dir, decimal);
  const sorted = !!rows && rows.every((row, index) => row === table.child(index + HEADER_ROW + 1));
  const entries = sortedByCache.get(table) ?? new Map<string, boolean>();
  entries.set(key, sorted);
  sortedByCache.set(table, entries);
  return sorted;
}

/** Offsets inside the table of the rows that move, and those rows in their new order */
function changedRowRange(table: PMNode, rows: PMNode[]) {
  const current = (index: number) => table.child(index + HEADER_ROW + 1);
  let first = 0;
  while (first < rows.length && rows[first] === current(first)) {
    first++;
  }
  if (first === rows.length) {
    return null;
  }
  let last = rows.length - 1;
  while (rows[last] === current(last)) {
    last--;
  }
  let from = 0;
  for (let index = 0; index < first + HEADER_ROW + 1; index++) {
    from += table.child(index).nodeSize;
  }
  let to = from;
  for (let index = first; index <= last; index++) {
    to += current(index).nodeSize;
  }
  return { from, to, rows: Fragment.from(rows.slice(first, last + 1)) };
}

const failingRowsCache = new WeakMap<
  PMNode,
  WeakMap<ReadonlyMap<number, AteTableFilter>, Map<AteTableDecimalSeparator, ReadonlySet<number>>>
>();

/** Body rows (indexes in the table) that fail a filter, except the `sticky` ones */
function hiddenRowsOf(
  table: PMNode,
  filters: ReadonlyMap<number, AteTableFilter>,
  sticky: ReadonlySet<number>,
  decimal: AteTableDecimalSeparator
): ReadonlySet<number> {
  const failing = failingRowsOf(table, filters, decimal);
  if (!Array.from(sticky).some(row => failing.has(row))) {
    return failing;
  }
  return new Set(Array.from(failing).filter(row => !sticky.has(row)));
}

function failingRowsOf(
  table: PMNode,
  filters: ReadonlyMap<number, AteTableFilter>,
  decimal: AteTableDecimalSeparator
): ReadonlySet<number> {
  const byFilters = failingRowsCache.get(table) ?? new WeakMap();
  failingRowsCache.set(table, byFilters);
  const byDecimal =
    byFilters.get(filters) ?? new Map<AteTableDecimalSeparator, ReadonlySet<number>>();
  byFilters.set(filters, byDecimal);
  const cached = byDecimal.get(decimal);
  if (cached) {
    return cached;
  }
  const hidden = new Set<number>();
  byDecimal.set(decimal, hidden);
  if (filters.size === 0 || !canSortTable(table)) {
    return hidden;
  }
  const map = TableMap.get(table);
  const passes = Array.from(filters)
    .filter(([col]) => col < map.width)
    .map(([col, filter]) => tableFilterMatches(bodyTexts(table, map, col), filter, decimal));
  for (let row = HEADER_ROW + 1; row < map.height; row++) {
    if (passes.some(pass => !pass[row - HEADER_ROW - 1])) {
      hidden.add(row);
    }
  }
  return hidden;
}

/** The sort direction a column shows, only while the table is still in that order */
export function columnSortDirection(
  state: EditorState,
  tablePos: number,
  col: number
): AteTableSortDirection | null {
  const plugin = ateTableSortKey.getState(state);
  const sort = plugin?.tables.get(tablePos)?.sort;
  const table = tableAt(state.doc, tablePos);
  return plugin &&
    sort &&
    table &&
    sort.col === col &&
    isSortedBy(table, col, sort.dir, plugin.decimal)
    ? sort.dir
    : null;
}

/** The filter of a column with the values the menu offers; null when the table is gone */
export function columnFilterInfo(
  state: EditorState,
  target: AteTableColumnTarget
): AteTableColumnFilterInfo | null {
  const plugin = ateTableSortKey.getState(state);
  const table = tableAt(state.doc, target.tablePos);
  if (!plugin || !table) {
    return null;
  }
  const map = TableMap.get(table);
  const texts = bodyTexts(table, map, target.col);
  return {
    ...summarizeTableColumn(texts, plugin.decimal),
    filter: plugin.tables.get(target.tablePos)?.filters.get(target.col) ?? null,
    visible: texts.length - (plugin.hidden.get(target.tablePos)?.size ?? 0),
    total: texts.length,
  };
}

export function openTableColumnMenu(state: EditorState): AteTableColumnTarget | null {
  return ateTableSortKey.getState(state)?.menu ?? null;
}

export function toggleTableColumnMenu(view: EditorView, target: AteTableColumnTarget): void {
  view.dispatch(view.state.tr.setMeta(ateTableSortKey, { type: "toggleMenu", ...target }));
}

export function closeTableColumnMenu(view: EditorView): void {
  if (openTableColumnMenu(view.state)) {
    view.dispatch(view.state.tr.setMeta(ateTableSortKey, { type: "closeMenu" }));
  }
}

/** Removes the filter of a column and its sort arrow */
export function clearTableColumn(view: EditorView, target: AteTableColumnTarget): void {
  view.dispatch(view.state.tr.setMeta(ateTableSortKey, { type: "clearColumn", ...target }));
}

/** Redraws the column buttons, after the labels or the editable state changed */
export function refreshTableSort(editor: Editor): void {
  if (!editor.isDestroyed && ateTableSortKey.getState(editor.state)) {
    editor.view.dispatch(editor.state.tr.setMeta(ateTableSortKey, { type: "refresh" }));
  }
}

export function columnButton(view: EditorView, target: AteTableColumnTarget): HTMLElement | null {
  const tableDom = view.nodeDOM(target.tablePos);
  const root = tableDom instanceof HTMLElement ? tableDom : null;
  return (
    root?.querySelector<HTMLElement>(`[${ATE_TABLE_COLUMN_ATTR}="${target.col}"] button`) ?? null
  );
}

function hiddenOf(state: EditorState): AteHiddenRows {
  return ateTableSortKey.getState(state)?.hidden ?? new Map<number, ReadonlySet<number>>();
}

function actionsOf(tr: Transaction): AteTableSortAction[] {
  const meta = tr.getMeta(ateTableSortKey) as AteTableSortAction | AteTableSortAction[] | undefined;
  return meta === undefined ? [] : Array.isArray(meta) ? meta : [meta];
}

/** Several commands of one chain can each add an action to the same transaction */
function addAction(tr: Transaction, action: AteTableSortAction): void {
  tr.setMeta(ateTableSortKey, [...actionsOf(tr), action]);
}

function fillLabel(template: string, visible: number, total: number): string {
  return template.replace("{visible}", String(visible)).replace("{total}", String(total));
}

interface AteColumnWidget {
  col: number;
  label: string;
  sortDir: AteTableSortDirection | null;
  filtered: boolean;
  expanded: boolean;
  editable: boolean;
  labels: AteTableSortLabels;
}

function columnWidget(widget: AteColumnWidget) {
  return (view: EditorView, getPos: () => number | undefined): HTMLElement => {
    const wrap = document.createElement("span");
    wrap.className = "ate-table-column";
    wrap.contentEditable = "false";
    wrap.setAttribute(ATE_TABLE_COLUMN_ATTR, String(widget.col));
    if (widget.sortDir) {
      const arrow = document.createElement("span");
      arrow.className = "ate-table-column-sort";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = widget.sortDir === "asc" ? "▲" : "▼";
      wrap.append(arrow);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = widget.filtered
      ? "ate-table-column-button is-filtered"
      : "ate-table-column-button";
    button.innerHTML = CHEVRON_SVG;
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", String(widget.expanded));
    const name = widget.label
      ? `${widget.labels.columnMenu}: ${widget.label}`
      : widget.labels.columnMenu;
    button.setAttribute(
      "aria-label",
      widget.filtered ? `${name} (${widget.labels.columnFiltered})` : name
    );
    if (widget.editable) {
      button.title = widget.labels.columnMenu;
    } else {
      button.setAttribute("aria-disabled", "true");
      button.title = widget.labels.sortUnavailable;
    }
    button.addEventListener("mousedown", event => event.preventDefault());
    button.addEventListener("click", event => {
      event.preventDefault();
      const pos = getPos();
      const tablePos = pos === undefined ? null : tablePosAround(view.state.doc.resolve(pos));
      if (view.editable && tablePos !== null) {
        toggleTableColumnMenu(view, { tablePos, col: widget.col });
      }
    });
    wrap.append(button);
    return wrap;
  };
}

function statusText(visible: number, total: number, labels: AteTableSortLabels): string {
  return visible === 0 ? labels.filterNoMatch : fillLabel(labels.filterShowing, visible, total);
}

/** Updates the text of the status bars in place, so the live region announces the new count */
function syncStatusBars(view: EditorView, labels: AteTableSortLabels): void {
  const plugin = ateTableSortKey.getState(view.state);
  plugin?.tables.forEach((tracked, tablePos) => {
    const table = tableAt(view.state.doc, tablePos);
    const dom = table && tracked.filters.size ? view.nodeDOM(tablePos) : null;
    const bar = dom instanceof HTMLElement ? dom.previousElementSibling : null;
    const summary = bar?.classList.contains("ate-table-filter-status")
      ? bar.querySelector(".ate-table-filter-summary")
      : null;
    if (!bar || !summary || !table) {
      return;
    }
    const total = table.childCount - HEADER_ROW - 1;
    const visible = total - (plugin.hidden.get(tablePos)?.size ?? 0);
    const text = statusText(visible, total, labels);
    if (summary.textContent !== text) {
      summary.textContent = text;
    }
    bar.classList.toggle("is-empty", visible === 0);
  });
}

function statusWidget(visible: number, total: number, labels: AteTableSortLabels) {
  return (view: EditorView, getPos: () => number | undefined): HTMLElement => {
    const bar = document.createElement("div");
    bar.className = visible === 0 ? "ate-table-filter-status is-empty" : "ate-table-filter-status";
    bar.contentEditable = "false";
    bar.setAttribute("role", "status");
    const summary = document.createElement("span");
    summary.className = "ate-table-filter-summary";
    summary.textContent = statusText(visible, total, labels);
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "ate-table-filter-clear";
    clear.textContent = labels.clearFilters;
    clear.addEventListener("mousedown", event => event.preventDefault());
    clear.addEventListener("click", event => {
      event.preventDefault();
      const pos = getPos();
      const table = pos === undefined ? null : tableAt(view.state.doc, pos);
      if (table && pos !== undefined) {
        view.dispatch(
          view.state.tr.setMeta(ateTableSortKey, { type: "clearFilters", tablePos: pos })
        );
      }
    });
    bar.append(summary, " · ", clear);
    return bar;
  };
}

function tableDecorations(
  table: PMNode,
  tablePos: number,
  tracked: AteTrackedTable | undefined,
  hidden: ReadonlySet<number>,
  menu: AteTableColumnTarget | null,
  editable: boolean,
  labels: AteTableSortLabels,
  decimal: AteTableDecimalSeparator
): Decoration[] {
  if (!hasHeaderRow(table)) {
    return [];
  }
  const map = TableMap.get(table);
  const sort = tracked?.sort;
  const sortDir = sort && isSortedBy(table, sort.col, sort.dir, decimal) ? sort.dir : null;
  const decorations = headerColumns(map).flatMap(col => {
    const cellPos = tablePos + 1 + map.map[HEADER_ROW * map.width + col];
    const cell = table.nodeAt(cellPos - tablePos - 1)!;
    const label = cell.textContent.trim();
    const dir = sort?.col === col ? sortDir : null;
    const filtered = !!tracked?.filters.has(col);
    const expanded = menu?.tablePos === tablePos && menu.col === col;
    const widget = Decoration.widget(
      cellPos + 1,
      columnWidget({ col, label, sortDir: dir, filtered, expanded, editable, labels }),
      {
        side: -1,
        ignoreSelection: true,
        stopEvent: () => true,
        key: [
          "ate-table-column",
          col,
          dir,
          filtered,
          expanded,
          editable,
          label,
          labels.columnMenu,
          labels.sortUnavailable,
          labels.columnFiltered,
        ].join(":"),
      }
    );
    return dir
      ? [
          widget,
          Decoration.node(cellPos, cellPos + cell.nodeSize, {
            "aria-sort": dir === "asc" ? "ascending" : "descending",
          }),
        ]
      : [widget];
  });
  let rowPos = tablePos + 1;
  table.forEach((row, _offset, index) => {
    if (hidden.has(index)) {
      decorations.push(
        Decoration.node(rowPos, rowPos + row.nodeSize, {
          class: "ate-table-row-hidden",
          style: "display: none",
          [ATE_TABLE_HIDDEN_ROW_ATTR]: "",
        })
      );
    }
    rowPos += row.nodeSize;
  });
  if (tracked?.filters.size) {
    const total = map.height - HEADER_ROW - 1;
    const visible = total - hidden.size;
    decorations.push(
      Decoration.widget(tablePos, statusWidget(visible, total, labels), {
        side: -1,
        ignoreSelection: true,
        stopEvent: () => true,
        key: [
          "ate-table-filter-status",
          labels.filterShowing,
          labels.filterNoMatch,
          labels.clearFilters,
        ].join(":"),
      })
    );
  }
  return decorations;
}

function replacesDocument(tr: Transaction): boolean {
  return tr.steps.some(
    (step, index) =>
      step instanceof ReplaceStep && step.from === 0 && step.to === tr.docs[index].content.size
  );
}

/** Finds a table the transaction kept, moved (same node) or rebuilt at the same place */
function remapTablePos(tr: Transaction, before: PMNode, pos: number): number | null {
  const mapped = tr.mapping.mapResult(pos, 1);
  if (!mapped.deleted) {
    return tableAt(tr.doc, mapped.pos) ? mapped.pos : null;
  }
  const original = before.nodeAt(pos);
  const moved: number[] = [];
  tr.doc.descendants((node, nodePos) => {
    if (!moved.length && node === original) {
      moved.push(nodePos);
    }
    return !moved.length && !isTable(node);
  });
  if (moved.length) {
    return moved[0];
  }
  // A replace of the whole document (setContent, a collaborative update) deletes every position: a table found at the same place is taken as the same one
  return replacesDocument(tr) && tableAt(tr.doc, pos) ? pos : null;
}

function remap(value: AteTableSortState, tr: Transaction, before: PMNode): AteTableSortTracking {
  const tables = new Map<number, AteTrackedTable>();
  value.tables.forEach((tracked, pos) => {
    const nextPos = remapTablePos(tr, before, pos);
    const table = nextPos === null ? null : tableAt(tr.doc, nextPos);
    if (nextPos !== null && table && TableMap.get(table).width === tracked.width) {
      const filters = canSortTable(table) ? tracked.filters : new Map<number, AteTableFilter>();
      if (filters.size || tracked.sort) {
        tables.set(nextPos, { ...tracked, filters });
      }
    }
  });
  const menuPos = value.menu && remapTablePos(tr, before, value.menu.tablePos);
  const menuTable = menuPos === null || menuPos === undefined ? null : tableAt(tr.doc, menuPos);
  const menu =
    value.menu && menuTable && value.menu.col < TableMap.get(menuTable).width
      ? { ...value.menu, tablePos: menuPos! }
      : null;
  const pinned = value.pinned.flatMap(pos => {
    const mapped = tr.mapping.mapResult(pos, 1);
    return mapped.deleted ? [] : [mapped.pos];
  });
  return { tables, menu, sticky: value.sticky, pinned };
}

function updateTable(
  tables: ReadonlyMap<number, AteTrackedTable>,
  doc: PMNode,
  tablePos: number,
  update: (tracked: AteTrackedTable) => AteTrackedTable
): ReadonlyMap<number, AteTrackedTable> {
  const table = tableAt(doc, tablePos);
  if (!table) {
    return tables;
  }
  const next = update(
    tables.get(tablePos) ?? { width: TableMap.get(table).width, sort: null, filters: new Map() }
  );
  const result = new Map(tables);
  if (next.filters.size || next.sort) {
    result.set(tablePos, next);
  } else {
    result.delete(tablePos);
  }
  return result;
}

function withFilter(
  filters: ReadonlyMap<number, AteTableFilter>,
  col: number,
  filter: AteTableFilter | null
): ReadonlyMap<number, AteTableFilter> {
  const next = new Map(filters);
  if (filter) {
    next.set(col, filter);
  } else {
    next.delete(col);
  }
  return next;
}

function reduce(
  current: AteTableSortTracking,
  action: AteTableSortAction,
  doc: PMNode,
  decimal: AteTableDecimalSeparator
): AteTableSortTracking {
  switch (action.type) {
    case "sorted":
      return {
        ...current,
        tables: updateTable(current.tables, doc, action.tablePos, tracked => ({
          ...tracked,
          sort: { col: action.col, dir: action.dir },
        })),
      };
    case "setFilter":
      if (!isValidFilter(action.filter)) {
        return current;
      }
      return {
        ...current,
        sticky: false,
        pinned: [],
        tables: updateTable(current.tables, doc, action.tablePos, tracked => ({
          ...tracked,
          filters: withFilter(tracked.filters, action.col, action.filter),
        })),
      };
    case "clearColumn":
      return {
        ...current,
        sticky: false,
        pinned: [],
        tables: updateTable(current.tables, doc, action.tablePos, tracked => ({
          ...tracked,
          filters: withFilter(tracked.filters, action.col, null),
          sort: tracked.sort?.col === action.col ? null : tracked.sort,
        })),
      };
    case "clearFilters":
      return {
        ...current,
        pinned: [],
        tables: updateTable(current.tables, doc, action.tablePos, tracked => ({
          ...tracked,
          filters: new Map(),
        })),
      };
    case "reveal": {
      let tables = current.tables;
      current.tables.forEach((tracked, tablePos) => {
        const table = tableAt(doc, tablePos);
        const row = rowIndexIn(doc, tablePos, action.pos);
        if (
          table &&
          row !== null &&
          hiddenRowsOf(table, tracked.filters, new Set(), decimal).has(row)
        ) {
          tables = updateTable(tables, doc, tablePos, next => ({ ...next, filters: new Map() }));
        }
      });
      return { ...current, tables };
    }
    case "pin":
      return { ...current, pinned: [...current.pinned, ...action.rows] };
    case "toggleMenu": {
      const same = current.menu?.tablePos === action.tablePos && current.menu.col === action.col;
      const valid = !!tableAt(doc, action.tablePos);
      return {
        ...current,
        menu: same || !valid ? null : { tablePos: action.tablePos, col: action.col },
      };
    }
    case "closeMenu":
      return { ...current, menu: null };
    default:
      return current;
  }
}

function computeHidden(
  next: AteTableSortTracking,
  state: Pick<EditorState, "doc" | "selection">,
  editable: boolean,
  decimal: AteTableDecimalSeparator
): Map<number, ReadonlySet<number>> {
  const hidden = new Map<number, ReadonlySet<number>>();
  next.tables.forEach((tracked, tablePos) => {
    const table = tableAt(state.doc, tablePos);
    if (table && tracked.filters.size) {
      const sticky =
        editable && next.sticky ? selectionRows(state.selection, tablePos) : new Set<number>();
      next.pinned.forEach(pos => {
        const row = rowIndexIn(state.doc, tablePos, pos + 1);
        if (row !== null) {
          sticky.add(row);
        }
      });
      hidden.set(tablePos, hiddenRowsOf(table, tracked.filters, sticky, decimal));
    }
  });
  return hidden;
}

function buildState(
  next: AteTableSortTracking,
  state: Pick<EditorState, "doc" | "selection">,
  editable: boolean,
  labels: AteTableSortLabels,
  decimal: AteTableDecimalSeparator
): AteTableSortState {
  const hidden = computeHidden(next, state, editable, decimal);
  const decorations: Decoration[] = [];
  state.doc.descendants((node, pos) => {
    if (!isTable(node)) {
      return true;
    }
    decorations.push(
      ...tableDecorations(
        node,
        pos,
        next.tables.get(pos),
        hidden.get(pos) ?? new Set<number>(),
        next.menu,
        editable,
        labels,
        decimal
      )
    );
    return false;
  });
  return { ...next, decimal, hidden, decorations: DecorationSet.create(state.doc, decorations) };
}

/** A selection moved into a hidden row and scrolled to it: the row must be shown */
function scrolledIntoHiddenRow(tr: Transaction, hidden: AteHiddenRows): number | null {
  if (!tr.selectionSet || !tr.scrolledIntoView) {
    return null;
  }
  const { head } = tr.selection;
  for (const [tablePos, rows] of hidden) {
    const row = rowIndexIn(tr.doc, tablePos, head);
    if (row !== null && rows.has(row)) {
      return head;
    }
  }
  return null;
}

function isOptionalNumber(value: unknown): boolean {
  return value == null || (typeof value === "number" && Number.isFinite(value));
}

function isOptionalDay(value: unknown): boolean {
  return value == null || (typeof value === "string" && parseTableFilterDay(value) !== null);
}

function isValidFilter(filter: unknown): filter is AteTableFilter | null {
  if (filter === null) {
    return true;
  }
  if (typeof filter !== "object") {
    return false;
  }
  const fields = filter as Record<string, unknown>;
  switch (fields["kind"]) {
    case "text":
      return typeof fields["query"] === "string";
    case "values":
      return (
        Array.isArray(fields["values"]) &&
        fields["values"].every(value => typeof value === "string")
      );
    case "number":
      return isOptionalNumber(fields["min"]) && isOptionalNumber(fields["max"]);
    case "date":
      return isOptionalDay(fields["from"]) && isOptionalDay(fields["to"]);
    default:
      return false;
  }
}

function sameHidden(a: AteHiddenRows, b: AteHiddenRows): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const [tablePos, rows] of a) {
    const other = b.get(tablePos);
    if (!other || other.size !== rows.size || Array.from(rows).some(row => !other.has(row))) {
      return false;
    }
  }
  return true;
}

/** A collapsed selection at the start of the visible part of the selection */
function visibleStart(selection: Selection): Selection {
  const { doc } = selection.$head;
  if (selection instanceof CellSelection) {
    const first = Math.min(selection.$anchorCell.pos, selection.$headCell.pos);
    return Selection.near(doc.resolve(first + 1), 1);
  }
  return Selection.near(doc.resolve(selection.from), 1);
}

function safeEndOfTextblock(view: EditorView, dir: 1 | -1): boolean {
  try {
    return view.endOfTextblock(dir > 0 ? "down" : "up");
  } catch {
    return false;
  }
}

function handleArrow(view: EditorView, dir: 1 | -1, extend: boolean): boolean {
  const { state } = view;
  const hidden = hiddenOf(state);
  if (
    !hasHiddenRows(hidden) ||
    (!(state.selection instanceof CellSelection) && !safeEndOfTextblock(view, dir))
  ) {
    return false;
  }
  const result = verticalSkip(state, hidden, dir, extend);
  if (result && result !== "blocked") {
    view.dispatch(result);
  }
  return result !== null;
}

function handleDelete(view: EditorView): boolean {
  const tr = deleteVisibleSelection(view.state, hiddenOf(view.state));
  if (!tr) {
    return false;
  }
  view.dispatch(tr.scrollIntoView());
  return true;
}

/**
 * Adds a menu button to each header cell of tables that have a header row, to sort the rows
 * and filter them by that column, and the matching commands. Sorting replaces only the rows
 * that move, in one undoable step. Filters only hide rows (decorations): while rows are hidden,
 * edits, copies and the keyboard reach the visible rows only.
 */
export const AteTableSort = Extension.create<AteTableSortOptions>({
  name: "ateTableSort",

  // Above the table extension, so Tab and the arrows skip hidden rows before moving between cells
  priority: 1000,

  addOptions() {
    return {
      labels: () => ({
        columnMenu: "Column menu",
        sortUnavailable: "",
        columnFiltered: "filtered",
        filterShowing: "Showing {visible} of {total} rows",
        filterNoMatch: "No rows match the filters",
        clearFilters: "Clear filters",
      }),
      decimalSeparator: () => ".",
    };
  },

  addCommands() {
    return {
      sortTableColumn:
        (column, direction, tablePos) =>
        ({ state, tr, dispatch, editor }) => {
          const pos = tablePos ?? tablePosAround(state.selection.$from);
          const table = pos === null ? null : tableAt(state.doc, pos);
          const rows =
            table && sortedBodyRows(table, column, direction, this.options.decimalSeparator());
          if (!editor.isEditable || pos === null || !table || !rows) {
            return false;
          }
          if (dispatch) {
            const range = changedRowRange(table, rows);
            if (range) {
              const from = pos + 1 + range.from;
              const to = pos + 1 + range.to;
              const { head } = state.selection;
              closeHistory(tr).replaceWith(from, to, range.rows);
              if (head > from && head < to) {
                const headerCell = pos + 1 + TableMap.get(table).map[column];
                tr.setSelection(TextSelection.near(tr.doc.resolve(headerCell + 1)));
              }
            }
            // Replacing rows inside the table never moves the table itself, so `pos` is already right in tr.doc
            addAction(tr, { type: "sorted", tablePos: pos, col: column, dir: direction });
          }
          return true;
        },
      setTableColumnFilter:
        (column, filter, tablePos) =>
        ({ state, tr, dispatch }) => {
          const pos = tablePos ?? tablePosAround(state.selection.$from);
          const table = pos === null ? null : tableAt(tr.doc, pos);
          if (
            pos === null ||
            !table ||
            !canSortTable(table) ||
            column < 0 ||
            column >= TableMap.get(table).width ||
            !isValidFilter(filter)
          ) {
            if (isDevMode() && !isValidFilter(filter)) {
              console.warn("[ATE] setTableColumnFilter: invalid filter, ignored.", filter);
            }
            return false;
          }
          if (dispatch) {
            addAction(tr, { type: "setFilter", tablePos: pos, col: column, filter });
            const current = ateTableSortKey.getState(state)?.tables.get(pos)?.filters;
            const filters = withFilter(current ?? new Map(), column, filter);
            const hides = hiddenRowsOf(table, filters, new Set(), this.options.decimalSeparator());
            // A cursor left in a row the filter hides would type into a row nobody sees
            if (Array.from(selectionRows(tr.selection, pos)).some(row => hides.has(row))) {
              const headerCell = pos + 1 + TableMap.get(table).map[column];
              tr.setSelection(TextSelection.near(tr.doc.resolve(headerCell + 1)));
            }
          }
          return true;
        },
      clearTableFilters:
        tablePos =>
        ({ state, tr, dispatch }) => {
          const pos = tablePos ?? tablePosAround(state.selection.$from);
          if (pos === null || !tableAt(tr.doc, pos)) {
            return false;
          }
          if (dispatch) {
            addAction(tr, { type: "clearFilters", tablePos: pos });
          }
          return true;
        },
      revealTableRow:
        pos =>
        ({ tr, dispatch }) => {
          if (pos < 0 || pos > tr.doc.content.size) {
            return false;
          }
          if (dispatch) {
            addAction(tr, { type: "reveal", pos });
          }
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    const deleteSelection = () => handleDelete(this.editor.view);
    const tab = (dir: 1 | -1) => () => {
      const { view } = this.editor;
      const result = horizontalSkip(view.state, hiddenOf(view.state), dir);
      if (result === "append") {
        return addRowAfter(view.state, view.dispatch) && goToNextCell(1)(view.state, view.dispatch);
      }
      if (result) {
        view.dispatch(result);
      }
      return result !== null;
    };
    return {
      Backspace: deleteSelection,
      "Mod-Backspace": deleteSelection,
      Delete: deleteSelection,
      "Mod-Delete": deleteSelection,
      Tab: tab(1),
      "Shift-Tab": tab(-1),
      ArrowDown: () => handleArrow(this.editor.view, 1, false),
      ArrowUp: () => handleArrow(this.editor.view, -1, false),
      "Shift-ArrowDown": () => handleArrow(this.editor.view, 1, true),
      "Shift-ArrowUp": () => handleArrow(this.editor.view, -1, true),
    };
  },

  addProseMirrorPlugins() {
    const { editor, options } = this;
    // editor.isEditable reads the view, which does not exist yet when the plugin state starts
    const editable = () => editor.options.editable !== false;
    const build = (next: AteTableSortTracking, state: Pick<EditorState, "doc" | "selection">) =>
      buildState(next, state, editable(), options.labels(), options.decimalSeparator());
    return [
      new Plugin<AteTableSortState>({
        key: ateTableSortKey,
        state: {
          init: (_config, state) =>
            build({ tables: new Map(), menu: null, sticky: true, pinned: [] }, state),
          apply(tr, value, oldState, newState) {
            const actions = actionsOf(tr);
            const filtering = value.hidden.size > 0;
            if (!actions.length && !tr.docChanged && !(tr.selectionSet && filtering)) {
              return value;
            }
            const decimal = options.decimalSeparator();
            const tracking = {
              tables: value.tables,
              menu: value.menu,
              sticky: value.sticky,
              pinned: value.pinned,
            };
            if (!actions.length && !tr.docChanged) {
              const moved = { ...tracking, sticky: true };
              const hidden = computeHidden(moved, newState, editable(), decimal);
              if (sameHidden(hidden, value.hidden) && scrolledIntoHiddenRow(tr, hidden) === null) {
                return { ...value, sticky: true };
              }
            }
            let next: AteTableSortTracking = tr.docChanged
              ? remap(value, tr, oldState.doc)
              : tracking;
            if (tr.selectionSet) {
              next = { ...next, sticky: true };
            }
            next = actions.reduce(
              (current, action) => reduce(current, action, tr.doc, decimal),
              next
            );
            if (!editable()) {
              next = { ...next, menu: null };
            }
            let built = build(next, newState);
            const revealAt = scrolledIntoHiddenRow(tr, built.hidden);
            if (revealAt !== null) {
              built = build(
                reduce(next, { type: "reveal", pos: revealAt }, tr.doc, decimal),
                newState
              );
            }
            return built;
          },
        },
        filterTransaction: (tr, state) => protectsHiddenRows(tr, state, hiddenOf(state)),
        view(view) {
          let lastEditable = view.editable;
          return {
            update(updated) {
              syncStatusBars(updated, options.labels());
              if (updated.editable === lastEditable) {
                return;
              }
              lastEditable = updated.editable;
              // Dispatching from inside a view update is not allowed
              queueMicrotask(() => {
                if (!updated.isDestroyed) {
                  updated.dispatch(updated.state.tr.setMeta(ateTableSortKey, { type: "refresh" }));
                }
              });
            },
          };
        },
        props: {
          decorations: state => ateTableSortKey.getState(state)?.decorations ?? DecorationSet.empty,
          transformCopied: (slice, view) =>
            filterCopiedSlice(slice, view.state, hiddenOf(view.state)),
          // Tiptap's own serializer reads the selection again from the document: an empty result falls back to it and copies the hidden rows
          clipboardTextSerializer: (slice, view) =>
            copyIsFiltered(view.state.selection, hiddenOf(view.state))
              ? sliceText(slice, view.state.schema) || "\n"
              : "",
          handleTextInput(view, _from, _to, text) {
            const tr = insertTextOverVisibleSelection(view.state, hiddenOf(view.state), text);
            if (!tr) {
              return false;
            }
            view.dispatch(tr.scrollIntoView());
            return true;
          },
          handlePaste(view, _event, slice) {
            const paste = pasteIntoVisible(view.state, hiddenOf(view.state), slice);
            if (!paste) {
              return false;
            }
            if (paste.addedRows.length) {
              addAction(paste.tr, { type: "pin", rows: paste.addedRows });
            }
            view.dispatch(
              paste.tr.scrollIntoView().setMeta("paste", true).setMeta("uiEvent", "paste")
            );
            return true;
          },
          handleDOMEvents: {
            // Mobile keyboards, IME and autocorrect send beforeinput instead of key presses
            beforeinput(view, event) {
              const hidden = hiddenOf(view.state);
              if (!event.cancelable || !selectionTouchesHidden(view.state.selection, hidden)) {
                return false;
              }
              const type = event.inputType;
              const inserts =
                type === "insertText" ||
                type === "insertReplacementText" ||
                type === "insertCompositionText";
              if (!inserts && !type.startsWith("delete")) {
                return false;
              }
              event.preventDefault();
              const text = inserts
                ? (event.data ?? event.dataTransfer?.getData("text/plain") ?? "")
                : "";
              const tr = text
                ? insertTextOverVisibleSelection(view.state, hidden, text)
                : deleteVisibleSelection(view.state, hidden);
              if (tr) {
                view.dispatch(tr.scrollIntoView());
              }
              return true;
            },
            // A composition cannot be cancelled: it starts at the visible start instead of over hidden rows
            compositionstart(view) {
              const { selection } = view.state;
              if (selectionTouchesHidden(selection, hiddenOf(view.state))) {
                view.dispatch(view.state.tr.setSelection(visibleStart(selection)));
              }
              return false;
            },
            cut(view, event) {
              const hidden = hiddenOf(view.state);
              const data = event.clipboardData;
              if (!data || !selectionTouchesHidden(view.state.selection, hidden)) {
                return false;
              }
              event.preventDefault();
              const { dom, text } = view.serializeForClipboard(view.state.selection.content());
              data.clearData();
              data.setData("text/html", dom.innerHTML);
              data.setData("text/plain", text);
              const tr = deleteVisibleSelection(view.state, hidden);
              if (tr) {
                view.dispatch(tr.scrollIntoView().setMeta("uiEvent", "cut"));
              }
              return true;
            },
            dragstart(view, event) {
              // A block drag moves whole top-level blocks, so a table keeps all its rows
              const blockDrag = Array.from(event.dataTransfer?.types ?? []).includes(
                ATE_BLOCK_DRAG_MIME
              );
              if (
                blockDrag ||
                !selectionTouchesHidden(view.state.selection, hiddenOf(view.state))
              ) {
                return false;
              }
              event.preventDefault();
              return true;
            },
          },
        },
      }),
    ];
  },
});

/** Whether the table holding the selection has rows a filter hides */
export function selectionTableHasHiddenRows(state: EditorState): boolean {
  const tablePos = tablePosAround(state.selection.$from);
  return tablePos !== null && !!hiddenOf(state).get(tablePos)?.size;
}

/** Whether the selection covers rows a filter hides, which blocks row and cell operations */
export function selectionTouchesHiddenRows(state: EditorState): boolean {
  return selectionTouchesHidden(state.selection, hiddenOf(state));
}
