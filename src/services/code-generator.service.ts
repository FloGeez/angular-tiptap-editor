import { Injectable, inject } from "@angular/core";
import {
  AteI18nService,
  ATE_DEFAULT_TOOLBAR_CONFIG,
  ATE_DEFAULT_BUBBLE_MENU_CONFIG,
  ATE_SLASH_COMMAND_KEYS,
  AteSlashCommandKey,
  AteSlashCommandsConfig,
  ATE_DEFAULT_SLASH_COMMANDS_CONFIG,
  AteToolbarConfig,
  AteBubbleMenuConfig,
} from "angular-tiptap-editor";
import { AppI18nService, CodeGeneration } from "./app-i18n.service";
import { TOOLBAR_ITEMS, BUBBLE_MENU_ITEMS } from "../config/editor-items.config";
import { ConfigItem, EditorState } from "../types/editor-config.types";
import { EditorConfigurationService } from "./editor-configuration.service";

@Injectable({
  providedIn: "root",
})
export class CodeGeneratorService {
  private configService = inject(EditorConfigurationService);
  private i18nService = inject(AteI18nService);
  private appI18nService = inject(AppI18nService);

  generateCode(): string {
    const editorState = this.configService.editorState();
    const toolbarConfig = this.configService.toolbarConfig();
    const bubbleMenuConfig = this.configService.bubbleMenuConfig();
    const slashCommands = this.configService.slashCommandsConfig();
    const codeGen = this.appI18nService.codeGeneration();

    const sections: string[] = [];

    // 1. Content
    sections.push(`// ============================================================================
  // DEMO CONTENT
  // ============================================================================
  ${this.generateDemoContent(codeGen)}`);

    // 2. Extensions (Optional)
    if (editorState.enableTaskExtension) {
      sections.push(`// ============================================================================
  // EXTENSIONS
  // ============================================================================
  extensions = [TaskList, TaskItem];`);
    }

    // 3. Editor Config
    sections.push(this.generateEditorConfig(editorState, toolbarConfig, bubbleMenuConfig, slashCommands).trim());

    // 4. Handlers
    sections.push(this.generateContentChangeHandler(codeGen).trim());

    return `${this.generateImports(editorState.enableTaskExtension)}

${this.generateComponentDecorator(editorState)}
export class TiptapDemoComponent {
  ${sections.join("\n\n  ")}
}
${editorState.enableTaskExtension ? this.generateTaskExtensionSource() : ""}`;
  }

  private isToolbarDefault(config: Record<string, boolean>): boolean {
    const allKeys = Object.keys(ATE_DEFAULT_TOOLBAR_CONFIG);
    return allKeys.every(key => {
      const configValue = config[key] === true;
      const defaultValue = ATE_DEFAULT_TOOLBAR_CONFIG[key as keyof typeof ATE_DEFAULT_TOOLBAR_CONFIG] === true;
      return configValue === defaultValue;
    });
  }

  private isBubbleMenuDefault(config: Record<string, boolean>): boolean {
    const allKeys = Object.keys(ATE_DEFAULT_BUBBLE_MENU_CONFIG);
    return allKeys.every(key => {
      const configValue = config[key] === true;
      const defaultValue = ATE_DEFAULT_BUBBLE_MENU_CONFIG[key as keyof typeof ATE_DEFAULT_BUBBLE_MENU_CONFIG] === true;
      return configValue === defaultValue;
    });
  }

  private isSlashCommandsDefault(config: AteSlashCommandsConfig): boolean {
    const hasCustom = !!(config.custom && config.custom.length > 0);
    if (hasCustom) return false;
    const keys = Object.keys(ATE_DEFAULT_SLASH_COMMANDS_CONFIG) as AteSlashCommandKey[];
    return keys.every(key => {
      const value = config[key];
      return value === undefined || value === ATE_DEFAULT_SLASH_COMMANDS_CONFIG[key];
    });
  }

