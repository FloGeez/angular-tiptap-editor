import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from "@angular/core";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { Editor } from "@tiptap/core";
import { TableMap } from "@tiptap/pm/tables";
import { AteEditorI18n } from "../../../services/ate-editor-i18n.service";
import {
  ATE_TABLE_COLUMN_ATTR,
  type AteTableColumnFilterInfo,
  type AteTableColumnTarget,
  type AteTableSortDirection,
  canSortTable,
  spansRows,
  cellText,
  clearTableColumn,
  closeTableColumnMenu,
  columnButton,
  columnFilterInfo,
  columnSortDirection,
  openTableColumnMenu,
  tableAt,
} from "../../../extensions/ate-table-sort.extension";
import { parseTableNumber, type AteTableFilter } from "../../../utils/ate-table-values.utils";

interface AteOpenColumnMenu extends AteTableColumnTarget {
  label: string;
  sortDir: AteTableSortDirection | null;
  canSort: boolean;
  mergedCells: boolean;
  info: AteTableColumnFilterInfo | null;
}

interface AteFilterDraft {
  query: string;
  min: string;
  max: string;
  from: string;
  to: string;
}

interface AteValueOption {
  value: string;
  count: number;
  checked: boolean;
}

const EMPTY_DRAFT: AteFilterDraft = { query: "", min: "", max: "", from: "", to: "" };

function draftOf(filter: AteTableFilter | null): AteFilterDraft {
  switch (filter?.kind) {
    case "text":
      return { ...EMPTY_DRAFT, query: filter.query };
    case "number":
      return {
        ...EMPTY_DRAFT,
        min: filter.min == null ? "" : String(filter.min),
        max: filter.max == null ? "" : String(filter.max),
      };
    case "date":
      return { ...EMPTY_DRAFT, from: filter.from ?? "", to: filter.to ?? "" };
    default:
      return EMPTY_DRAFT;
  }
}

/**
 * Menu opened by the button of a table header cell: sorts the table by that column and
 * filters its rows by the values of that column.
 */
