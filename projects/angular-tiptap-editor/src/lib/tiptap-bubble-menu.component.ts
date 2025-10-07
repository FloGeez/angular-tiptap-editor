import {
  Component,
  input,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  effect,
  signal,
  computed,
} from "@angular/core";
import tippy, { Instance as TippyInstance } from "tippy.js";
import type { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { TiptapButtonComponent } from "./tiptap-button.component";

type LogLevel = 'debug' | 'warn' | 'error';

export interface BubbleMenuConfig {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  highlight?: boolean;
  link?: boolean;
  separator?: boolean;
  loglevel?: LogLevel;
}

@Component({
  selector: "tiptap-bubble-menu",
  standalone: true,
  imports: [TiptapButtonComponent],
  template: `
    <div #menuRef class="bubble-menu">
      @if (bubbleMenuConfig().bold) {
      <tiptap-button
        icon="format_bold"
        title="Gras"
        [active]="isActive('bold')"
        (click)="onCommand('bold', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().italic) {
      <tiptap-button
        icon="format_italic"
        title="Italique"
        [active]="isActive('italic')"
        (click)="onCommand('italic', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().underline) {
      <tiptap-button
        icon="format_underlined"
        title="Souligné"
        [active]="isActive('underline')"
        (click)="onCommand('underline', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().strike) {
      <tiptap-button
        icon="strikethrough_s"
        title="Barré"
        [active]="isActive('strike')"
        (click)="onCommand('strike', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().superscript) {
      <tiptap-button
        icon="superscript"
        title="Exposant"
        [active]="isActive('superscript')"
        (click)="onCommand('superscript', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().subscript) {
      <tiptap-button
        icon="subscript"
        title="Indice"
        [active]="isActive('subscript')"
        (click)="onCommand('subscript', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().highlight) {
      <tiptap-button
        icon="highlight"
        title="Surbrillance"
        [active]="isActive('highlight')"
        (click)="onCommand('highlight', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().separator && (bubbleMenuConfig().code ||
      bubbleMenuConfig().link)) {
      <div class="tiptap-separator"></div>
      } @if (bubbleMenuConfig().code) {
      <tiptap-button
        icon="code"
        title="Code"
        [active]="isActive('code')"
        (click)="onCommand('code', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().link) {
      <tiptap-button
        icon="link"
        title="Lien"
        [active]="isActive('link')"
        (click)="onCommand('link', $event)"
      ></tiptap-button>
      }
    </div>
  `,
  styles: [],
})
export class TiptapBubbleMenuComponent implements OnInit, OnDestroy {
  /**
   * Log level for bubble menu events. Only 'debug' will show console logs.
   */
  loglevel: LogLevel = 'warn';

  private debugLog(...args: any[]) {
    if (this.loglevel === 'debug') {
      console.log(...args);
    }
  }
  editor = input.required<Editor>();
  config = input<BubbleMenuConfig>({
    bold: true,
    italic: true,
    underline: true,
    strike: true,
    code: true,
    superscript: false,
    subscript: false,
    highlight: true,
    link: true,
    separator: true,
  });

  @ViewChild("menuRef", { static: false }) menuRef!: ElementRef<HTMLDivElement>;

  private tippyInstance: TippyInstance | null = null;
  private updateTimeout: any = null;

  bubbleMenuConfig = computed(() => ({
    bold: true,
    italic: true,
    underline: true,
    strike: true,
    code: true,
    superscript: false,
    subscript: false,
    highlight: true,
    link: true,
    separator: true,
    ...this.config(),
  }));

  // Effect comme propriété de classe pour éviter l'erreur d'injection context
  constructor() {
    effect(() => {
      const ed = this.editor();
      if (!ed) return;

      // Nettoyer les anciens listeners
      ed.off("selectionUpdate", this.updateMenu);
      ed.off("transaction", this.updateMenu);
      ed.off("focus", this.updateMenu);
      ed.off("blur", this.handleBlur);

      // Ajouter les nouveaux listeners
      ed.on("selectionUpdate", this.updateMenu);
      ed.on("transaction", this.updateMenu);
      ed.on("focus", this.updateMenu);
      ed.on("blur", this.handleBlur);

      // Ne pas appeler updateMenu() ici pour éviter l'affichage prématuré
      // Il sera appelé automatiquement quand l'éditeur sera prêt
    });
  }

  ngOnInit() {
    // Initialiser Tippy de manière synchrone après que le component soit ready
    this.initTippy();
  }

  ngOnDestroy() {
    const ed = this.editor();
    if (ed) {
      ed.off("selectionUpdate", this.updateMenu);
      ed.off("transaction", this.updateMenu);
      ed.off("focus", this.updateMenu);
      ed.off("blur", this.handleBlur);
    }

    // Nettoyer les timeouts
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }

    // Nettoyer Tippy
    if (this.tippyInstance) {
      this.tippyInstance.destroy();
      this.tippyInstance = null;
    }
  }

  private initTippy() {
    // Attendre que l'élément soit disponible
    if (!this.menuRef?.nativeElement) {
      setTimeout(() => this.initTippy(), 50);
      return;
    }

    const menuElement = this.menuRef.nativeElement;

    // S'assurer qu'il n'y a pas déjà une instance
    if (this.tippyInstance) {
      this.tippyInstance.destroy();
    }

    // Créer l'instance Tippy
    this.tippyInstance = tippy(document.body, {
      content: menuElement,
      trigger: "manual",
      placement: "top-start",
      appendTo: () => document.body,
      interactive: true,
      arrow: false,
      offset: [0, 8],
      hideOnClick: false,
      onShow: (instance) => {
        // S'assurer que les autres menus sont fermés
        this.hideOtherMenus();
      },
      getReferenceClientRect: () => this.getSelectionRect(),
      // Améliorer le positionnement avec scroll
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

  private getSelectionRect(): DOMRect {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return new DOMRect(0, 0, 0, 0);
    }

    const range = selection.getRangeAt(0);
    return range.getBoundingClientRect();
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
      const hasTextSelection =
        from !== to && !(selection instanceof CellSelection);
      const isImageSelected =
        ed.isActive("image") || ed.isActive("resizableImage");
      const isTableCellSelected =
        ed.isActive("tableCell") || ed.isActive("tableHeader");
      const hasCellSelection = selection instanceof CellSelection;

        this.debugLog("TextBubbleMenu - updateMenu:", {
        hasTextSelection,
        isImageSelected,
        isTableCellSelected,
        hasCellSelection,
        selectionType: selection.constructor.name,
        selectionEmpty: selection.empty,
        from,
        to,
      });

      // Ne montrer le menu texte que si :
      // - Il y a une sélection de texte (pas une sélection de cellules multiples)
      // - Aucune image n'est sélectionnée (priorité aux images)
      // - Ce n'est pas une sélection de cellules multiples (CellSelection)
      // - L'éditeur est éditable
      // Note: Le texte dans une cellule est autorisé (isTableCellSelected peut être true)
      const shouldShow =
        hasTextSelection &&
        !isImageSelected &&
        !hasCellSelection &&
        ed.isEditable;

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
    // Pour l'instant, elle sert de placeholder pour une future coordination entre menus
  }

  private showTippy() {
    if (!this.tippyInstance) return;

    // Mettre à jour la position
    this.tippyInstance.setProps({
      getReferenceClientRect: () => this.getSelectionRect(),
    });

    this.tippyInstance.show();
  }

  hideTippy() {
    if (this.tippyInstance) {
      this.tippyInstance.hide();
    }
  }

  isActive(mark: string): boolean {
    const ed = this.editor();
    return ed?.isActive(mark) || false;
  }

  onCommand(command: string, event: MouseEvent) {
    event.preventDefault();
    const ed = this.editor();
    if (!ed) return;

    switch (command) {
      case "bold":
        ed.chain().focus().toggleBold().run();
        break;
      case "italic":
        ed.chain().focus().toggleItalic().run();
        break;
      case "underline":
        ed.chain().focus().toggleUnderline().run();
        break;
      case "strike":
        ed.chain().focus().toggleStrike().run();
        break;
      case "code":
        ed.chain().focus().toggleCode().run();
        break;
      case "superscript":
        ed.chain().focus().toggleSuperscript().run();
        break;
      case "subscript":
        ed.chain().focus().toggleSubscript().run();
        break;
      case "highlight":
        ed.chain().focus().toggleHighlight().run();
        break;
      case "link":
        const href = window.prompt("URL du lien:");
        if (href) {
          ed.chain().focus().toggleLink({ href }).run();
        }
        break;
    }
  }
}
