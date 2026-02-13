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
    const isAiBlockEnabled = this.configService.isAiBlockEnabled();
    const isCounterEnabled = this.configService.isCounterEnabled();
    const isWarningBoxEnabled = this.configService.isWarningBoxEnabled();
    const codeGen = this.appI18nService.codeGeneration();

    const sections: string[] = [];

    // 1. Content
    sections.push(`// ============================================================================
  // DEMO CONTENT
  // ============================================================================
  ${this.generateDemoContent(codeGen)}`);

    const aiActive = this.isAiActive(toolbarConfig, bubbleMenuConfig);
    const angularNodes = [];
    if (aiActive) {
      angularNodes.push("AiLoadingExtension");
    }
    if (isAiBlockEnabled) {
      angularNodes.push("AiBlockExtension");
    }
    if (isCounterEnabled) {
      angularNodes.push("CounterExtension");
    }
    if (isWarningBoxEnabled) {
      angularNodes.push("WarningBoxExtension");
    }

    if (angularNodes.length > 0) {
      sections.push(`  // ============================================================================
  // ANGULAR NODES (AUTOMATIC REGISTRATION)
  // ============================================================================
  angularNodes: AteAngularNode[] = [${angularNodes.join(", ")}];`);
    }

    if (editorState.enableTaskExtension) {
      sections.push(`// ============================================================================
  // TIPTAP EXTENSIONS
  // ============================================================================
  tiptapExtensions = [TaskList, TaskItem];`);
    }

    // 3. Editor Config
    sections.push(
      this.generateEditorConfig(editorState, toolbarConfig, bubbleMenuConfig, slashCommands).trim()
    );

    // 4. Handlers
    sections.push(this.generateContentChangeHandler(codeGen).trim());

    return `${this.generateImports(
      editorState.enableTaskExtension,
      aiActive,
      isAiBlockEnabled,
      isCounterEnabled,
      isWarningBoxEnabled
    )}

${this.generateAppConfig(aiActive || isAiBlockEnabled || isCounterEnabled || isWarningBoxEnabled)}

${this.generateComponentDecorator()}
export class TiptapDemoComponent {

  ${sections.join("\n\n  ")}
}

${isAiBlockEnabled ? this.generateAiBlockExtensionSource() : ""}
${this.generateAiExtensionIfNeeded(aiActive)}
${this.generateAiServiceIfNeeded(toolbarConfig, bubbleMenuConfig, isAiBlockEnabled)}
${this.generateAiStylesIfNeeded(toolbarConfig, bubbleMenuConfig)}
${this.generateAiUtilsIfNeeded(aiActive || isAiBlockEnabled)}
${editorState.enableTaskExtension ? this.generateTaskExtensionSource() : ""}
${isCounterEnabled ? this.generateCounterExampleSource() : ""}
${isWarningBoxEnabled ? this.generateWarningBoxExampleSource() : ""}`;
  }

  private generateAppConfig(hasGlobalInit: boolean): string {
    if (!hasGlobalInit) {
      return "";
    }
    return `// ============================================================================
// APP CONFIGURATION (app.config.ts)
// ============================================================================
/*
bootstrapApplication(App, {
  providers: [
    provideAteEditor() // Capture automatic injector
  ]
});
*/`;
  }

  private isAiActive(
    toolbarConfig: AteToolbarConfig,
    bubbleMenuConfig: AteBubbleMenuConfig
  ): boolean {
    const hasAiToolbar = toolbarConfig.custom?.some(c => c.key === "ai_toolbar_rewrite");
    const hasAiBubble = bubbleMenuConfig.custom?.some(c => c.key === "ai_rewrite");
    return !!(hasAiToolbar || hasAiBubble);
  }

  private generateAiServiceIfNeeded(
    toolbarConfig: AteToolbarConfig,
    bubbleMenuConfig: AteBubbleMenuConfig,
    isAiBlockEnabled: boolean
  ): string {
    if (!this.isAiActive(toolbarConfig, bubbleMenuConfig) && !isAiBlockEnabled) {
      return "";
    }

    const codeGen = this.appI18nService.codeGeneration();

    return `
// ============================================================================
// ${codeGen.aiServiceComment}
// ============================================================================
@Injectable({ providedIn: 'root' })
export class AiService {
  private http = inject(HttpClient);

  async transformText(text: string) {
    // In a real integration, you would call your backend here:
    // return firstValueFrom(this.http.post<any>('/api/ai/transform', { text }));

    // For demo purposes, we use our utility
    return firstValueFrom(simulateAiResponse(text));
  }
}
`;
  }

  private generateAiStylesIfNeeded(
    toolbarConfig: AteToolbarConfig,
    bubbleMenuConfig: AteBubbleMenuConfig
  ): string {
    if (!this.isAiActive(toolbarConfig, bubbleMenuConfig)) {
      return "";
    }

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
    if (!aiActive) {
      return "";
    }

    return `
// ============================================================================
// AI LOADING NODE EXTENSION
// ============================================================================
export const AiLoadingExtension = {
  component: AiLoadingNodeComponent,
  name: "aiLoading",
  group: "inline",
  inline: true,
  atom: true,
};

@Component({
  selector: 'app-ai-loading-node',
  standalone: true,
  imports: [CommonModule],
  template: \`
    <span class="ai-loading-inline">
      <span class="ai-loading-icon material-symbols-outlined">psychology</span>
      AI is thinking...
    </span>
  \`,
  styles: [\`
    .ai-loading-inline { 
       display: inline-flex; align-items: center; gap: 8px;
       padding: 4px 12px; background: #eff6ff; border: 1px solid #2563eb;
       border-radius: 20px; color: #2563eb; font-size: 0.85rem;
       animation: ai-pulse 2s infinite ease-in-out;
    }
    .ai-loading-icon { display: inline-block; animation: rotate 2s linear infinite; }
    @keyframes ai-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  \`]
})
export class AiLoadingNodeComponent {}
`;
  }

  private isToolbarDefault(config: AteToolbarConfig): boolean {
    const hasCustom = !!(config.custom && config.custom.length > 0);
    if (hasCustom) {
      return false;
    }

    return ATE_TOOLBAR_KEYS.every(key => {
      const configValue = config[key] === true;
      const defaultValue = ATE_DEFAULT_TOOLBAR_CONFIG[key] === true;
      return configValue === defaultValue;
    });
  }

  private isBubbleMenuDefault(config: AteBubbleMenuConfig): boolean {
    const hasCustom = !!(config.custom && config.custom.length > 0);
    if (hasCustom) {
      return false;
    }

    return ATE_BUBBLE_MENU_KEYS.every(key => {
      const configValue = config[key] === true;
      const defaultValue = ATE_DEFAULT_BUBBLE_MENU_CONFIG[key] === true;
      return configValue === defaultValue;
    });
  }

  private isSlashCommandsDefault(config: AteSlashCommandsConfig): boolean {
    const hasCustom = !!(config.custom && config.custom.length > 0);
    if (hasCustom) {
      return false;
    }
    const keys = ATE_SLASH_COMMAND_KEYS;
    return keys.every(key => {
      const value = config[key];
      return (
        value === undefined ||
        value === ATE_DEFAULT_SLASH_COMMANDS_CONFIG[key as AteSlashCommandKey]
      );
    });
  }

  private generateImports(
    hasTaskExtension: boolean,
    hasAi: boolean,
    hasAiBlock: boolean,
    hasCounter: boolean,
    hasWarningBox: boolean
  ): string {
    const baseImports = [
      "AngularTiptapEditorComponent",
      "AteEditorConfig",
      "AteAngularNode",
      "provideAteEditor",
    ];

    const importsLines = [
      "import { Component } from '@angular/core';",
      `import { ${baseImports.join(", ")} } from '@flogeez/angular-tiptap-editor';`,
    ];

    if (hasAiBlock || hasCounter || hasWarningBox) {
      importsLines.push("import { inject } from '@angular/core';");
      importsLines.push("import { CommonModule } from '@angular/common';");
    }

    if (hasAiBlock || hasCounter) {
      importsLines.push("import { AteAngularNodeView } from '@flogeez/angular-tiptap-editor';");
      importsLines.push("import { computed } from '@angular/core';");
    }

    if (hasAiBlock) {
      importsLines.push("import { signal, ViewChild, ElementRef } from '@angular/core';");
      importsLines.push(
        "import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';"
      );
    }

    if (hasWarningBox) {
      importsLines.push("import { input } from '@angular/core';");
    }

    if (hasTaskExtension) {
      importsLines.push("import { TaskList, TaskItem } from './extensions/task.extension';");
    }

    if (hasAi || hasAiBlock) {
      importsLines.push("import { of, delay, firstValueFrom } from 'rxjs';");
      importsLines.push("import { Injectable, inject } from '@angular/core';");
      if (hasAi) {
        importsLines.push("import { HttpClient } from '@angular/common/http';");
        importsLines.push("import { Mark, mergeAttributes } from '@tiptap/core';");
      }
    }

    return `// ============================================================================
// IMPORTS
// ============================================================================
${importsLines.join("\n")}`;
  }

  private generateComponentDecorator(): string {
    const templateProps = [
      `[content]="demoContent"`,
      `[config]="editorConfig"`,
      `(contentChange)="onContentChange($event)"`,
    ];

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
    if (editorState.darkMode) {
      configItems.push(`    theme: 'dark',`);
    }
    if (editorState.seamless) {
      configItems.push(`    mode: 'seamless',`);
    }
    if (editorState.height) {
      configItems.push(`    height: '${editorState.height}px',`);
    }
    if (editorState.minHeight) {
      configItems.push(`    minHeight: '${editorState.minHeight}px',`);
    }
    if (editorState.maxHeight) {
      configItems.push(`    maxHeight: '${editorState.maxHeight}px',`);
    }
    if (editorState.fillContainer) {
      configItems.push(`    fillContainer: true,`);
    }
    if (editorState.disabled) {
      configItems.push(`    disabled: true,`);
    }
    if (editorState.autofocus) {
      configItems.push(
        `    autofocus: ${typeof editorState.autofocus === "string" ? `'${editorState.autofocus}'` : editorState.autofocus},`
      );
    }
    if (editorState.placeholder) {
      configItems.push(`    placeholder: '${editorState.placeholder}',`);
    }
    if (!editorState.editable) {
      configItems.push(`    editable: false,`);
    }
    if (editorState.locale) {
      configItems.push(`    locale: '${editorState.locale}',`);
    }

    // Display options
    if (editorState.showToolbar === false) {
      configItems.push(`    showToolbar: false,`);
    }
    if (editorState.showFooter === false) {
      configItems.push(`    showFooter: false,`);
    }
    if (editorState.showCharacterCount === false) {
      configItems.push(`    showCharacterCount: false,`);
    }
    if (editorState.showWordCount === false) {
      configItems.push(`    showWordCount: false,`);
    }
    if (editorState.showEditToggle) {
      configItems.push(`    showEditToggle: true,`);
    }
    if (editorState.maxCharacters) {
      configItems.push(`    maxCharacters: ${editorState.maxCharacters},`);
    }
    if (editorState.floatingToolbar) {
      configItems.push(`    floatingToolbar: true,`);
    }
    if (editorState.showBubbleMenu === false) {
      configItems.push(`    showBubbleMenu: false,`);
    }
    if (editorState.showImageBubbleMenu === false) {
      configItems.push(`    showImageBubbleMenu: false,`);
    }
    if (editorState.showTableBubbleMenu === false) {
      configItems.push(`    showTableMenu: false,`);
    }
    if (editorState.showCellBubbleMenu === false) {
      configItems.push(`    showCellMenu: false,`);
    }
    if (editorState.enableSlashCommands === false) {
      configItems.push(`    enableSlashCommands: false,`);
    }
    if (editorState.blockControls && editorState.blockControls !== "none") {
      configItems.push(`    blockControls: '${editorState.blockControls}',`);
    }

    // Angular Nodes (Semantic Registration)
    if (
      this.isAiActive(toolbarConfig as AteToolbarConfig, bubbleMenuConfig as AteBubbleMenuConfig) ||
      this.configService.isAiBlockEnabled() ||
      this.configService.isCounterEnabled() ||
      this.configService.isWarningBoxEnabled()
    ) {
      // Logic for adding angularNodes to configuration
      configItems.push(`    angularNodes: this.angularNodes,`);
    }

    // TipTap Extensions (Option B)
    if (editorState.enableTaskExtension) {
      configItems.push(`    tiptapExtensions: this.tiptapExtensions,`);
    }

    // Complex configs (Toolbar)
    const toolbarTogglesSame = this.areTogglesBaseDefault(
      toolbarConfig,
      ATE_DEFAULT_TOOLBAR_CONFIG,
      ATE_TOOLBAR_KEYS
    );
    if (!this.isToolbarDefault(toolbarConfig as AteToolbarConfig)) {
      let customCode = "";
      if (toolbarConfig.custom?.length) {
        customCode = this.generateCustomItemsCode(toolbarConfig.custom, "Toolbar");
      }
      configItems.push(`    toolbar: {
${
  toolbarTogglesSame
    ? "      ...ATE_DEFAULT_TOOLBAR_CONFIG,"
    : this.generateSimpleConfig(toolbarConfig as AteToolbarConfig, TOOLBAR_ITEMS)
        .split("\n")
        .map(l => "  " + l)
        .join("\n")
}${customCode}
    },`);
    }

    // Complex configs (Bubble Menu)
    const bubbleTogglesSame = this.areTogglesBaseDefault(
      bubbleMenuConfig,
      ATE_DEFAULT_BUBBLE_MENU_CONFIG,
      ATE_BUBBLE_MENU_KEYS
    );
    if (!this.isBubbleMenuDefault(bubbleMenuConfig as AteBubbleMenuConfig)) {
      let customCode = "";
      if (bubbleMenuConfig.custom?.length) {
        customCode = this.generateCustomItemsCode(bubbleMenuConfig.custom, "BubbleMenu");
      }
      configItems.push(`    bubbleMenu: {
${
  bubbleTogglesSame
    ? "      ...ATE_DEFAULT_BUBBLE_MENU_CONFIG,"
    : this.generateSimpleConfig(bubbleMenuConfig as AteBubbleMenuConfig, BUBBLE_MENU_ITEMS)
        .split("\n")
        .map(l => "  " + l)
        .join("\n")
}${customCode}
    },`);
    }

    // Complex configs (Slash Commands)
    const slashTogglesSame = ATE_SLASH_COMMAND_KEYS.every(
      key => slashCommands[key] === ATE_DEFAULT_SLASH_COMMANDS_CONFIG[key]
    );
    if (!this.isSlashCommandsDefault(slashCommands)) {
      const activeSlashCommands = new Set(
        Object.entries(slashCommands)
          .filter(([k, v]) => k !== "custom" && v === true)
          .map(([k]) => k as AteSlashCommandKey)
      );

      let customCode = "";
      if (slashCommands.custom?.length) {
        customCode = this.generateSlashCustomItems(slashCommands.custom);
      }

      configItems.push(`    slashCommands: {
${
  slashTogglesSame
    ? "      ...ATE_DEFAULT_SLASH_COMMANDS_CONFIG,"
    : this.generateSimpleSlashCommandsConfig(activeSlashCommands)
        .split("\n")
        .map(l => "  " + l)
        .join("\n")
}${customCode}
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

  private generateSlashCustomItems(customItems: unknown[]): string {
    const t = this.appI18nService.translations().items;
    const itemsFormatted = JSON.stringify(
      customItems,
      (key, value) => (key === "command" ? "PLACEHOLDER_COMMAND" : value),
      2
    )
      .replace(
        /"command": "PLACEHOLDER_COMMAND"/g,
        (match: string, offset: number, str: string) => {
          const prevLines = str.substring(0, offset).split("\n");
          const titleLine = prevLines.filter((l: string) => l.includes('"title"')).pop();
          if (titleLine && titleLine.includes(t.task)) {
            return `command: (editor: Editor) => {
          editor.chain().focus().insertContent('<ul data-type="taskList"><li data-type="taskItem" data-checked="false"></li></ul>').run();
        }`;
          }
          if (titleLine && titleLine.includes(t.customAi)) {
            return `command: (editor: Editor) => {
          editor.commands.insertContent({ type: "aiBlock" });
        }`;
          }
          if (titleLine && titleLine.includes(t.counter)) {
            return `command: (editor: Editor) => {
          editor.chain().focus().insertContent({ type: "counterNode", attrs: { count: 0 } }).run();
        }`;
          }
          if (titleLine && titleLine.includes(t.warningBox)) {
            return `command: (editor: Editor) => {
          editor
            .chain()
            .focus()
            .insertContent({
              type: "warningBox",
              content: [{ type: "text", text: "Attention ! Ceci est un avertissement..." }],
            })
            .run();
        }`;
          }
          return `command: (editor: Editor) => {
          editor.commands.insertContent(\`<h3>✨ Custom Command</h3><p>Implementation goes here...</p>\`);
        }`;
        }
      )
      .split("\n")
      .map((line, i) => (i === 0 ? line : "      " + line))
      .join("\n");
    return `\n      custom: ${itemsFormatted}`;
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
        if (key === "command") {
          return "PLACEHOLDER_COMMAND";
        }
        return value;
      },
      2
    )
      .replace(
        /"command": "PLACEHOLDER_COMMAND"/g,
        (match: string, offset: number, str: string) => {
          const prevLines = str.substring(0, offset).split("\n");
          const keyLine = prevLines.filter((l: string) => l.includes('"key"')).pop();

          if (
            keyLine &&
            (keyLine.includes("ai_rewrite") || keyLine.includes("ai_toolbar_rewrite"))
          ) {
            return `command: async (editor: Editor) => {
          const ai = inject(AiService);
          const { from, to } = editor.state.selection;
          const text = editor.state.doc.textBetween(from, to, " ");
          if (!text) return;

          editor.commands.insertContentAt(to, { type: 'aiLoading' });
          const res = await ai.transformText(text);
          editor.commands.insertContentAt({ from, to: to + 1 }, \`<blockquote><p>✨ \${res}</p></blockquote>\`);
        }`;
          }

          return `command: (editor: Editor) => {
          // Custom implementation for ${context}
          console.log('Command executed');
        }`;
        }
      )
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private areTogglesBaseDefault(config: any, defaultConfig: any, keys: readonly string[]): boolean {
    return keys.every(key => {
      const configValue = config[key] === true;
      const defaultValue = defaultConfig[key] === true;
      return configValue === defaultValue;
    });
  }

  private generateSimpleConfig(
    config: AteToolbarConfig | AteBubbleMenuConfig,
    availableItems: ConfigItem[]
  ): string {
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
      console.error("Error copy code:", error);
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

  private generateAiUtilsIfNeeded(aiActive: boolean): string {
    if (!aiActive) {
      return "";
    }

    return `
// ============================================================================
// AI UTILITY FUNCTIONS
// ============================================================================
export function simulateAiResponse(text: string) {
  const response = \`<blockquote><p>✨ <strong>AI Response</strong><br>Generated content for: \${text.toUpperCase()}</p></blockquote>\`;
  return of(response).pipe(delay(1500));
}
`;
  }

  private generateAiBlockExtensionSource(): string {
    return `
// ============================================================================
// CUSTOM ANGULAR NODE VIEW EXAMPLE (AI Block)
// ============================================================================

// 1. The Extension Definition (Configuration Object)
export const AiBlockExtension = {
  component: AiBlockComponent,
  name: "aiBlock",
};

// 2. The Angular Component
@Component({
  selector: "app-ai-block",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: \`
    <div class="ai-block-container">
      <div class="ai-prompt-area">
        <textarea
          #textareaRef
          [formControl]="promptControl"
          placeholder="Describe what you want to generate..."
          class="ai-textarea"></textarea>

        <div class="ai-footer">
          <div class="ai-info-text">
            <span class="material-symbols-outlined">info</span>
            Ask AI to improve or generate content
          </div>
          <button
            title="Generate Content"
            [disabled]="isGenerating() || promptControl.invalid"
            (click)="onSend()"
            class="generate-btn">
            <span class="material-symbols-outlined">auto_awesome</span>
            {{ "{{ isGenerating() ? 'Generating...' : 'Generate' }}" }}
          </button>
        </div>
      </div>
    </div>
  \`,
  styles: [\`
    .ai-block-container { 
      background: var(--ate-bg-secondary);
      border: 1px solid var(--ate-border-color);
      border-radius: var(--ate-border-radius, 12px);
      padding: 12px;
    }
    .ai-textarea { 
      width: 100%; min-height: 100px;
      background: var(--ate-bg-primary);
      color: var(--ate-text-primary);
      border: 1px solid var(--ate-border-color);
      border-radius: 8px;
      padding: 12px;
    }
    .generate-btn {
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.5rem 0.75rem; border: none; border-radius: 8px;
      background: var(--ate-primary); color: white; cursor: pointer;
    }
    .generate-btn:disabled { opacity: 0.5; background: var(--ate-text-secondary); cursor: not-allowed; }
  \`]
})
export class AiBlockComponent extends AteAngularNodeView {
  @ViewChild("textareaRef") textareaRef!: ElementRef<HTMLTextAreaElement>;
  private aiService = inject(AiService);
  
  promptControl = new FormControl("", {
    nonNullable: true,
    validators: [Validators.required]
  });
  isGenerating = signal(false);

  async onSend() {
    if (this.isGenerating() || this.promptControl.invalid) return;
    this.isGenerating.set(true);
    this.promptControl.disable();
    
    try {
      const response = await this.aiService.transformText(this.promptControl.value);
      this.isGenerating.set(false);
      const pos = this.getPos();
      if (pos !== undefined) {
        this.editor().chain().focus().insertContentAt(pos, response as any).run();
        this.deleteNode();
      }
    } catch (e) {
      this.isGenerating.set(false);
      this.promptControl.enable();
    }
  }
}
`;
  }
  private generateCounterExampleSource(): string {
    return `
// ============================================================================
// APPROACH 1: TIPTAP-AWARE COMPONENT (Interactive Counter)
// ============================================================================
// This component inherits from AteAngularNodeView, which provides:
// - this.editor(): The current TipTap instance
// - this.node(): Access to the node's properties (like 'count')
// - this.updateAttributes(): Method to persist changes back to the editor
// - this.selected(): Signal that tracks if the node is clicked/selected
// ============================================================================
// 1. The Extension Definition (Configuration Object)
export const CounterExtension = {
  component: CounterNodeComponent,
  name: "counterNode",
  attributes: {
    count: {
      default: 0,
      parseHTML: (el) => parseInt(el.getAttribute("data-count") || "0", 10),
      renderHTML: (attrs) => ({ "data-count": attrs.count }),
    },
  },
};

@Component({
  selector: "app-counter-node",
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="counter-card" [class.is-selected]="selected()">
      <div class="card-header">
        <span class="icon">🔢</span>
        <span class="label">TipTap-Aware</span>
      </div>
      <div class="count-value">{{ count() }}</div>
      <div class="card-footer">
        <button (click)="decrement()" class="btn-sm">-</button>
        <button (click)="reset()" class="btn-sm btn-outline">Reset</button>
        <button (click)="increment()" class="btn-sm">+</button>
      </div>
    </div>
  \`,
  styles: [\`
    .counter-card {
      border: 1px solid var(--ate-border-color, #e2e8f0);
      background: var(--ate-bg-secondary, #ffffff);
      padding: 1rem; border-radius: 12px; max-width: 200px;
      margin: 0.5rem 0; transition: all 0.2s;
    }
    .counter-card.is-selected {
      border-color: var(--ate-primary, #2563eb);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    .card-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .label { font-size: 0.7rem; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .count-value { font-size: 2.5rem; font-weight: 800; text-align: center; color: var(--ate-text-primary, #1e293b); }
    .card-footer { display: flex; justify-content: center; gap: 6px; margin-top: 12px; }
    .btn-sm { 
      padding: 4px 12px; border-radius: 6px; border: none; cursor: pointer;
      background: var(--ate-primary, #2563eb); color: white; transition: filter 0.2s;
    }
    .btn-sm.btn-outline { background: transparent; border: 1px solid var(--ate-border-color); color: #64748b; }
    .btn-sm:hover { filter: brightness(1.1); }
  \`]
})
export class CounterNodeComponent extends AteAngularNodeView {
  // Use computed to automatically react to node attribute changes
  count = computed(() => this.node().attrs.count || 0);

  increment() { this.updateAttributes({ count: this.count() + 1 }); }
  decrement() { this.updateAttributes({ count: Math.max(0, this.count() - 1) }); }
  reset() { this.updateAttributes({ count: 0 }); }
}
`;
  }

  private generateWarningBoxExampleSource(): string {
    return `
// ============================================================================
// APPROACH 2: STANDARD ANGULAR COMPONENT (Warning Box)
// ============================================================================
// This is a pure Angular component with NO knowledge of TipTap.
// The bridge (registerAngularComponent) handles the magic:
// 1. Attributes automatically map to @Input properties.
// 2. An editable area is provided via <ng-content> if 'editableContent' is true.
// 3. TipTap manages the lifecycle and persistence of the content.
// ============================================================================
// 1. The Extension Definition (Configuration Object)
export const WarningBoxExtension = {
  component: DemoInfoBoxComponent,
  name: "warningBox",
  defaultInputs: { variant: "warning" },
  editableContent: true, // Enables <ng-content> to be editable
  contentSelector: ".content-area", // Directs TipTap to this CSS selector
  contentMode: "inline", // Limits content to inline text (no paragraphs)
};

@Component({
  selector: "app-demo-warning-box",
  standalone: true,
  imports: [CommonModule],
  template: \`
    <div class="alert-box" [class]="variant()">
      <div class="alert-icon">⚠️</div>
      <div class="content-area">
        <!-- TipTap will mount its editor zone here -->
        <ng-content></ng-content>
      </div>
    </div>
  \`,
  styles: [\`
    .alert-box { 
      display: flex; gap: 1rem; padding: 1rem; border-radius: 12px; 
      margin: 1.5rem 0; align-items: flex-start;
      border: 1px solid transparent; transition: transform 0.2s;
    }
    .alert-box.warning { background: #fffcf0; border-color: #facc15; color: #854d0e; }
    .alert-icon { font-size: 1.25rem; flex-shrink: 0; }
    .content-area { flex: 1; font-weight: 500; min-height: 1.25rem; }
    .content-area:empty::before { content: 'Warning message...'; opacity: 0.5; }
  \`]
})
export class DemoInfoBoxComponent {
  // Bridge automatically populates this from the 'variant' attribute in TipTap
  variant = input<string>("info");
}
`;
  }
}
