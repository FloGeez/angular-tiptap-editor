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
  ChangeDetectorRef,
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
        [disabled]="!canExecute('addRowBefore')"
        (onClick)="onCommand('addRowBefore')"
      ></tiptap-button>
      } @if (config().addRowAfter !== false) {
      <tiptap-button
        icon="add_row_below"
        [title]="t().addRowAfter"
        [disabled]="!canExecute('addRowAfter')"
        (onClick)="onCommand('addRowAfter')"
      ></tiptap-button>
      } @if (config().deleteRow !== false) {
      <tiptap-button
        icon="delete"
        [title]="t().deleteRow"
        variant="danger"
        [disabled]="!canExecute('deleteRow')"
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
        [disabled]="!canExecute('addColumnBefore')"
        (onClick)="onCommand('addColumnBefore')"
      ></tiptap-button>
      } @if (config().addColumnAfter !== false) {
      <tiptap-button
        icon="add_column_right"
        [title]="t().addColumnAfter"
        [disabled]="!canExecute('addColumnAfter')"
        (onClick)="onCommand('addColumnAfter')"
      ></tiptap-button>
      } @if (config().deleteColumn !== false) {
      <tiptap-button
        icon="delete"
        [title]="t().deleteColumn"
        variant="danger"
        [disabled]="!canExecute('deleteColumn')"
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
        [active]="isActive('tableHeader', { row: true })"
        [disabled]="!canExecute('toggleHeaderRow')"
        (onClick)="onCommand('toggleHeaderRow')"
      ></tiptap-button>
      } @if (config().toggleHeaderColumn !== false) {
      <tiptap-button
        icon="dock_to_right"
        [title]="t().toggleHeaderColumn"
        [active]="isActive('tableHeader', { column: true })"
        [disabled]="!canExecute('toggleHeaderColumn')"
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
        [disabled]="!canExecute('deleteTable')"
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
  private commandsService = inject(EditorCommandsService);
  private cdr = inject(ChangeDetectorRef);

  // Tippy instance
  private tippyInstance: TippyInstance | null = null;
  private updateTimeout: any = null;

  // Signaux
  readonly t = this.i18nService.table;

  constructor() {
    // Effet pour mettre à jour le menu quand l'éditeur change
    effect(() => {
      const editor = this.editor();
      if (editor) {
        // Nettoyer les anciens listeners
        editor.off("selectionUpdate", this.updateMenu);
        editor.off("focus", this.updateMenu);
        editor.off("blur", this.handleBlur);

        // Ajouter les nouveaux listeners
        editor.on("selectionUpdate", this.updateMenu);
        editor.on("focus", this.updateMenu);
        editor.on("blur", this.handleBlur);
      }
    });
  }

  ngOnInit() {
    this.initTippy();
  }

  ngOnDestroy() {
    const editor = this.editor();
    if (editor) {
      // Nettoyer les événements
      editor.off("selectionUpdate", this.updateMenu);
      editor.off("focus", this.updateMenu);
      editor.off("blur", this.handleBlur);
    }

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
      const ed = this.editor();
      if (!ed) return;

      const isTableSelected =
        ed.isActive("table") ||
        ed.isActive("tableCell") ||
        ed.isActive("tableHeader");

      // Vérifier s'il y a une sélection de cellules (priorité au menu de cellules)
      const { from, to } = ed.state.selection;
      const hasCellSelection = from !== to;
      const isTableCell =
        ed.isActive("tableCell") || ed.isActive("tableHeader");

      // Vérifier si la sélection traverse plusieurs cellules
      const selectionSize = to - from;
      const hasMultiCellSelection = hasCellSelection && selectionSize > 1;

      // Ne montrer le menu de table que si :
      // 1. Une table est sélectionnée
      // 2. L'éditeur est éditable
      // 3. Il n'y a PAS de sélection de cellules (priorité au menu de cellules)
      // 4. Il n'y a PAS de sélection multi-cellules
      const shouldShow =
        isTableSelected &&
        ed.isEditable &&
        !(hasCellSelection && isTableCell) &&
        !hasMultiCellSelection;

      if (shouldShow) {
        this.showTippy();
      } else {
        this.hideTippy();
      }

      // Marquer pour vérification puisque nous sommes en OnPush et que Tiptap tourne hors zone ou via signaux
      this.cdr.markForCheck();
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

  isActive(name: string, attributes?: Record<string, any>): boolean {
    return this.commandsService.isActive(this.editor(), name, attributes);
  }

  canExecute(command: string): boolean {
    return this.commandsService.canExecute(this.editor(), command);
  }

  onCommand(command: string) {
    this.commandsService.execute(this.editor(), command);
    this.updateMenu();
  }
}
