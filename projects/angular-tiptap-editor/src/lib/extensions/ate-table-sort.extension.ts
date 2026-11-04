import { Extension, type Editor } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { Fragment, type Node as PMNode, type ResolvedPos } from "@tiptap/pm/model";
import {
  Plugin,
  PluginKey,
  TextSelection,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";
import { TableMap } from "@tiptap/pm/tables";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import {
  tableSortOrder,
  type AteTableDecimalSeparator,
  type AteTableSortDirection,
} from "../utils/ate-table-values.utils";

export type { AteTableSortDirection } from "../utils/ate-table-values.utils";

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
    };
  }
}

export interface AteTableSortLabels {
  columnMenu: string;
  sortUnavailable: string;
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
}

export interface AteTableSortState {
  tables: ReadonlyMap<number, AteTrackedTable>;
  menu: AteTableColumnTarget | null;
  decimal: AteTableDecimalSeparator;
  decorations: DecorationSet;
}

type AteTableSortTracking = Pick<AteTableSortState, "tables" | "menu">;

type AteTableSortAction =
  | { type: "sorted"; tablePos: number; col: number; dir: AteTableSortDirection }
  | { type: "toggleMenu"; tablePos: number; col: number }
  | { type: "closeMenu" }
  | { type: "refresh" };

export const ateTableSortKey = new PluginKey<AteTableSortState>("ateTableSort");

/** Set on the wrapper of each column button, with the column index */
export const ATE_TABLE_COLUMN_ATTR = "data-ate-table-column";

const HEADER_ROW = 0;

const CHEVRON_SVG =
  '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path d="M7 10l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function isTable(node: PMNode | null | undefined): node is PMNode {
  return node?.type.spec["tableRole"] === "table";
}

