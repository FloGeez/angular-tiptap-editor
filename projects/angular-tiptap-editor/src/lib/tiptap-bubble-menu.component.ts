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
    inject,
    ChangeDetectionStrategy,
} from "@angular/core";
import tippy, { Instance as TippyInstance, sticky } from "tippy.js";
import type { Editor } from "@tiptap/core";
import { CellSelection } from "@tiptap/pm/tables";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapColorPickerComponent } from "./components/tiptap-color-picker.component";
import { EditorCommandsService } from "./services/editor-commands.service";
import { TiptapI18nService } from "./services/i18n.service";

import { BubbleMenuConfig } from "./models/bubble-menu.model";

@Component({
    selector: "tiptap-bubble-menu",
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        TiptapButtonComponent,
        TiptapColorPickerComponent,
    ],
    template: `
    <div #menuRef class="bubble-menu">
      @if (bubbleMenuConfig().bold) {
      <tiptap-button
        icon="format_bold"
        [title]="t().bold"
        [active]="state().marks.bold"
        [disabled]="!state().can.toggleBold"
        (click)="onCommand('toggleBold', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().italic) {
      <tiptap-button
        icon="format_italic"
        [title]="t().italic"
        [active]="state().marks.italic"
        [disabled]="!state().can.toggleItalic"
        (click)="onCommand('toggleItalic', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().underline) {
      <tiptap-button
        icon="format_underlined"
        [title]="t().underline"
        [active]="state().marks.underline"
        [disabled]="!state().can.toggleUnderline"
        (click)="onCommand('toggleUnderline', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().strike) {
      <tiptap-button
        icon="strikethrough_s"
        [title]="t().strike"
        [active]="state().marks.strike"
        [disabled]="!state().can.toggleStrike"
        (click)="onCommand('toggleStrike', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().code) {
      <tiptap-button
        icon="code"
        [title]="t().code"
        [active]="state().marks.code"
        [disabled]="!state().can.toggleCode"
        (click)="onCommand('toggleCode', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().superscript) {
      <tiptap-button
        icon="superscript"
        [title]="t().superscript"
        [active]="state().marks.superscript"
        [disabled]="!state().can.toggleSuperscript"
        (click)="onCommand('toggleSuperscript', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().subscript) {
      <tiptap-button
        icon="subscript"
        [title]="t().subscript"
        [active]="state().marks.subscript"
        [disabled]="!state().can.toggleSubscript"
        (click)="onCommand('toggleSubscript', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().highlight) {
      <tiptap-button
        icon="highlight"
        [title]="t().highlight"
        [active]="state().marks.highlight"
        [disabled]="!state().can.toggleHighlight"
        (click)="onCommand('toggleHighlight', $event)"
      ></tiptap-button>
      } @if (bubbleMenuConfig().highlightPicker) {
      <tiptap-color-picker
        #highlightPicker
        mode="highlight"
        [editor]="editor()"
        [disabled]="!state().can.toggleHighlight"
        (interactionChange)="onColorPickerInteractionChange($event)"
        (requestUpdate)="updateMenu()"
      />
      } @if (bubbleMenuConfig().textColor) {
      <tiptap-color-picker
        #textColorPicker
        mode="text"
        [editor]="editor()"
        [disabled]="!state().can.toggleBold"
        (interactionChange)="onColorPickerInteractionChange($event)"
        (requestUpdate)="updateMenu()"
      />
      } @if (bubbleMenuConfig().link) {
      <tiptap-button
        icon="link"
        [title]="t().link"
        [active]="state().marks.link"
        [disabled]="!state().can.toggleLink"
        (click)="onCommand('toggleLink', $event)"
      ></tiptap-button>
      }
    </div>
  `,
})
export class TiptapBubbleMenuComponent implements OnInit, OnDestroy {
    private readonly i18nService = inject(TiptapI18nService);
    readonly editorCommands = inject(EditorCommandsService);
    readonly t = this.i18nService.bubbleMenu;