  private generateImports(hasTaskExtension: boolean): string {
    const imports = [
      "import { Component } from '@angular/core';",
      "import { AngularTiptapEditorComponent, AteEditorConfig } from '@flogeez/angular-tiptap-editor';",
    ];

    if (hasTaskExtension) {
      imports.push("import { TaskList, TaskItem } from './extensions/task.extension';");
    }

    return `// ============================================================================
// IMPORTS
// ============================================================================
${imports.join("\n")}`;
  }

  private generateComponentDecorator(editorState: EditorState): string {
    const templateProps = [
      `[content]="demoContent"`,
      `[config]="editorConfig"`,
      `(contentChange)="onContentChange($event)"`,
    ];

    if (editorState.enableTaskExtension) {
      templateProps.push(`[tiptapExtensions]="extensions"`);
    }

    return `@Component({
  selector: 'app-tiptap-demo',
  standalone: true,
  imports: [AngularTiptapEditorComponent],
  template: \`
    <angular-tiptap-editor
      ${templateProps.join("\n      ")}
    >
    </angular-tiptap-editor>
  \`
})`;
  }

  private generateEditorConfig(
    editorState: EditorState,
    toolbarConfig: Partial<AteToolbarConfig>,
    bubbleMenuConfig: Partial<AteBubbleMenuConfig>,
    slashCommands: AteSlashCommandsConfig
  ): string {
    const configItems: string[] = [];

    // Fundamentals
    if (editorState.darkMode) configItems.push(`    theme: 'dark',`);
    if (editorState.seamless) configItems.push(`    mode: 'seamless',`);
    if (editorState.height) configItems.push(`    height: '${editorState.height}px',`);
    if (editorState.minHeight) configItems.push(`    minHeight: '${editorState.minHeight}px',`);
    if (editorState.maxHeight) configItems.push(`    maxHeight: '${editorState.maxHeight}px',`);
    if (editorState.fillContainer) configItems.push(`    fillContainer: true,`);
    if (editorState.disabled) configItems.push(`    disabled: true,`);
    if (editorState.autofocus)
      configItems.push(
        `    autofocus: ${typeof editorState.autofocus === "string" ? `'${editorState.autofocus}'` : editorState.autofocus},`
      );
    if (editorState.placeholder) configItems.push(`    placeholder: '${editorState.placeholder}',`);
    if (!editorState.editable) configItems.push(`    editable: false,`);
    if (editorState.locale) configItems.push(`    locale: '${editorState.locale}',`);

    // Display options
    if (editorState.showToolbar === false) configItems.push(`    showToolbar: false,`);
    if (editorState.showFooter === false) configItems.push(`    showFooter: false,`);
    if (editorState.showCharacterCount === false) configItems.push(`    showCharacterCount: false,`);
    if (editorState.showWordCount === false) configItems.push(`    showWordCount: false,`);
    if (editorState.showEditToggle) configItems.push(`    showEditToggle: true,`);
    if (editorState.maxCharacters) configItems.push(`    maxCharacters: ${editorState.maxCharacters},`);
    if (editorState.floatingToolbar) configItems.push(`    floatingToolbar: true,`);
    if (editorState.showBubbleMenu === false) configItems.push(`    showBubbleMenu: false,`);
    if (editorState.showImageBubbleMenu === false) configItems.push(`    showImageBubbleMenu: false,`);
    if (editorState.showTableBubbleMenu === false) configItems.push(`    showTableMenu: false,`);
    if (editorState.showCellBubbleMenu === false) configItems.push(`    showCellMenu: false,`);
    if (editorState.enableSlashCommands === false) configItems.push(`    enableSlashCommands: false,`);

    // Complex configs
    if (!this.isToolbarDefault(toolbarConfig)) {
      configItems.push(`    toolbar: {
${this.generateSimpleConfig(toolbarConfig, TOOLBAR_ITEMS)
  .split("\n")
  .map(l => "  " + l)
  .join("\n")}
    },`);
    }

    if (!this.isBubbleMenuDefault(bubbleMenuConfig)) {
      configItems.push(`    bubbleMenu: {
${this.generateSimpleConfig(bubbleMenuConfig, BUBBLE_MENU_ITEMS)
  .split("\n")
  .map(l => "  " + l)
  .join("\n")}
    },`);
    }

    if (!this.isSlashCommandsDefault(slashCommands)) {
      const activeSlashCommands = new Set(
        Object.entries(slashCommands)
          .filter(([k, v]) => k !== "custom" && v === true)
          .map(([k]) => k as AteSlashCommandKey)
      );

      let customCode = "";
      if (slashCommands.custom && slashCommands.custom.length > 0) {
        const t = this.appI18nService.translations().items;
        const customItemsFormatted = JSON.stringify(
          slashCommands.custom,
          (key, value) => {
            if (key === "command") return "PLACEHOLDER_COMMAND";
            return value;
          },
          2
        )
          .replace(/"command": "PLACEHOLDER_COMMAND"/g, (match: string, offset: number, str: string) => {
            const prevLines = str.substring(0, offset).split("\n");
            const titleLine = prevLines.filter((l: string) => l.includes('"title"')).pop();
            if (titleLine && titleLine.includes(t.task)) {
              return `command: (editor: Editor) => {
          editor.chain().focus().insertContent('<ul data-type="taskList"><li data-type="taskItem" data-checked="false"></li></ul>').run();
        }`;
            }
            return `command: (editor: Editor) => {
          editor.commands.insertContent(\`<h3>✨ \${t.customMagicTitle}</h3><p>...</p>\`);
        }`;
          })
          .split("\n")
          .map((line, i) => (i === 0 ? line : "      " + line))
          .join("\n");
        customCode = `\n      custom: ${customItemsFormatted}`;
      }

      configItems.push(`    slashCommands: {
${this.generateSimpleSlashCommandsConfig(activeSlashCommands)
  .split("\n")
  .map(l => "  " + l)
  .join("\n")}${customCode}
    },`);
    }

    return `
  // ============================================================================
  // EDITOR CONFIGURATION
  // ============================================================================
  editorConfig: AteEditorConfig = {
${configItems.join("\n")}
  };`;
  }

