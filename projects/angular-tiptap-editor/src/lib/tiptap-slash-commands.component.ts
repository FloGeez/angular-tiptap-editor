import {
  Component,
  input,
  output,
  ViewChild,
  ElementRef,
  OnInit,
  OnDestroy,
  effect,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from "@angular/core";
import tippy, { Instance as TippyInstance, sticky } from "tippy.js";
import { Editor } from "@tiptap/core";
import { TiptapI18nService } from "./services/i18n.service";
import { EditorCommandsService } from "./services/editor-commands.service";
import {
  filterSlashCommands,
  createDefaultSlashCommands
} from "./config/slash-commands.config";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  keywords: string[];
  command: (editor: Editor) => void;
}

export interface CustomSlashCommands {
  commands?: SlashCommandItem[];
}

// Default command definitions are now centralized in src/lib/config/slash-commands.config.ts

@Component({
  selector: "tiptap-slash-commands",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #menuRef class="slash-commands-menu">
      @for (command of filteredCommands(); track command.title) {
      <div
        class="slash-command-item"
        [class.selected]="$index === selectedIndex()"
        (mousedown)="executeCommand(command); $event.preventDefault(); $event.stopPropagation()"
        (mouseenter)="selectedIndex.set($index)"
      >
        <div class="slash-command-icon">
          <span class="material-symbols-outlined">{{ command.icon }}</span>
        </div>
        <div class="slash-command-content">
          <div class="slash-command-title">{{ command.title }}</div>
          <div class="slash-command-description">{{ command.description }}</div>
        </div>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .slash-commands-menu {
        background: var(--ate-menu-bg);
        border: 1px solid var(--ate-menu-border);
        border-radius: var(--ate-menu-border-radius, 12px);
        box-shadow: var(--ate-menu-shadow);
        padding: var(--ate-menu-padding);
        max-height: 320px;
        overflow-y: auto;
        min-width: 280px;
        outline: none;
        animation: slashMenuFadeIn 0.2s cubic-bezier(0, 0, 0.2, 1);
        scrollbar-width: thin;
        scrollbar-color: var(--ate-scrollbar-thumb) var(--ate-scrollbar-track);
      }

      .slash-commands-menu::-webkit-scrollbar {
        width: var(--ate-scrollbar-width);
      }

      .slash-commands-menu::-webkit-scrollbar-track {
        background: var(--ate-scrollbar-track);
      }

      .slash-commands-menu::-webkit-scrollbar-thumb {
        background: var(--ate-scrollbar-thumb);
        border: 3px solid transparent;
        background-clip: content-box;
        border-radius: 10px;
      }

      .slash-commands-menu::-webkit-scrollbar-thumb:hover {
        background: var(--ate-scrollbar-thumb-hover);
        background-clip: content-box;
      }

      @keyframes slashMenuFadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .slash-command-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: var(--ate-menu-padding);
        border-radius: var(--ate-menu-border-radius, 8px);
        cursor: pointer;
        transition: all 0.15s ease;
        border: var(--ate-border-width, 1px) solid transparent;
        outline: none;
        margin-bottom: 2px;
      }

      .slash-command-item:last-child {
        margin-bottom: 0;
      }

      .slash-command-item:hover {
        background: var(--ate-surface-secondary);
      }

      .slash-command-item.selected {
        background: var(--ate-primary-light);
        border-color: var(--ate-primary-light-alpha);
      }

      .slash-command-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: var(--ate-surface-tertiary);
        border-radius: var(--ate-sub-border-radius, 8px);
        color: var(--ate-primary);
        flex-shrink: 0;
        transition: all 0.15s ease;
      }

      .slash-command-item.selected .slash-command-icon {
        background: var(--ate-primary);
        color: var(--ate-primary-contrast, #ffffff);
      }

      .slash-command-icon .material-symbols-outlined {
        font-size: 18px;
      }

      .slash-command-content {
        flex: 1;
        min-width: 0;
      }

      .slash-command-title {
        font-weight: 500;
        color: var(--ate-text);
        font-size: 14px;
        margin-bottom: 1px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .slash-command-description {
        color: var(--ate-text-secondary);
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `,
  ],
})
export class TiptapSlashCommandsComponent implements OnInit, OnDestroy {
  readonly i18nService = inject(TiptapI18nService);
  editor = input.required<Editor>();
  config = input<CustomSlashCommands | undefined>(undefined);

  @ViewChild("menuRef", { static: false }) menuRef!: ElementRef<HTMLDivElement>;

  private tippyInstance: TippyInstance | null = null;
  private editorCommands = inject(EditorCommandsService);

  // Local state
  private isActive = false;
  private currentQuery = signal("");
  private slashRange: { from: number; to: number } | null = null;

  // Signal for selected index
  selectedIndex = signal(0);

  // Toolbar interaction state (from centralized service)
  private readonly isToolbarInteracting = this.editorCommands.isToolbarInteracting;

  commands = computed(() => {
    const config = this.config();
    if (config && config.commands) {
      return config.commands;
    }

    // Fallback to default native commands
    return createDefaultSlashCommands(this.i18nService, this.editorCommands);
  });

  filteredCommands = computed(() => {
    const query = this.currentQuery().toLowerCase();
    const commands = this.commands();

    if (!query) {
      return commands;
    }

    return commands.filter(
      (command) =>
        command.title.toLowerCase().includes(query) ||
        command.description.toLowerCase().includes(query) ||
        command.keywords.some((keyword) =>
          keyword.toLowerCase().includes(query)
        )
    );
  });

  constructor() {
    effect(() => {
      const ed = this.editor();
      if (!ed) return;

      // Clean up old listeners
      ed.off("selectionUpdate", this.updateMenu);
      ed.off("transaction", this.updateMenu);
      ed.off("focus", this.updateMenu);
      ed.off("blur", this.handleBlur);

      // Add new listeners
      ed.on("selectionUpdate", this.updateMenu);
      ed.on("transaction", this.updateMenu);
      ed.on("focus", this.updateMenu);
      ed.on("blur", this.handleBlur);

      // Use ProseMirror plugin system to intercept keys
      this.addKeyboardPlugin(ed);

      // updateMenu() will be called automatically when editor is ready
    });
  }

  ngOnInit() {
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

    if (this.tippyInstance) {
      this.tippyInstance.destroy();
      this.tippyInstance = null;
    }
  }

  private initTippy() {
    if (!this.menuRef?.nativeElement) {
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
      placement: "bottom-start",
      theme: "slash-menu",
      appendTo: (ref) => {
        // Always try to climb up to editor host to inherit CSS variables
        const host = this.editor().options.element.closest("angular-tiptap-editor");
        return host || document.body;

      },
      interactive: true,
      arrow: false,
      offset: [0, 8],
      hideOnClick: true,
      plugins: [sticky],
      sticky: false,
      getReferenceClientRect: () => this.getSlashRect(),
      // Improve positioning with scroll
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
              fallbackPlacements: ["top-start", "bottom-end", "top-end"],
            },
          },
          {
            name: "hide",
          },
        ],
      },
    });

    // Initial check after Tippy is initialized
    this.updateMenu();
  }

  private getSlashRect(): DOMRect {
    const ed = this.editor();
    if (!ed || !this.slashRange) {
      return new DOMRect(-9999, -9999, 0, 0);
    }

    try {
      // Use ProseMirror coordinates for better precision
      const coords = ed.view.coordsAtPos(this.slashRange.from);
      return new DOMRect(
        coords.left,
        coords.top,
        0,
        coords.bottom - coords.top
      );
    } catch (error) {
      console.warn("Error calculating coordinates:", error);
      // Fallback to window.getSelection
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return new DOMRect(-9999, -9999, 0, 0);
      }
      const range = selection.getRangeAt(0);
      return range.getBoundingClientRect();
    }
  }

  updateMenu = () => {
    const ed = this.editor();
    if (!ed) return;

    const { from } = ed.state.selection;

    // Check if '/' was typed at the beginning of a line or after a space
    const textBefore = ed.state.doc.textBetween(
      Math.max(0, from - 20),
      from,
      "\n"
    );
    const slashMatch = textBefore.match(/(?:^|\s)\/([^\/\s]*)$/);

    if (slashMatch) {
      const query = slashMatch[1] || "";
      const wasActive = this.isActive;

      this.currentQuery.set(query);
      this.slashRange = {
        from: from - slashMatch[0].length + slashMatch[0].indexOf("/"),
        to: from,
      };

      // Reset index if menu just became active
      if (!wasActive) {
        this.selectedIndex.set(0);
      }

      this.isActive = true;

      if (this.isToolbarInteracting()) {
        this.hideTippy();
      } else {
        this.showTippy();
      }
    } else {
      this.isActive = false;
      this.hideTippy();
    }
  };

  handleBlur = () => {
    setTimeout(() => this.hideTippy(), 100);
  };

  handleKeyDown = (event: KeyboardEvent) => {
    // Only handle keys if menu is active
    if (!this.isActive || this.filteredCommands().length === 0) {
      return;
    }

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        event.stopPropagation();
        const nextIndex =
          (this.selectedIndex() + 1) % this.filteredCommands().length;
        this.selectedIndex.set(nextIndex);
        this.scrollToSelected();
        break;

      case "ArrowUp":
        event.preventDefault();
        event.stopPropagation();
        const prevIndex =
          this.selectedIndex() === 0
            ? this.filteredCommands().length - 1
            : this.selectedIndex() - 1;
        this.selectedIndex.set(prevIndex);
        this.scrollToSelected();
        break;

      case "Enter":
        event.preventDefault();
        event.stopPropagation();
        const selectedCommand = this.filteredCommands()[this.selectedIndex()];
        if (selectedCommand) {
          this.executeCommand(selectedCommand);
        }
        break;

      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        this.isActive = false;
        this.hideTippy();
        // Optional: remove the typed "/"
        const ed = this.editor();
        if (ed && this.slashRange) {
          const { tr } = ed.state;
          tr.delete(this.slashRange.from, this.slashRange.to);
          ed.view.dispatch(tr);
        }
        break;
    }
  };

  private scrollToSelected() {
    // Scroll to the selected element
    if (this.menuRef?.nativeElement) {
      const selectedItem = this.menuRef.nativeElement.querySelector(
        ".slash-command-item.selected"
      ) as HTMLElement;
      if (selectedItem) {
        selectedItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }

  private showTippy() {
    if (this.tippyInstance && this.filteredCommands().length > 0) {
      this.tippyInstance.setProps({ sticky: "reference" });
      this.tippyInstance.show();
    }
  }

  private hideTippy() {
    if (this.tippyInstance) {
      this.tippyInstance.setProps({ sticky: false });
      this.tippyInstance.hide();
    }
  }

  executeCommand(command: SlashCommandItem) {
    const ed = this.editor();
    if (!ed || !this.slashRange) return;

    // Remove slash text ("/")
    const { tr } = ed.state;
    tr.delete(this.slashRange.from, this.slashRange.to);
    ed.view.dispatch(tr);

    // Hide menu immediately
    this.hideTippy();
    this.isActive = false;

    // Give focus back to editor and execute command
    // Use a micro-delay to ensure ProseMirror DOM is stable after removing "/"
    setTimeout(() => {
      ed.commands.focus();
      command.command(ed);
    }, 10);
  }



  private addKeyboardPlugin(ed: Editor) {
    // Add a ProseMirror plugin to intercept keyboard events
    const keyboardPlugin = new Plugin({
      key: new PluginKey("slash-commands-keyboard"),
      props: {
        handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
          // Only handle if menu is active
          if (!this.isActive || this.filteredCommands().length === 0) {
            return false;
          }

          switch (event.key) {
            case "ArrowDown":
              event.preventDefault();
              const nextIndex =
                (this.selectedIndex() + 1) % this.filteredCommands().length;
              this.selectedIndex.set(nextIndex);
              this.scrollToSelected();
              return true;

            case "ArrowUp":
              event.preventDefault();
              const prevIndex =
                this.selectedIndex() === 0
                  ? this.filteredCommands().length - 1
                  : this.selectedIndex() - 1;
              this.selectedIndex.set(prevIndex);
              this.scrollToSelected();
              return true;

            case "Enter":
              event.preventDefault();
              const selectedCommand =
                this.filteredCommands()[this.selectedIndex()];
              if (selectedCommand) {
                this.executeCommand(selectedCommand);
              }
              return true;

            case "Escape":
              event.preventDefault();
              this.isActive = false;
              this.hideTippy();
              // Remove typed "/"
              if (this.slashRange) {
                const { tr } = view.state;
                tr.delete(this.slashRange.from, this.slashRange.to);
                view.dispatch(tr);
              }
              return true;
          }

          return false;
        },
      },
    });

    // Add plugin to editor
    ed.view.updateState(
      ed.view.state.reconfigure({
        plugins: [keyboardPlugin, ...ed.view.state.plugins],
      })
    );
  }
}