export function tableAt(doc: PMNode, pos: number): PMNode | null {
  const node = doc.nodeAt(pos);
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

function spansRows(table: PMNode): boolean {
  let spans = false;
  table.forEach(row =>
    row.forEach(cell => {
      spans ||= Number(cell.attrs["rowspan"] ?? 1) > 1;
    })
  );
  return spans;
}

/** Whether the rows of a table can be reordered: a header row, a body and no cell spanning rows */
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
  const texts: string[] = [];
  const body: PMNode[] = [];
  for (let row = HEADER_ROW + 1; row < map.height; row++) {
    texts.push(cellText(table, map, row, col));
    body.push(table.child(row));
  }
  return tableSortOrder(texts, dir, decimal).map(index => body[index]);
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

interface AteColumnWidget {
  col: number;
  label: string;
  sortDir: AteTableSortDirection | null;
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
    button.className = "ate-table-column-button";
    button.innerHTML = CHEVRON_SVG;
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", String(widget.expanded));
    button.setAttribute(
      "aria-label",
      widget.label ? `${widget.labels.columnMenu}: ${widget.label}` : widget.labels.columnMenu
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

function tableDecorations(
  table: PMNode,
  tablePos: number,
  tracked: AteTrackedTable | undefined,
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
  return headerColumns(map).flatMap(col => {
    const cellPos = tablePos + 1 + map.map[HEADER_ROW * map.width + col];
    const cell = table.nodeAt(cellPos - tablePos - 1)!;
    const label = cell.textContent.trim();
    const dir = sort?.col === col ? sortDir : null;
    const expanded = menu?.tablePos === tablePos && menu.col === col;
    const decorations = [
      Decoration.widget(
        cellPos + 1,
        columnWidget({ col, label, sortDir: dir, expanded, editable, labels }),
        {
          side: -1,
          ignoreSelection: true,
          stopEvent: () => true,
          key: `ate-table-column:${col}:${dir}:${expanded}:${editable}:${label}:${labels.columnMenu}:${labels.sortUnavailable}`,
        }
      ),
    ];
    if (dir) {
      decorations.push(
        Decoration.node(cellPos, cellPos + cell.nodeSize, {
          "aria-sort": dir === "asc" ? "ascending" : "descending",
        })
      );
    }
    return decorations;
  });
}

function remap(value: AteTableSortState, tr: Transaction): AteTableSortTracking {
  // A replace of the whole document (setContent, a collaborative update) deletes every position: a table found at the same place is taken as the same one
  const mapTable = (pos: number) => {
    const mapped = tr.mapping.mapResult(pos, 1);
    const nextPos = mapped.deleted ? pos : mapped.pos;
    const table = nextPos <= tr.doc.content.size ? tableAt(tr.doc, nextPos) : null;
    return table ? { pos: nextPos, width: TableMap.get(table).width } : null;
  };
  const tables = new Map<number, AteTrackedTable>();
  value.tables.forEach((tracked, pos) => {
    const next = mapTable(pos);
    if (next && next.width === tracked.width) {
      tables.set(next.pos, tracked);
    }
  });
  const menuTable = value.menu && mapTable(value.menu.tablePos);
  const menu =
    value.menu && menuTable && value.menu.col < menuTable.width
      ? { ...value.menu, tablePos: menuTable.pos }
      : null;
  return { tables, menu };
}

function reduce(
  current: AteTableSortTracking,
  action: AteTableSortAction,
  tr: Transaction
): AteTableSortTracking {
  switch (action.type) {
    case "sorted": {
      const table = tableAt(tr.doc, action.tablePos);
      if (!table) {
        return current;
      }
      const tables = new Map(current.tables);
      tables.set(action.tablePos, {
        width: TableMap.get(table).width,
        sort: { col: action.col, dir: action.dir },
      });
      return { ...current, tables };
    }
    case "toggleMenu": {
      const same = current.menu?.tablePos === action.tablePos && current.menu.col === action.col;
      const valid = !!tableAt(tr.doc, action.tablePos);
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

function buildState(
  next: AteTableSortTracking,
  doc: PMNode,
  editable: boolean,
  labels: AteTableSortLabels,
  decimal: AteTableDecimalSeparator
): AteTableSortState {
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!isTable(node)) {
      return true;
    }
    decorations.push(
      ...tableDecorations(node, pos, next.tables.get(pos), next.menu, editable, labels, decimal)
    );
    return false;
  });
  return { ...next, decimal, decorations: DecorationSet.create(doc, decorations) };
}

/**
 * Adds a menu button to each header cell of tables that have a header row, and the
 * `sortTableColumn` command. Sorting replaces only the rows that move, in one undoable step.
 */
export const AteTableSort = Extension.create<AteTableSortOptions>({
  name: "ateTableSort",

  addOptions() {
    return {
      labels: () => ({ columnMenu: "Column menu", sortUnavailable: "" }),
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
            tr.setMeta(ateTableSortKey, {
              type: "sorted",
              tablePos: pos,
              col: column,
              dir: direction,
            });
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const { editor, options } = this;
    // editor.isEditable reads the view, which does not exist yet when the plugin state starts
    const editable = () => editor.options.editable !== false;
    const build = (next: AteTableSortTracking, doc: PMNode) =>
      buildState(next, doc, editable(), options.labels(), options.decimalSeparator());
    return [
      new Plugin<AteTableSortState>({
        key: ateTableSortKey,
        state: {
          init: (_config, state) => build({ tables: new Map(), menu: null }, state.doc),
          apply(tr, value) {
            const action = tr.getMeta(ateTableSortKey) as AteTableSortAction | undefined;
            if (!action && !tr.docChanged) {
              return value;
            }
            let next = tr.docChanged
              ? remap(value, tr)
              : { tables: value.tables, menu: value.menu };
            if (action) {
              next = reduce(next, action, tr);
            }
            if (!editable()) {
              next = { ...next, menu: null };
            }
            return build(next, tr.doc);
          },
        },
        view(view) {
          let lastEditable = view.editable;
          return {
            update(updated) {
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
        },
      }),
    ];
  },
});
