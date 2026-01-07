import {
  Component,
  input,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  effect,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Editor } from "@tiptap/core";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { TiptapI18nService } from "./services/i18n.service";
import { EditorCommandsService } from "./services/editor-commands.service";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapSeparatorComponent } from "./tiptap-separator.component";
import { TableBubbleMenuConfig } from "./models/bubble-menu.model";

@Component({
  selector: "tiptap-table-bubble-menu",
  standalone: true,
  imports: [CommonModule, TiptapButtonComponent, TiptapSeparatorComponent],
  template: `
    <div #menuElement class="bubble-menu">
      <!-- Actions de lignes -->
      @if (config().addRowBefore !== false) {
      <tiptap-button
        icon="add_row_above"
        title="{{ t().addRowBefore }}"
        (click)="addRowBefore()"
      ></tiptap-button>
      } @if (config().addRowAfter !== false) {
      <tiptap-button
        icon="add_row_below"
        title="{{ t().addRowAfter }}"
        (click)="addRowAfter()"
      ></tiptap-button>
      } @if (config().deleteRow !== false) {
      <tiptap-button
        icon="delete"
        title="{{ t().deleteRow }}"
        variant="danger"
        (click)="deleteRow()"
      ></tiptap-button>
      } @if (config().separator !== false) {
      <tiptap-separator></tiptap-separator>
      }

      <!-- Actions de colonnes -->
      @if (config().addColumnBefore !== false) {
      <tiptap-button
        icon="add_column_left"
        title="{{ t().addColumnBefore }}"
        (click)="addColumnBefore()"
      ></tiptap-button>
      } @if (config().addColumnAfter !== false) {
      <tiptap-button
        icon="add_column_right"
        title="{{ t().addColumnAfter }}"
        (click)="addColumnAfter()"
      ></tiptap-button>
      } @if (config().deleteColumn !== false) {
      <tiptap-button
        icon="delete"
        title="{{ t().deleteColumn }}"
        variant="danger"
        (click)="deleteColumn()"
      ></tiptap-button>
      } @if (config().separator !== false) {
      <tiptap-separator></tiptap-separator>
      }

      <!-- Actions de cellules -->
      @if (config().toggleHeaderRow !== false) {
      <tiptap-button
        icon="toolbar"
        title="{{ t().toggleHeaderRow }}"
        (click)="toggleHeaderRow()"
      ></tiptap-button>
      } @if (config().toggleHeaderColumn !== false) {
      <tiptap-button
        icon="dock_to_right"
        title="{{ t().toggleHeaderColumn }}"
        (click)="toggleHeaderColumn()"
      ></tiptap-button>
      } @if (config().separator !== false && config().deleteTable !== false) {
      <tiptap-separator></tiptap-separator>
      }

      <!-- Actions de table -->
      @if (config().deleteTable !== false) {
      <tiptap-button
        icon="delete_forever"
        title="{{ t().deleteTable }}"
        variant="danger"
        (click)="deleteTable()"
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
      placement: "bottom-start",
      appendTo: (ref) => {
        const host = this.editor().options.element.closest("angular-tiptap-editor");
        return host || document.body;
      },
      interactive: true,
      arrow: false,
      offset: [0, 8],
      maxWidth: "none",
      hideOnClick: false,
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
              boundary: "viewport",
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

    // Méthode 1: Utiliser coordsAtPos (méthode native ProseMirror)
    const { from } = ed.state.selection;
    const coords = ed.view.coordsAtPos(from);

    // Trouver la table qui contient cette position
    const editorElement = ed.view.dom;
    const tables = Array.from(editorElement.querySelectorAll("table"));

    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      try {
        const tableRect = table.getBoundingClientRect();

        // Vérifier si la position ProseMirror est dans cette table
        const isInside =
          coords.left >= tableRect.left &&
          coords.left <= tableRect.right &&
          coords.top >= tableRect.top &&
          coords.top <= tableRect.bottom;

        if (isInside) {
          return tableRect;
        }
      } catch (error) {
        continue;
      }
    }

    // Fallback : utiliser la méthode DOM si ProseMirror échoue
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      if (rect.width > 0 && rect.height > 0) {
        return rect;
      }
    }

    // Dernier fallback : première table
    if (tables.length > 0) {
      return tables[0].getBoundingClientRect();
    }

    return new DOMRect(0, 0, 0, 0);
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

    // Mettre à jour la position
    this.tippyInstance.setProps({
      getReferenceClientRect: () => this.getTableRect(),
    });

    this.tippyInstance.show();
  }

  hideTippy() {
    if (!this.tippyInstance) return;
    this.tippyInstance.hide();
  }

  // Actions de lignes
  addRowBefore() {
    this.commandsService.addRowBefore(this.editor());
  }

  addRowAfter() {
    this.commandsService.addRowAfter(this.editor());
  }

  deleteRow() {
    this.commandsService.deleteRow(this.editor());
  }

  // Actions de colonnes
  addColumnBefore() {
    this.commandsService.addColumnBefore(this.editor());
  }

  addColumnAfter() {
    this.commandsService.addColumnAfter(this.editor());
  }

  deleteColumn() {
    this.commandsService.deleteColumn(this.editor());
  }

  // Actions de headers
  toggleHeaderRow() {
    this.commandsService.toggleHeaderRow(this.editor());
  }

  toggleHeaderColumn() {
    this.commandsService.toggleHeaderColumn(this.editor());
  }

  // Actions de table
  deleteTable() {
    this.commandsService.deleteTable(this.editor());
  }
}
