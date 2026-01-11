import {
  Component,
  input,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  effect,
  inject,
  ChangeDetectionStrategy,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Editor } from "@tiptap/core";
import tippy, { Instance as TippyInstance, sticky } from "tippy.js";
import { TiptapI18nService } from "./services/i18n.service";
import { EditorCommandsService } from "./services/editor-commands.service";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapSeparatorComponent } from "./tiptap-separator.component";
import { TableBubbleMenuConfig } from "./models/bubble-menu.model";

@Component({
  selector: "tiptap-table-bubble-menu",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TiptapButtonComponent, TiptapSeparatorComponent],
  template: `
    <div #menuElement class="bubble-menu">
      <!-- Actions de lignes -->
      @if (config().addRowBefore !== false) {
      <tiptap-button
        icon="add_row_above"
        [title]="t().addRowBefore"
        [disabled]="!state().can.addRowBefore"
        (onClick)="onCommand('addRowBefore')"
      ></tiptap-button>
      } @if (config().addRowAfter !== false) {
      <tiptap-button
        icon="add_row_below"
        [title]="t().addRowAfter"
        [disabled]="!state().can.addRowAfter"
        (onClick)="onCommand('addRowAfter')"
      ></tiptap-button>
      } @if (config().deleteRow !== false) {
      <tiptap-button
        icon="delete"
        [title]="t().deleteRow"
        variant="danger"
        [disabled]="!state().can.deleteRow"
        (onClick)="onCommand('deleteRow')"
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
        (onClick)="onCommand('addColumnBefore')"
      ></tiptap-button>
      } @if (config().addColumnAfter !== false) {
      <tiptap-button
        icon="add_column_right"
        [title]="t().addColumnAfter"
        [disabled]="!state().can.addColumnAfter"
        (onClick)="onCommand('addColumnAfter')"
      ></tiptap-button>
      } @if (config().deleteColumn !== false) {
      <tiptap-button
        icon="delete"
        [title]="t().deleteColumn"
        variant="danger"
        [disabled]="!state().can.deleteColumn"
        (onClick)="onCommand('deleteColumn')"
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
        (onClick)="onCommand('toggleHeaderRow')"
      ></tiptap-button>
      } @if (config().toggleHeaderColumn !== false) {
      <tiptap-button
        icon="dock_to_right"
        [title]="t().toggleHeaderColumn"
        [active]="state().nodes.isTableHeaderColumn"
        [disabled]="!state().can.toggleHeaderColumn"
        (onClick)="onCommand('toggleHeaderColumn')"
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
        (onClick)="onCommand('deleteTable')"
      ></tiptap-button>
      }
    </div>
  `,
  styles: [],
})
export class TiptapTableBubbleMenuComponent implements OnInit, OnDestroy {
  @ViewChild("menuElement", { static: true }) menuElement!: ElementRef;

  // Inputs
  editor = input.required<Editor>();
  config = input<TableBubbleMenuConfig>({});

  // Services
  private i18nService = inject(TiptapI18nService);
  readonly editorCommands = inject(EditorCommandsService);

  // Alias pour le template
  readonly state = this.editorCommands.editorState;

  // Tippy instance
  private tippyInstance: TippyInstance | null = null;
  private updateTimeout: any = null;

  // Signaux
  readonly t = this.i18nService.table;

  constructor() {
    // Effet pour mettre à jour le menu quand l'état change
    effect(() => {
      this.state();
      this.updateMenu();
    });
  }

  ngOnInit() {
    this.initTippy();
  }

  ngOnDestroy() {
    if (this.tippyInstance) {
      this.tippyInstance.destroy();
    }
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
  }

  private initTippy() {
    const menuElement = this.menuElement.nativeElement;

    // Créer l'instance Tippy
    this.tippyInstance = tippy(document.body, {
      content: menuElement,
      trigger: "manual",
      placement: "top-start",
      appendTo: (ref) => {
        const ed = this.editor();
        return ed ? ed.options.element : document.body;
      },
      interactive: true,
      arrow: false,
      offset: [0, 8],
      maxWidth: "none",
      hideOnClick: false,
      plugins: [sticky],
      sticky: false,
      onShow: (instance) => {
        // S'assurer que les autres menus sont fermés
        this.hideOtherMenus();
      },
      getReferenceClientRect: () => this.getTableRect(),
      popperOptions: {
        modifiers: [
          {
            name: "preventOverflow",
            options: {
              boundary: this.editor().options.element,
              padding: 8,
            },
          },
          {
            name: "flip",
            options: {
              fallbackPlacements: ["bottom-start", "top-end", "bottom-end"],
            },
          },
        ],
      },
    });

    // Maintenant que Tippy est initialisé, faire un premier check
    this.updateMenu();
  }

  private getTableRect(): DOMRect {
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

    // 2. Fallback ultime si la sélection est ambiguë (ex: sélection multiple de cellules)
    const activeTable = ed.view.dom.querySelector('table.selected, table:has(.selected), table:has(.selected-cell), table:has(.selected-node)');
    if (activeTable) {
      return activeTable.getBoundingClientRect();
    }

    return new DOMRect(-9999, -9999, 0, 0);
  }

  updateMenu = () => {
    // Debounce pour éviter les appels trop fréquents
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      const { selection, nodes, isEditable, isFocused } = this.state();

      // Ne montrer le menu de table que si :
      // 1. On est dans une table (nodes.isTable)
      // 2. L'éditeur est éditable et a le focus
      // 3. La sélection est VIDE (curseur simple) OU c'est le nœud Table qui est sélectionné
      // 4. Ce n'est pas une sélection de cellules (priorité au menu de cellules)
      const shouldShow =
        nodes.isTable &&
        isEditable &&
        isFocused &&
        (selection.empty || nodes.isTableNodeSelected) &&
        selection.type !== 'cell';

      if (shouldShow) {
        this.showTippy();
      } else {
        this.hideTippy();
      }
    }, 10);
  };

  handleBlur = () => {
    // Masquer le menu quand l'éditeur perd le focus
    setTimeout(() => {
      this.hideTippy();
    }, 100);
  };

  private hideOtherMenus() {
    // Cette méthode peut être étendue pour fermer d'autres menus si nécessaire
  }

  private showTippy() {
    if (!this.tippyInstance) return;

    // Mettre à jour la position et activer le polling sticky uniquement si visible
    this.tippyInstance.setProps({
      getReferenceClientRect: () => this.getTableRect(),
      sticky: "reference",
    });

    this.tippyInstance.show();
  }

  hideTippy() {
    if (!this.tippyInstance) return;
    this.tippyInstance.setProps({ sticky: false });
    this.tippyInstance.hide();
  }

  onCommand(command: string) {
    this.editorCommands.execute(this.editor(), command);
    this.updateMenu();
  }
}
