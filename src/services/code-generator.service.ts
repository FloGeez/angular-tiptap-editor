import { Injectable, inject } from "@angular/core";
import {
  ATE_DEFAULT_TOOLBAR_CONFIG,
  ATE_DEFAULT_BUBBLE_MENU_CONFIG,
  ATE_SLASH_COMMAND_KEYS,
  AteSlashCommandKey,
  AteSlashCommandsConfig,
  ATE_DEFAULT_SLASH_COMMANDS_CONFIG,
  AteToolbarConfig,
  AteBubbleMenuConfig,
  ATE_TOOLBAR_KEYS,
  ATE_BUBBLE_MENU_KEYS,
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
    const extraExtensions = [];
    if (editorState.enableTaskExtension) extraExtensions.push("TaskList", "TaskItem");
    const aiActive = this.isAiActive(toolbarConfig, bubbleMenuConfig);
    if (aiActive) extraExtensions.push("AiLoading");

    if (extraExtensions.length > 0) {
      sections.push(`// ============================================================================
  // EXTENSIONS
  // ============================================================================
  extensions = [${extraExtensions.join(", ")}];`);
    }

    // 3. Editor Config
    sections.push(this.generateEditorConfig(editorState, toolbarConfig, bubbleMenuConfig, slashCommands).trim());

    // 4. Handlers
    sections.push(this.generateContentChangeHandler(codeGen).trim());

    return `${this.generateImports(editorState.enableTaskExtension, aiActive)}

${this.generateComponentDecorator(editorState, extraExtensions.length > 0)}
export class TiptapDemoComponent {
  ${sections.join("\n\n  ")}
}

${this.generateAiExtensionIfNeeded(aiActive)}
${this.generateAiServiceIfNeeded(toolbarConfig, bubbleMenuConfig)}
${this.generateAiStylesIfNeeded(toolbarConfig, bubbleMenuConfig)}
${editorState.enableTaskExtension ? this.generateTaskExtensionSource() : ""}`;
  }

  private isAiActive(toolbarConfig: AteToolbarConfig, bubbleMenuConfig: AteBubbleMenuConfig): boolean {
    const hasAiToolbar = toolbarConfig.custom?.some(c => c.key === "ai_toolbar_rewrite");
    const hasAiBubble = bubbleMenuConfig.custom?.some(c => c.key === "ai_rewrite");
    return !!(hasAiToolbar || hasAiBubble);
  }

  private generateAiServiceIfNeeded(toolbarConfig: AteToolbarConfig, bubbleMenuConfig: AteBubbleMenuConfig): string {
    if (!this.isAiActive(toolbarConfig, bubbleMenuConfig)) return "";

    const codeGen = this.appI18nService.codeGeneration();

    return `
// ============================================================================
// ${codeGen.aiServiceComment}
// ============================================================================
@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);

  transformText(text: string) {
    // In a real integration, you would call your backend here:
    // return this.http.post<any>('/api/ai/transform', { text });

    // ${codeGen.aiRealIntegrationComment}
    const response = \`\${codeGen.aiTransformationPrefix} \${text.toUpperCase()}\`;
    return of(response).pipe(delay(1500));
  }
}
`;
  }

  private generateAiStylesIfNeeded(toolbarConfig: AteToolbarConfig, bubbleMenuConfig: AteBubbleMenuConfig): string {
    if (!this.isAiActive(toolbarConfig, bubbleMenuConfig)) return "";

    return `
/*
// ============================================================================
// AI ANIMATION STYLES (to be added to your global CSS)
// ============================================================================
.spinning-ai {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  animation: rotate-ai 2s linear infinite;
  transform-origin: center center;
  font-size: 1.2rem;
  vertical-align: middle;
  color: #2563eb;
  margin: 0 4px;
}

@keyframes rotate-ai {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
*/`;
  }

  private generateAiExtensionIfNeeded(aiActive: boolean): string {
    if (!aiActive) return "";

    return `
// ============================================================================
// AI LOADING MARK EXTENSION
// ============================================================================
const AiLoading = Mark.create({
  name: "aiLoading",
  parseHTML() {
    return [{ tag: "span.spinning-ai" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "spinning-ai material-symbols-outlined" }), 0];
  },
});
`;
  }

  private isToolbarDefault(config: AteToolbarConfig): boolean {
    const hasCustom = !!(config.custom && config.custom.length > 0);
    if (hasCustom) return false;

    return ATE_TOOLBAR_KEYS.every(key => {
      const configValue = config[key] === true;
      const defaultValue = ATE_DEFAULT_TOOLBAR_CONFIG[key] === true;
      return configValue === defaultValue;
    });
  }

  private isBubbleMenuDefault(config: AteBubbleMenuConfig): boolean {
    const hasCustom = !!(config.custom && config.custom.length > 0);
    if (hasCustom) return false;

    return ATE_BUBBLE_MENU_KEYS.every(key => {
      const configValue = config[key] === true;
      const defaultValue = ATE_DEFAULT_BUBBLE_MENU_CONFIG[key] === true;
      return configValue === defaultValue;
    });
  }

  private isSlashCommandsDefault(config: AteSlashCommandsConfig): boolean {
    const hasCustom = !!(config.custom && config.custom.length > 0);
    if (hasCustom) return false;
    const keys = ATE_SLASH_COMMAND_KEYS;
    return keys.every(key => {
      const value = config[key];
      return value === undefined || value === ATE_DEFAULT_SLASH_COMMANDS_CONFIG[key];
    });
  }

  private generateImports(hasTaskExtension: boolean, hasAi: boolean): string {
    const imports = [
      "import { Component } from '@angular/core';",
      "import { AngularTiptapEditorComponent, AteEditorConfig } from '@flogeez/angular-tiptap-editor';",
    ];

    if (hasTaskExtension) {
      imports.push("import { TaskList, TaskItem } from './extensions/task.extension';");
    }

    if (hasAi) {
      imports.push("import { of, delay, firstValueFrom } from 'rxjs';");
      imports.push("import { Injectable, inject } from '@angular/core';");
      imports.push("import { HttpClient } from '@angular/common/http';");
      imports.push("import { Mark, mergeAttributes } from '@tiptap/core';");
    }

    return `// ============================================================================
// IMPORTS
// ============================================================================
${imports.join("\n")}`;
  }

  private generateComponentDecorator(editorState: EditorState, hasExtraExtensions: boolean): string {
    const templateProps = [
      `[content]="demoContent"`,
      `[config]="editorConfig"`,
      `(contentChange)="onContentChange($event)"`,
    ];

    if (hasExtraExtensions) {
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
      let customCode = "";
      if (toolbarConfig.custom && toolbarConfig.custom.length > 0) {
        customCode = this.generateCustomItemsCode(toolbarConfig.custom, "Toolbar");
      }

      configItems.push(`    toolbar: {
${this.generateSimpleConfig(toolbarConfig, TOOLBAR_ITEMS)
  .split("\n")
  .map(l => "  " + l)
  .join("\n")}${customCode}
    },`);
    }

    if (!this.isBubbleMenuDefault(bubbleMenuConfig)) {
      let customCode = "";
      if (bubbleMenuConfig.custom && bubbleMenuConfig.custom.length > 0) {
        customCode = this.generateCustomItemsCode(bubbleMenuConfig.custom, "BubbleMenu");
      }

      configItems.push(`    bubbleMenu: {
${this.generateSimpleConfig(bubbleMenuConfig, BUBBLE_MENU_ITEMS)
  .split("\n")
  .map(l => "  " + l)
  .join("\n")}${customCode}
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
          editor.commands.insertContent(\`<h3>✨ Custom Command</h3><p>Implementation goes here...</p>\`);
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

  private generateCustomItemsCode(customItems: unknown[], context: string): string {
    const itemsFormatted = JSON.stringify(
      customItems,
      (key, value) => {
        if (key === "command") return "PLACEHOLDER_COMMAND";
        return value;
      },
      2
    )
      .replace(/"command": "PLACEHOLDER_COMMAND"/g, (match: string, offset: number, str: string) => {
        const prevLines = str.substring(0, offset).split("\n");
        const keyLine = prevLines.filter((l: string) => l.includes('"key"')).pop();

        if (keyLine && (keyLine.includes("ai_rewrite") || keyLine.includes("ai_toolbar_rewrite"))) {
          return `command: async (editor: Editor) => {
          const ai = inject(AiService);
          const { from, to } = editor.state.selection;
          const text = editor.state.doc.textBetween(from, to, " ");
          if (!text) return;

          editor.commands.insertContentAt(to, '<span class="spinning-ai">psychology</span>', {
            parseOptions: { preserveWhitespace: 'full' }
          });
          const res = await firstValueFrom(ai.transformText(text));
          editor.commands.insertContentAt({ from, to: to + 10 }, \`<blockquote><p>✨ \${res}</p></blockquote>\`);
        }`;
        }

        return `command: (editor: Editor) => {
          // Custom implementation for ${context}
          console.log('Command executed');
        }`;
      })
      .split("\n")
      .map((line, i) => (i === 0 ? line : "      " + line))
      .join("\n");

    return `\n      custom: ${itemsFormatted}`;
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

  private generateSimpleConfig(config: AteToolbarConfig | AteBubbleMenuConfig, availableItems: ConfigItem[]): string {
    return availableItems
      .filter(item => item.key !== "separator")
      .map(item => {
        const isActive = (config as Record<string, unknown>)[item.key] === true;
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
