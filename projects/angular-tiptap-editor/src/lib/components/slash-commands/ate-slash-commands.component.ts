import { Component, input, OnDestroy, effect, computed, signal, ChangeDetectionStrategy } from "@angular/core";
import { type Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { createDefaultSlashCommands } from "../../config/ate-slash-commands.config";
import { AteBaseBubbleMenu } from "../bubble-menus/base/ate-base-bubble-menu";

export interface AteSlashCommandItem {
  title: string;
  description: string;
  icon: string;
  keywords: string[];
  command: (editor: Editor) => void;
}

export interface AteCustomSlashCommands {
  commands?: AteSlashCommandItem[];
}

@Component({
  selector: "ate-slash-commands",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #menuRef class="slash-commands-menu" role="listbox" [attr.aria-label]="common().apply">
      @for (command of filteredCommands(); track command.title) {
        <div
          class="slash-command-item"
          role="option"
          [attr.aria-selected]="$index === selectedIndex()"
          [class.selected]="$index === selectedIndex()"
          (mousedown)="executeCommandFromMenu(command); $event.preventDefault(); $event.stopPropagation()"
          (mouseenter)="selectedIndex.set($index)">
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
        from {
          opacity: 0;
          transform: translateY(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
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
export class AteSlashCommandsComponent extends AteBaseBubbleMenu implements OnDestroy {
  readonly common = this.i18nService.common;
  config = input<AteCustomSlashCommands | undefined>(undefined);

  // Local state for slash command lifecycle
  private isActive = false;
  private currentQuery = signal("");
  private slashRange: { from: number; to: number } | null = null;
  selectedIndex = signal(0);

  commands = computed(() => {
    const config = this.config();
    if (config?.commands) {
      return config.commands;
    }
    return createDefaultSlashCommands(this.i18nService, this.editorCommands);
  });

  filteredCommands = computed(() => {
    const query = this.currentQuery().toLowerCase();
    const commands = this.commands();
    if (!query) {
      return commands;
    }

    return commands.filter(
      command =>
        command.title.toLowerCase().includes(query) ||
        command.description.toLowerCase().includes(query) ||
        command.keywords.some(keyword => keyword.toLowerCase().includes(query))
    );
  });

  constructor() {
    super();

    effect(() => {
      const ed = this.editor();
      if (!ed) {
        return;
      }

      // Clean up old listeners (though OnDestroy handles this, being defensive during ed renewal)
      this.detachListeners(ed);
      this.attachListeners(ed);
      this.addKeyboardPlugin(ed);
    });
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
    this.detachListeners(this.editor());
  }

  private attachListeners(ed: Editor) {
    ed.on("selectionUpdate", this.updateMenu);
    ed.on("transaction", this.updateMenu);
    ed.on("focus", this.updateMenu);
    ed.on("blur", this.handleBlur);
  }

  private detachListeners(ed: Editor) {
    if (!ed) {
      return;
    }
    ed.off("selectionUpdate", this.updateMenu);
    ed.off("transaction", this.updateMenu);
    ed.off("focus", this.updateMenu);
    ed.off("blur", this.handleBlur);
  }

  // --- AteBaseBubbleMenu Implementation ---

  override shouldShow(): boolean {
    const ed = this.editor();
    if (!ed) {
      return false;
    }

    const { from } = ed.state.selection;
    const textBefore = ed.state.doc.textBetween(Math.max(0, from - 20), from, "\n");
    const slashMatch = textBefore.match(/(?:^|\s)\/([^/\s]*)$/);

    if (slashMatch) {
      const query = slashMatch[1] || "";
      const wasActive = this.isActive;

      this.currentQuery.set(query);
      this.slashRange = {
        from: from - slashMatch[0].length + slashMatch[0].indexOf("/"),
        to: from,
      };

      if (!wasActive) {
        this.selectedIndex.set(0);
      }
      this.isActive = true;
      return true;
    }

    this.isActive = false;
    return false;
  }

  override getSelectionRect(): DOMRect {
    const ed = this.editor();
    if (!ed || !this.slashRange) {
      return new DOMRect(-9999, -9999, 0, 0);
    }

    try {
      const coords = ed.view.coordsAtPos(this.slashRange.from);
      return new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top);
    } catch {
      return new DOMRect(-9999, -9999, 0, 0);
    }
  }

  protected override executeCommand(_editor: Editor, _command: string): void {
    // Legacy mapping if needed, but we use executeCommandFromMenu
  }

  protected override getTippyPlacement(): "bottom-start" {
    return "bottom-start";
  }

  protected override getHideOnClick(): boolean {
    return true;
  }

  protected override getExtraTippyOptions(): Record<string, unknown> {
    return {
      theme: "slash-menu",
      appendTo: () => {
        const host = this.editor().options.element.closest("angular-tiptap-editor");
        return host || document.body;
      },
    };
  }

  protected override getExtraPopperModifiers(): Record<string, unknown>[] {
    return [{ name: "hide" }];
  }

  // --- Specific Slash Command Logic ---

  private handleBlur = () => {
    setTimeout(() => this.hideTippy(), 100);
  };

  executeCommandFromMenu(command: AteSlashCommandItem) {
    const ed = this.editor();
    if (!ed || !this.slashRange) {
      return;
    }

    const { tr } = ed.state;
    tr.delete(this.slashRange.from, this.slashRange.to);
    ed.view.dispatch(tr);

    this.hideTippy();
    this.isActive = false;

    setTimeout(() => {
      ed.commands.focus();
      command.command(ed);
    }, 10);
  }

  private scrollToSelected() {
    if (this.menuRef?.nativeElement) {
      const selectedItem = this.menuRef.nativeElement.querySelector(".slash-command-item.selected") as HTMLElement;
      selectedItem?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  private addKeyboardPlugin(ed: Editor) {
    const keyboardPlugin = new Plugin({
      key: new PluginKey("slash-commands-keyboard"),
      props: {
        handleKeyDown: (view: EditorView, event: KeyboardEvent) => {
          if (!this.isActive || this.filteredCommands().length === 0) {
            return false;
          }

          switch (event.key) {
            case "ArrowDown": {
              event.preventDefault();
              const nextIndex = (this.selectedIndex() + 1) % this.filteredCommands().length;
              this.selectedIndex.set(nextIndex);
              this.scrollToSelected();
              return true;
            }
            case "ArrowUp": {
              event.preventDefault();
              const prevIndex =
                this.selectedIndex() === 0 ? this.filteredCommands().length - 1 : this.selectedIndex() - 1;
              this.selectedIndex.set(prevIndex);
              this.scrollToSelected();
              return true;
            }
            case "Enter": {
              event.preventDefault();
              const selectedCommand = this.filteredCommands()[this.selectedIndex()];
              if (selectedCommand) {
                this.executeCommandFromMenu(selectedCommand);
              }
              return true;
            }
            case "Escape": {
              event.preventDefault();
              this.isActive = false;
              this.hideTippy();
              if (this.slashRange) {
                const { tr } = view.state;
                tr.delete(this.slashRange.from, this.slashRange.to);
                view.dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
      },
    });

    ed.view.updateState(
      ed.view.state.reconfigure({
        plugins: [keyboardPlugin, ...ed.view.state.plugins],
      })
    );
  }
}
