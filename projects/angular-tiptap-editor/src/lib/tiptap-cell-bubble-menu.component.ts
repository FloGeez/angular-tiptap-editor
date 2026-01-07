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
import { CellSelection } from "@tiptap/pm/tables";
import tippy, { Instance as TippyInstance } from "tippy.js";
import { TiptapI18nService } from "./services/i18n.service";
import { EditorCommandsService } from "./services/editor-commands.service";
import { TiptapButtonComponent } from "./tiptap-button.component";

export interface CellBubbleMenuConfig {
  mergeCells?: boolean;
  splitCell?: boolean;
}

@Component({
  selector: "tiptap-cell-bubble-menu",
  standalone: true,
  imports: [CommonModule, TiptapButtonComponent],
  template: `
    <div #menuElement class="bubble-menu">
      <!-- Actions spécifiques aux cellules -->
      @if (config().mergeCells !== false && !isSingleCellSelected) {
      <tiptap-button
        icon="cell_merge"
        title="{{ i18n.table().mergeCells }}"
        (click)="mergeCells()"
      ></tiptap-button>
      } @if (config().splitCell !== false && isSingleCellSelected) {
      <tiptap-button
        icon="split_scene"
        title="{{ i18n.table().splitCell }}"
        (click)="splitCell()"
      ></tiptap-button>
      }
    </div>
  `,
  styles: [],
})
export class TiptapCellBubbleMenuComponent implements OnInit, OnDestroy {
  @ViewChild("menuElement", { static: true }) menuElement!: ElementRef;

  // Inputs
  editor = input.required<Editor>();
  config = input<CellBubbleMenuConfig>({});

  // Services
  private i18nService = inject(TiptapI18nService);
  private commandsService = inject(EditorCommandsService);

  // Tippy instance
  private tippyInstance: TippyInstance | null = null;
  private updateTimeout: any = null;

  // Signaux
  readonly i18n = this.i18nService;
  isSingleCellSelected: boolean = false;

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
        const host = this.editor().options.element.closest("angular-tiptap-editor");
        return host || document.body;
      },
      interactive: true,
      arrow: false,
      offset: [0, 8],
      hideOnClick: false,
      onShow: (instance) => {
        // S'assurer que les autres menus sont fermés
        this.hideOtherMenus();
      },
      getReferenceClientRect: () => this.getCellRect(),
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

  private getCellRect(): DOMRect {
    const ed = this.editor();
    if (!ed) return new DOMRect(0, 0, 0, 0);

    // Détecter la sélection de cellules
    const { from, to } = ed.state.selection;
    const hasCellSelection = from !== to;

    if (!hasCellSelection) {
      return new DOMRect(0, 0, 0, 0);
    }

    // Obtenir les coordonnées de la sélection
    const coords = ed.view.coordsAtPos(from);
    const endCoords = ed.view.coordsAtPos(to);

    // Créer un rectangle englobant la sélection
    const rect = new DOMRect(
      Math.min(coords.left, endCoords.left),
      Math.min(coords.top, endCoords.top),
      Math.abs(endCoords.left - coords.left),
      Math.abs(endCoords.top - coords.top)
    );

    return rect;
  }

  updateMenu = () => {
    // Debounce pour éviter les appels trop fréquents
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    this.updateTimeout = setTimeout(() => {
      const ed = this.editor();
      if (!ed) return;

      const { selection } = ed.state;
      const { from, to } = selection;

      // Détecter spécifiquement la sélection de CELLULES (pas de texte)
      const hasCellSelection = selection instanceof CellSelection;
      // Une seule cellule si ancre et tête pointent vers la même cellule
      this.isSingleCellSelected =
        hasCellSelection &&
        (selection as CellSelection).$anchorCell.pos ===
          (selection as CellSelection).$headCell.pos;
      const hasTextSelection =
        !selection.empty && !(selection instanceof CellSelection);
      const isTableCell =
        ed.isActive("tableCell") || ed.isActive("tableHeader");


      // Le menu de cellule ne s'affiche QUE pour les sélections de cellules multiples
      // (pas pour la sélection de texte dans une cellule)
      const shouldShow = hasCellSelection && isTableCell && ed.isEditable;

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
    // Masquer tous les autres menus quand le menu de cellules est actif
    this.hideTableMenu();
    this.hideTextBubbleMenu();
  }

  private showTippy() {
    if (!this.tippyInstance) return;

    // Masquer les autres menus avant d'afficher le menu de cellules
    this.hideTableMenu();
    this.hideTextBubbleMenu();

    // Mettre à jour la position
    this.tippyInstance.setProps({
      getReferenceClientRect: () => this.getCellRect(),
    });

    this.tippyInstance.show();
  }

  private hideTableMenu() {
    // Masquer le menu de table quand le menu de cellules est actif
    const tableMenu = document.querySelector("tiptap-table-bubble-menu");
    if (tableMenu) {
      const tippyInstance = (tableMenu as any)._tippy;
      if (tippyInstance) {
        tippyInstance.hide();
      }
    }

    // Alternative : masquer via l'élément Angular
    const tableMenuComponent = document.querySelector(
      "tiptap-table-bubble-menu"
    ) as any;
    if (tableMenuComponent && tableMenuComponent.hideTippy) {
      tableMenuComponent.hideTippy();
    }
  }

  private hideTextBubbleMenu() {
    // Masquer le menu de texte (bubble menu général) quand le menu de cellules est actif
    const textMenu = document.querySelector("tiptap-bubble-menu");
    if (textMenu) {
      const tippyInstance = (textMenu as any)._tippy;
      if (tippyInstance) {
        tippyInstance.hide();
      }
    }

    // Alternative : masquer via l'élément Angular
    const textMenuComponent = document.querySelector(
      "tiptap-bubble-menu"
    ) as any;
    if (textMenuComponent && textMenuComponent.hideTippy) {
      textMenuComponent.hideTippy();
    }
  }

  hideTippy() {
    if (!this.tippyInstance) return;
    this.tippyInstance.hide();
  }

  // Actions spécifiques aux cellules
  mergeCells() {
    this.commandsService.mergeCells(this.editor());
  }

  splitCell() {
    this.commandsService.splitCell(this.editor());
  }
}
