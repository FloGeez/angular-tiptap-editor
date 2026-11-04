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
  viewChild,
} from "@angular/core";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { Editor } from "@tiptap/core";
import { TableMap } from "@tiptap/pm/tables";
import { AteEditorI18n } from "../../../services/ate-editor-i18n.service";
import {
  ATE_TABLE_COLUMN_ATTR,
  type AteTableColumnTarget,
  type AteTableSortDirection,
  canSortTable,
  cellText,
  closeTableColumnMenu,
  columnButton,
  columnSortDirection,
  openTableColumnMenu,
  tableAt,
} from "../../../extensions/ate-table-sort.extension";

interface AteOpenColumnMenu extends AteTableColumnTarget {
  label: string;
  sortDir: AteTableSortDirection | null;
  canSort: boolean;
}

/**
 * Menu opened by the button of a table header cell: sorts the table by that column.
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
      (mousedown)="$event.preventDefault()">
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
    </div>
  `,
  styles: [
    `
      .ate-table-column-menu {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 180px;
        padding: var(--ate-menu-padding, 4px);
        background: var(--ate-menu-bg, #ffffff);
        border: 1px solid var(--ate-menu-border, rgba(0, 0, 0, 0.1));
        border-radius: var(--ate-menu-border-radius, 12px);
        box-shadow: var(--ate-menu-shadow, 0 8px 32px rgba(0, 0, 0, 0.12));
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
        color: var(--ate-text, #2d3748);
        font: inherit;
        font-size: 14px;
        text-align: left;
        cursor: pointer;
      }

      .ate-table-column-menu-item:hover:not(.is-disabled),
      .ate-table-column-menu-item:focus-visible {
        background: var(--ate-surface-tertiary, #f1f5f9);
      }

      .ate-table-column-menu-item:focus-visible {
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
    `,
  ],
})
export class AteTableColumnMenuComponent implements AfterViewInit, OnDestroy {
  private readonly i18n = inject(AteEditorI18n);

  readonly t = this.i18n.table;

  editor = input.required<Editor>();

  readonly menu = signal<AteOpenColumnMenu | null>(null);

  readonly ariaLabel = computed(() => {
    const label = this.menu()?.label;
    return label ? `${this.t().columnMenu}: ${label}` : this.t().columnMenu;
  });

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
      onCleanup(() => {
        editor.off("transaction", onTransaction);
        document.removeEventListener("pointerdown", onPointerDown, true);
        document.removeEventListener("keydown", onKeyDown, true);
      });
    });
  }

  ngAfterViewInit() {
    const editor = this.editor();
    this.tippyInstance = tippy(document.body, {
      content: this.menuRef().nativeElement,
      trigger: "manual",
      placement: "bottom-end",
      theme: "ate-bubble-menu",
      appendTo: () => (editor.options.element as HTMLElement) || document.body,
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

  sort(dir: AteTableSortDirection) {
    const menu = this.menu();
    if (menu?.canSort) {
      this.editor().commands.sortTableColumn(menu.col, dir, menu.tablePos);
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
    this.menu.set({
      ...target,
      label: cellText(table, TableMap.get(table), 0, target.col),
      sortDir: columnSortDirection(editor.state, target.tablePos, target.col),
      canSort: editor.isEditable && canSortTable(table),
    });
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
    const onToggle = target instanceof Element && !!target.closest(`[${ATE_TABLE_COLUMN_ATTR}]`);
    if (this.menu() && !inside && !onToggle) {
      closeTableColumnMenu(this.editor().view);
    }
  }

  private closeOnEscape(event: KeyboardEvent) {
    const menu = this.menu();
    if (event.key !== "Escape" || !menu) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const { view } = this.editor();
    closeTableColumnMenu(view);
    columnButton(view, menu)?.focus();
  }
}
