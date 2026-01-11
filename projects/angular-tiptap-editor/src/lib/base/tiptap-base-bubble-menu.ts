import {
    Directive,
    input,
    ViewChild,
    ElementRef,
    OnInit,
    OnDestroy,
    inject,
    signal,
    effect,
} from "@angular/core";
import tippy, { Instance as TippyInstance, sticky } from "tippy.js";
import { Editor } from "@tiptap/core";
import { EditorCommandsService } from "../services/editor-commands.service";
import { TiptapI18nService } from "../services/i18n.service";

/**
 * Base abstract class for all Bubble Menus (Text, Image, Table, Cell).
 * Handles common logic for Tippy.js initialization, positioning, and visibility.
 */
@Directive()
export abstract class TiptapBaseBubbleMenu implements OnInit, OnDestroy {
    protected readonly i18nService = inject(TiptapI18nService);
    protected readonly editorCommands = inject(EditorCommandsService);

    // Core Inputs
    editor = input.required<Editor>();

    // Required ViewChild for the menu container
    @ViewChild("menuRef", { static: false }) menuRef!: ElementRef<HTMLDivElement>;

    // Internal State
    protected tippyInstance: TippyInstance | null = null;
    protected updateTimeout: any = null;
    protected isToolbarInteracting = signal(false);

    // Reactive state alias for templates
    readonly state = this.editorCommands.editorState;

    constructor() {
        // Effect to reactively update the menu when editor state or toolbar interaction changes
        effect(() => {
            this.state();
            this.isToolbarInteracting();
            this.updateMenu();
        });
    }

    ngOnInit() {
        this.initTippy();
    }

    ngOnDestroy() {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }
        if (this.tippyInstance) {
            this.tippyInstance.destroy();
            this.tippyInstance = null;
        }
    }

    /**
     * Initializes the Tippy instance.
     * Can be overridden for specific Tippy configurations.
     */
    protected initTippy() {
        if (!this.menuRef?.nativeElement) {
            // Re-try if the view child is not yet available
            setTimeout(() => this.initTippy(), 50);
            return;
        }

        const menuElement = this.menuRef.nativeElement;

        if (this.tippyInstance) {
            this.tippyInstance.destroy();
        }

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
            getReferenceClientRect: () => this.getSelectionRect(),
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
            onShow: (instance) => this.onTippyShow(instance),
            onHide: (instance) => this.onTippyHide(instance),
        });

        this.updateMenu();
    }

    /**
     * Core logic to decide whether to show or hide the menu.
     */
    updateMenu = () => {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
        }

        this.updateTimeout = setTimeout(() => {
            const ed = this.editor();
            if (!ed) return;

            if (this.isToolbarInteracting()) {
                this.hideTippy();
                return;
            }

            if (this.shouldShow()) {
                this.showTippy();
            } else {
                this.hideTippy();
            }
        }, 10);
    };

    /**
     * Helper to show the Tippy instance with updated positioning.
     */
    showTippy() {
        if (!this.tippyInstance) return;
        this.tippyInstance.setProps({
            getReferenceClientRect: () => this.getSelectionRect(),
            sticky: "reference",
        });
        this.tippyInstance.show();
    }

    /**
     * Helper to hide the Tippy instance.
     */
    hideTippy() {
        if (this.tippyInstance) {
            this.tippyInstance.setProps({ sticky: false });
            this.tippyInstance.hide();
        }
    }

    /**
     * Common command handler for buttons in the menu.
     */
    onCommand(command: string, event: Event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const ed = this.editor();
        if (ed) {
            this.executeCommand(ed, command);
            this.updateMenu();
        }
    }

    /**
     * Signal from the parent editor that the user is interacting with the main toolbar.
     */
    setToolbarInteracting(isInteracting: boolean) {
        this.isToolbarInteracting.set(isInteracting);
        this.updateMenu();
    }

    // --- Abstract methods to be implemented by sub-components ---

    /**
     * Returns the Rect representing the target for positioning the menu.
     */
    abstract getSelectionRect(): DOMRect;

    /**
     * Returns whether the menu should be displayed based on current state.
     */
    abstract shouldShow(): boolean;

    /**
     * Executes the given command on the editor.
     */
    protected abstract executeCommand(editor: Editor, command: string): void;

    /**
     * Optional hook called when Tippy is about to be shown.
     */
    protected onTippyShow(instance: TippyInstance) { }

    /**
     * Optional hook called when Tippy is about to be hidden.
     */
    protected onTippyHide(instance: TippyInstance) { }
}