  private generateDemoContent(codeGen: CodeGeneration): string {
    return `demoContent = '<p>${codeGen.placeholderContent}</p>';`;
  }

  private generateSimpleSlashCommandsConfig(activeCommands: Set<AteSlashCommandKey>): string {
    return ATE_SLASH_COMMAND_KEYS.map(key => {
      const isActive = activeCommands.has(key);
      const comment = isActive ? "" : " // ";
      return `${comment}    ${key}: ${isActive},`;
    }).join("\n");
  }

  private generateContentChangeHandler(codeGen: CodeGeneration): string {
    return `
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  onContentChange(content: string) {
    console.log('${codeGen.contentChangedLog}', content);
  }`;
  }

  private generateSimpleConfig(config: Record<string, boolean>, availableItems: ConfigItem[]): string {
    return availableItems
      .filter(item => item.key !== "separator")
      .map(item => {
        const isActive = config[item.key] === true;
        const comment = isActive ? "" : " // ";
        return `${comment}    ${item.key}: ${isActive},`;
      })
      .join("\n");
  }

  async copyCode(): Promise<boolean> {
    try {
      const code = this.generateCode();
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand("copy");
          textArea.remove();
        } catch (err) {
          textArea.remove();
          throw err;
        }
      }
      return true;
    } catch (error) {
      console.error("Error copying code:", error);
      return false;
    }
  }

  highlightCode(code: string): string {
    return code;
  }

  private generateTaskExtensionSource(): string {
    return `

// ============================================================================
// TASK EXTENSION SOURCE (to be saved in extensions/task.extension.ts)
// ============================================================================
/*
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';

export const CustomTaskList = TaskList.configure({
    HTMLAttributes: {
        class: 'custom-task-list',
    },
});

export const CustomTaskItem = TaskItem.extend({
    content: 'inline*',
}).configure({
    HTMLAttributes: {
        class: 'custom-task-item',
    },
});

export { CustomTaskList as TaskList, CustomTaskItem as TaskItem };
*/`;
  }
}
