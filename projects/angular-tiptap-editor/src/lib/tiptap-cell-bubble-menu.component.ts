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

import { CellBubbleMenuConfig } from "./models/bubble-menu.model";

@Component({
    selector: "tiptap-cell-bubble-menu",
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CommonModule, TiptapButtonComponent],
    template: `
    <div #menuElement class="bubble-menu">
      <!-- Actions spécifiques aux cellules -->
      @if (config().mergeCells !== false && !state().selection.isSingleCell) {
      <tiptap-button
        icon="cell_merge"
        [title]="i18n.table().mergeCells"
        [disabled]="!state().can.mergeCells"
        (onClick)="onCommand('mergeCells')"
      ></tiptap-button>
      } @if (config().splitCell !== false && state().selection.isSingleCell) {
      <tiptap-button
        icon="split_scene"
        [title]="i18n.table().splitCell"
        [disabled]="!state().can.splitCell"
        (onClick)="onCommand('splitCell')"
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
    readonly editorCommands = inject(EditorCommandsService);

    // Alias pour le template
    readonly state = this.editorCommands.editorState;

    // Tippy instance
    private tippyInstance: TippyInstance | null = null;
    private updateTimeout: any = null;

    // Signaux
    readonly i18n = this.i18nService;

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
            getReferenceClientRect: () => this.getCellRect(),
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

    private getCellRect(): DOMRect {
        const ed = this.editor();
        if (!ed) return new DOMRect(0, 0, 0, 0);

        // Sélection de cellules
        const selection = ed.state.selection as any;
        if (selection.$anchorCell && selection.$headCell) {
            const anchor = ed.view.nodeDOM(selection.$anchorCell.pos) as HTMLElement;
            const head = ed.view.nodeDOM(selection.$headCell.pos) as HTMLElement;

            if (anchor && head) {
                const anchorRect = anchor.getBoundingClientRect();
                const headRect = head.getBoundingClientRect();

                const top = Math.min(anchorRect.top, headRect.top);
                const bottom = Math.max(anchorRect.bottom, headRect.bottom);
                const left = Math.min(anchorRect.left, headRect.left);
                const right = Math.max(anchorRect.right, headRect.right);

                return new DOMRect(left, top, right - left, bottom - top);
            }
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

            // Le menu de cellule ne s'affiche QUE pour les sélections de cellules (CellSelection)
            const shouldShow =
                selection.type === 'cell' &&
                nodes.isTableCell &&
                isEditable &&
                isFocused;

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
        this.hideTableMenu();
        this.hideTextBubbleMenu();
    }

    private showTippy() {
        if (!this.tippyInstance) return;

        // Masquer les autres menus avant d'afficher le menu de cellules
        this.hideTableMenu();
        this.hideTextBubbleMenu();

        // Mettre à jour la position et activer le polling sticky uniquement si visible
        this.tippyInstance.setProps({
            getReferenceClientRect: () => this.getCellRect(),
            sticky: "reference",
        });

        this.tippyInstance.show();
    }

    private hideTableMenu() {
        const tableMenu = document.querySelector("tiptap-table-bubble-menu") as any;
        if (tableMenu && tableMenu.hideTippy) {
            tableMenu.hideTippy();
        }
    }

    private hideTextBubbleMenu() {
        const textMenu = document.querySelector("tiptap-bubble-menu") as any;
        if (textMenu && textMenu.hideTippy) {
            textMenu.hideTippy();
        }
    }

    hideTippy() {
        if (this.tippyInstance) {
            this.tippyInstance.setProps({ sticky: false });
            this.tippyInstance.hide();
        }
    }

    onCommand(command: string) {
        this.editorCommands.execute(this.editor(), command);
        this.updateMenu();
    }
}