    // Alias pour le template
    readonly state = this.editorCommands.editorState;

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
        textColor: false,
        link: true,
        separator: true,
    });

    @ViewChild("menuRef", { static: false }) menuRef!: ElementRef<HTMLDivElement>;
    @ViewChild("textColorPicker", { static: false })
    private textColorPicker?: TiptapColorPickerComponent;
    @ViewChild("highlightPicker", { static: false })
    private highlightPicker?: TiptapColorPickerComponent;

    private tippyInstance: TippyInstance | null = null;
    private updateTimeout: any = null;

    private isColorPickerInteracting = false;
    private isToolbarInteracting = signal(false);

    bubbleMenuConfig = computed(() => ({
        bold: true,
        italic: true,
        underline: true,
        strike: true,
        code: true,
        superscript: false,
        subscript: false,
        highlight: true,
        textColor: false,
        link: true,
        separator: true,
        ...this.config(),
    }));

    /**
     * Keep bubble menu visible while the native color picker steals focus.
     */
    onColorPickerInteractionChange(isInteracting: boolean) {
        this.isColorPickerInteracting = isInteracting;
    }

    // Effect reactif pour mettre à jour le menu quand l'état change
    constructor() {
        effect(() => {
            // Re-évaluer visibilité quand l'état change
            this.state();
            this.updateMenu();
        });
    }

    ngOnInit() {
        // Initialiser Tippy de manière synchrone après que le component soit ready
        this.initTippy();
    }

    ngOnDestroy() {

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
            appendTo: (ref) => {
                const ed = this.editor();
                return ed ? ed.options.element : document.body;
            },
            interactive: true,
            arrow: false,
            offset: [0, 8],
            hideOnClick: false,
            plugins: [sticky],
            sticky: false,
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

    private getSelectionRect(): DOMRect {
        const ed = this.editor();
        if (!ed) return new DOMRect(0, 0, 0, 0);

        const { from, to } = ed.state.selection;
        if (from === to) return new DOMRect(-9999, -9999, 0, 0);

        // 1. Try native selection for multi-line accuracy
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Ensure the rect is valid and belongs to the editor
            if (rect.width > 0 && rect.height > 0) {
                return rect;
            }
        }

        // 2. Fallback to Tiptap coordinates for precision (single line / edge cases)
        const start = ed.view.coordsAtPos(from);
        const end = ed.view.coordsAtPos(to);

        const top = Math.min(start.top, end.top);
        const bottom = Math.max(start.bottom, end.bottom);
        const left = Math.min(start.left, end.left);
        const right = Math.max(start.right, end.right);

        return new DOMRect(left, top, right - left, bottom - top);
    }

    updateMenu = () => {
        // Debounce pour éviter les appels trop fréquents
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        this.updateTimeout = setTimeout(() => {
            const ed = this.editor();
            if (!ed) return;

            if (!this.isColorPickerInteracting) {
                if (this.textColorPicker) this.textColorPicker.done();
                if (this.highlightPicker) this.highlightPicker.done();
            }

            const { selection, nodes, isEditable, isFocused } = this.state();

            if (this.isToolbarInteracting()) {
                this.hideTippy();
                return;
            }

            // Ne montrer le menu texte que si :
            // - Il y a une sélection de texte (selection.type === 'text') ET non vide (selection.empty === false)
            // - Aucune image n'est sélectionnée (priorité aux images)
            // - Ce n'est pas une sélection de table entière (nodes.isTableNodeSelected)
            // - L'éditeur a le focus et est éditable
            const shouldShow =
                selection.type === 'text' &&
                !selection.empty &&
                !nodes.isImage &&
                !nodes.isTableNodeSelected &&
                isEditable &&
                isFocused;

            if (shouldShow) {
                this.showTippy();
            } else {
                if (!this.isColorPickerInteracting) {
                    this.hideTippy();
                }
            }
        }, 10);
    };

    handleBlur = () => {
        // Masquer le menu quand l'éditeur perd le focus
        setTimeout(() => {
            if (!this.isColorPickerInteracting) {
                if (this.textColorPicker) this.textColorPicker.done();
                if (this.highlightPicker) this.highlightPicker.done();
                this.hideTippy();
            }
        }, 100);
    };

    private hideOtherMenus() {
        // Cette méthode peut être étendue pour fermer d'autres menus si nécessaire
        // Pour l'instant, elle sert de placeholder pour une future coordination entre menus
    }

    private showTippy() {
        if (!this.tippyInstance) return;

        // Mettre à jour la position et activer le polling sticky uniquement si visible
        this.tippyInstance.setProps({
            getReferenceClientRect: () => this.getSelectionRect(),
            sticky: "reference",
        });

        this.tippyInstance.show();
    }

    hideTippy() {
        if (this.tippyInstance) {
            this.tippyInstance.setProps({ sticky: false });
            this.tippyInstance.hide();
        }
    }

    isActive(mark: string): boolean {
        return this.editor()?.isActive(mark) || false;
    }

    canExecute(command: string): boolean {
        return this.editorCommands.canExecute(this.editor(), command);
    }

    onCommand(command: string, event: MouseEvent) {
        event.preventDefault();
        const ed = this.editor();
        if (ed) {
            this.editorCommands.execute(ed, command);
        }
    }

    setToolbarInteracting(isInteracting: boolean) {
        this.isToolbarInteracting.set(isInteracting);
        this.updateMenu();
    }
}