@Component({
  selector: "ate-table-column-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      #menuRef
      class="ate-table-column-menu"
      role="dialog"
      tabindex="-1"
      [attr.aria-label]="ariaLabel()"
      (mousedown)="keepEditorFocus($event)">
      @for (option of options; track option.dir) {
        <button
          type="button"
          class="ate-table-column-menu-item"
          [class.is-active]="menu()?.sortDir === option.dir"
          [class.is-disabled]="!menu()?.canSort"
          [attr.aria-pressed]="menu()?.sortDir === option.dir"
          [attr.aria-disabled]="menu()?.canSort ? null : true"
          [attr.title]="menu()?.canSort ? null : t().sortMergedCells"
          (click)="sort(option.dir)">
          <span class="ate-table-column-menu-arrow" aria-hidden="true">{{ option.arrow }}</span>
          {{ option.dir === "asc" ? t().sortAscending : t().sortDescending }}
        </button>
      }
      <div class="ate-table-column-menu-separator" aria-hidden="true"></div>
      <div class="ate-table-column-menu-filter" role="group" [attr.aria-label]="t().filter">
        <span class="ate-table-column-menu-caption" aria-hidden="true">{{ t().filter }}</span>
        @if (menu(); as current) {
          @if (current.mergedCells) {
            <p class="ate-table-column-menu-note">{{ t().filterMergedCells }}</p>
          } @else if (current.canSort) {
            @if (current.info; as info) {
              @switch (info.kind) {
                @case ("values") {
                  <label class="ate-table-column-menu-check is-all">
                    <input type="checkbox" [checked]="allChecked()" (change)="toggleAll($event)" />
                    <span class="ate-table-column-menu-value">{{ t().filterAll }}</span>
                  </label>
                  <div class="ate-table-column-menu-list">
                    @for (value of values(); track value.value) {
                      <label class="ate-table-column-menu-check">
                        <input
                          type="checkbox"
                          [checked]="value.checked"
                          (change)="toggleValue(value.value, $event)" />
                        <span class="ate-table-column-menu-value">{{
                          value.value || t().filterEmpty
                        }}</span>
                        <span class="ate-table-column-menu-count">{{ value.count }}</span>
                      </label>
                    }
                  </div>
                }
                @case ("number") {
                  <div class="ate-table-column-menu-pair">
                    <input
                      type="text"
                      inputmode="decimal"
                      class="ate-table-column-menu-input"
                      [value]="draft().min"
                      [attr.aria-label]="t().filterMin"
                      [attr.placeholder]="bound(info.min) ?? t().filterMin"
                      (input)="typeNumber('min', $event)" />
                    <input
                      type="text"
                      inputmode="decimal"
                      class="ate-table-column-menu-input"
                      [value]="draft().max"
                      [attr.aria-label]="t().filterMax"
                      [attr.placeholder]="bound(info.max) ?? t().filterMax"
                      (input)="typeNumber('max', $event)" />
                  </div>
                }
                @case ("date") {
                  <div class="ate-table-column-menu-pair">
                    <input
                      type="date"
                      class="ate-table-column-menu-input"
                      [value]="draft().from"
                      [attr.aria-label]="t().filterFrom"
                      (change)="pickDate('from', $event)" />
                    <input
                      type="date"
                      class="ate-table-column-menu-input"
                      [value]="draft().to"
                      [attr.aria-label]="t().filterTo"
                      (change)="pickDate('to', $event)" />
                  </div>
                }
                @default {
                  <input
                    type="search"
                    class="ate-table-column-menu-input"
                    [value]="draft().query"
                    [attr.aria-label]="t().filterContains"
                    [attr.placeholder]="t().filterContains"
                    (input)="typeQuery($event)" />
                }
              }
            }
          }
        }
      </div>
      <div class="ate-table-column-menu-separator" aria-hidden="true"></div>
      <button type="button" class="ate-table-column-menu-item" (click)="clearColumn()">
        {{ t().clearColumn }}
      </button>
    </div>
  `,
  styles: [
    `
      .ate-table-column-menu {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 200px;
        max-width: 280px;
        padding: var(--ate-menu-padding, 4px);
        background: var(--ate-menu-bg, #ffffff);
        border: 1px solid var(--ate-menu-border, rgba(0, 0, 0, 0.1));
        border-radius: var(--ate-menu-border-radius, 12px);
        box-shadow: var(--ate-menu-shadow, 0 8px 32px rgba(0, 0, 0, 0.12));
        color: var(--ate-text, #2d3748);
        font-size: 14px;
        outline: none;
      }

      .ate-table-column-menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 6px 10px;
        border: none;
        border-radius: var(--ate-sub-border-radius, 8px);
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: left;
        cursor: pointer;
      }

      .ate-table-column-menu-item:hover:not(.is-disabled),
      .ate-table-column-menu-item:focus-visible {
        background: var(--ate-surface-tertiary, #f1f5f9);
      }

      .ate-table-column-menu-item:focus-visible,
      .ate-table-column-menu-input:focus-visible {
        outline: 2px solid var(--ate-primary, #2563eb);
        outline-offset: -2px;
      }

      .ate-table-column-menu-item.is-active {
        color: var(--ate-primary, #2563eb);
        font-weight: 600;
      }

      .ate-table-column-menu-item.is-disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .ate-table-column-menu-arrow {
        width: 1em;
        text-align: center;
      }

      .ate-table-column-menu-separator {
        height: 1px;
        margin: 4px 0;
        background: var(--ate-menu-border, rgba(0, 0, 0, 0.1));
      }

      .ate-table-column-menu-filter {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 2px 6px;
      }

      .ate-table-column-menu-caption {
        color: var(--ate-text-secondary, #64748b);
        font-size: 12px;
        font-weight: 600;
      }

      .ate-table-column-menu-note {
        margin: 0;
        color: var(--ate-text-secondary, #64748b);
        font-size: 12px;
      }

      .ate-table-column-menu-input {
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        padding: 4px 6px;
        border: 1px solid var(--ate-border, #e2e8f0);
        border-radius: 6px;
        background: var(--ate-surface, #ffffff);
        color: inherit;
        font: inherit;
      }

      .ate-table-column-menu-pair {
        display: flex;
        gap: 6px;
      }

      .ate-table-column-menu-list {
        display: flex;
        flex-direction: column;
        max-height: 220px;
        overflow-y: auto;
      }

      .ate-table-column-menu-check {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 2px 0;
        cursor: pointer;
      }

      .ate-table-column-menu-check.is-all {
        font-weight: 600;
      }

      .ate-table-column-menu-value {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .ate-table-column-menu-count {
        color: var(--ate-text-secondary, #64748b);
        font-size: 12px;
      }
    `,
  ],
})
export class AteTableColumnMenuComponent implements AfterViewInit, OnDestroy {
  private readonly i18n = inject(AteEditorI18n);

  readonly t = this.i18n.table;

  editor = input.required<Editor>();

  readonly menu = signal<AteOpenColumnMenu | null>(null);
  readonly draft = signal<AteFilterDraft>(EMPTY_DRAFT);

  readonly ariaLabel = computed(() => {
    const label = this.menu()?.label;
    return label ? `${this.t().columnMenu}: ${label}` : this.t().columnMenu;
  });

  readonly values = computed<AteValueOption[]>(() => {
    const info = this.menu()?.info;
    if (!info) {
      return [];
    }
    const chosen = info.filter?.kind === "values" ? new Set(info.filter.values) : null;
    return info.counts.map(({ value, count }) => ({
      value,
      count,
      checked: !chosen || chosen.has(value),
    }));
  });

  readonly allChecked = computed(() => this.values().every(value => value.checked));

  readonly options: { dir: AteTableSortDirection; arrow: string }[] = [
    { dir: "asc", arrow: "↑" },
    { dir: "desc", arrow: "↓" },
  ];

  private readonly menuRef = viewChild.required<ElementRef<HTMLDivElement>>("menuRef");
  private tippyInstance: TippyInstance | null = null;
  private focusTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(onCleanup => {
      const editor = this.editor();
      const onTransaction = () => this.sync();
      const onPointerDown = (event: PointerEvent) => this.closeOnOutside(event);
      const onKeyDown = (event: KeyboardEvent) => this.closeOnEscape(event);
      editor.on("transaction", onTransaction);
      document.addEventListener("pointerdown", onPointerDown, true);
      document.addEventListener("keydown", onKeyDown, true);
      untracked(() => this.sync());
      onCleanup(() => {
        editor.off("transaction", onTransaction);
        document.removeEventListener("pointerdown", onPointerDown, true);
        document.removeEventListener("keydown", onKeyDown, true);
        untracked(() => this.menu.set(null));
        this.tippyInstance?.hide();
      });
    });
  }

  ngAfterViewInit() {
    this.tippyInstance = tippy(document.body, {
      content: this.menuRef().nativeElement,
      trigger: "manual",
      placement: "bottom-end",
      theme: "ate-bubble-menu",
      appendTo: () => (this.editor().options.element as HTMLElement) || document.body,
      interactive: true,
      hideOnClick: false,
      arrow: false,
      offset: [0, 4],
      getReferenceClientRect: () => this.anchorRect(),
      popperOptions: {
        modifiers: [{ name: "flip", options: { fallbackPlacements: ["top-end", "bottom-start"] } }],
      },
    });
    this.sync();
  }

  ngOnDestroy() {
    if (this.focusTimeout) {
      clearTimeout(this.focusTimeout);
    }
    this.tippyInstance?.destroy();
    this.tippyInstance = null;
  }

  /** Keeps the editor selection on clicks in the menu, except in its fields */
  keepEditorFocus(event: MouseEvent) {
    if (!(event.target instanceof HTMLInputElement)) {
      event.preventDefault();
    }
  }

  sort(dir: AteTableSortDirection) {
    const menu = this.menu();
    if (menu?.canSort) {
      this.editor().commands.sortTableColumn(menu.col, dir, menu.tablePos);
    }
  }

  bound(value: number | null): string | null {
    if (value === null) {
      return null;
    }
    const text = String(value);
    return this.menu()?.info?.decimal === "," ? text.replace(".", ",") : text;
  }

  typeQuery(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.draft.update(draft => ({ ...draft, query }));
    this.applyFilter(query.trim() ? { kind: "text", query } : null);
  }

  typeNumber(bound: "min" | "max", event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update(draft => ({ ...draft, [bound]: value }));
    const decimal = this.menu()?.info?.decimal ?? ".";
    const { min, max } = this.draft();
    const low = min.trim() ? parseTableNumber(min, decimal) : null;
    const high = max.trim() ? parseTableNumber(max, decimal) : null;
    this.applyFilter(
      low === null && high === null ? null : { kind: "number", min: low, max: high }
    );
  }

  pickDate(bound: "from" | "to", event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.draft.update(draft => ({ ...draft, [bound]: value }));
    const { from, to } = this.draft();
    this.applyFilter(from || to ? { kind: "date", from: from || null, to: to || null } : null);
  }

  toggleValue(value: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const values = this.values();
    const kept = values
      .filter(option => (option.value === value ? checked : option.checked))
      .map(option => option.value);
    this.applyFilter(kept.length === values.length ? null : { kind: "values", values: kept });
  }

  toggleAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.applyFilter(checked ? null : { kind: "values", values: [] });
  }

  clearColumn() {
    const menu = this.menu();
    if (!menu) {
      return;
    }
    const { view } = this.editor();
    clearTableColumn(view, menu);
    closeTableColumnMenu(view);
    columnButton(view, menu)?.focus();
  }

  private applyFilter(filter: AteTableFilter | null) {
    const menu = this.menu();
    if (menu?.canSort) {
      this.editor().commands.setTableColumnFilter(menu.col, filter, menu.tablePos);
    }
  }

  private sync() {
    const editor = this.editor();
    if (editor.isDestroyed) {
      return;
    }
    const previous = this.menu();
    const target = openTableColumnMenu(editor.state);
    const table = target && tableAt(editor.state.doc, target.tablePos);
    if (!target || !table) {
      this.menu.set(null);
      this.tippyInstance?.hide();
      return;
    }
    const info = columnFilterInfo(editor.state, target);
    this.menu.set({
      ...target,
      label: cellText(table, TableMap.get(table), 0, target.col),
      sortDir: columnSortDirection(editor.state, target.tablePos, target.col),
      canSort: editor.isEditable && canSortTable(table),
      mergedCells: spansRows(table),
      info,
    });
    if (previous?.tablePos !== target.tablePos || previous.col !== target.col) {
      this.draft.set(draftOf(info?.filter ?? null));
    }
    if (!this.tippyInstance) {
      return;
    }
    this.tippyInstance.popperInstance?.update();
    if (previous?.tablePos !== target.tablePos || previous.col !== target.col) {
      this.tippyInstance.show();
      if (this.focusTimeout) {
        clearTimeout(this.focusTimeout);
      }
      this.focusTimeout = setTimeout(() => this.focusFirstItem());
    }
  }

  private focusFirstItem() {
    const element = this.menuRef().nativeElement;
    const item = element.querySelector<HTMLElement>(
      ".ate-table-column-menu-item:not(.is-disabled)"
    );
    (item ?? element).focus({ preventScroll: true });
  }

  private anchorRect(): DOMRect {
    const menu = this.menu();
    const button = menu ? columnButton(this.editor().view, menu) : null;
    return button ? button.getBoundingClientRect() : new DOMRect(-9999, -9999, 0, 0);
  }

  private closeOnOutside(event: PointerEvent) {
    const target = event.target;
    const inside = target instanceof Node && this.menuRef().nativeElement.contains(target);
    const onToggle =
      target instanceof Element &&
      this.editor().view.dom.contains(target) &&
      !!target.closest(`[${ATE_TABLE_COLUMN_ATTR}]`);
    if (this.menu() && !inside && !onToggle) {
      closeTableColumnMenu(this.editor().view);
    }
  }

  private closeOnEscape(event: KeyboardEvent) {
    const menu = this.menu();
    if (event.key !== "Escape" || !menu) {
      return;
    }
    const element = this.menuRef().nativeElement;
    const target = event.target;
    // The first Escape closes the date picker of a date field, the next one the menu
    if (target instanceof HTMLInputElement && target.type === "date" && element.contains(target)) {
      setTimeout(() => element.focus({ preventScroll: true }));
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const { view } = this.editor();
    closeTableColumnMenu(view);
    columnButton(view, menu)?.focus();
  }
}
