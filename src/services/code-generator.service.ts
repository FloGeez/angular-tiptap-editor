import { Injectable, inject } from "@angular/core";
import {
  TiptapI18nService,
  DEFAULT_TOOLBAR_CONFIG,
  DEFAULT_BUBBLE_MENU_CONFIG,
  SLASH_COMMAND_KEYS,
  ToolbarConfig,
  BubbleMenuConfig,
  SlashCommandKey,
  SlashCommandsConfig,
  DEFAULT_SLASH_COMMANDS_CONFIG,
} from "angular-tiptap-editor";
import { AppI18nService } from "./app-i18n.service";
import {
  TOOLBAR_ITEMS,
  BUBBLE_MENU_ITEMS,
} from "../config/editor-items.config";
import { ConfigItem } from "../types/editor-config.types";
import { EditorConfigurationService } from "./editor-configuration.service";

// Les configurations par défaut sont maintenant importées de la librairie

@Injectable({
  providedIn: "root",
})
export class CodeGeneratorService {
  private configService = inject(EditorConfigurationService);
  private i18nService = inject(TiptapI18nService);
  private appI18nService = inject(AppI18nService);

  generateCode(): string {
    const editorState = this.configService.editorState();
    const toolbarConfig = this.configService.toolbarConfig();
    const bubbleMenuConfig = this.configService.bubbleMenuConfig();
    const slashCommands = this.configService.slashCommandsConfig(); // Changed from activeSlashCommands to slashCommands
    const currentLocale = this.i18nService.currentLocale();
    const codeGen = this.appI18nService.codeGeneration();

    // Detect enabled features and if they differ from default values
    const hasActiveToolbar = this.hasActiveItems(toolbarConfig, TOOLBAR_ITEMS);
    const hasActiveBubbleMenu = this.hasActiveItems(
      bubbleMenuConfig,
      BUBBLE_MENU_ITEMS
    );

    const isToolbarDefault = this.isToolbarDefault(toolbarConfig);
    const isBubbleMenuDefault = this.isBubbleMenuDefault(bubbleMenuConfig);
    const isSlashCommandsDefault = this.isSlashCommandsDefault(slashCommands);

    // Filter active items to only show active ones in generated code if customized
    const activeSlashCommands = new Set(
      Object.entries(slashCommands)
        .filter(([k, v]) => k !== "custom" && v === true)
        .map(([k]) => k as SlashCommandKey)
    );
    const hasCustomSlashCommands = !!(slashCommands.custom && slashCommands.custom.length > 0);
    const hasActiveSlashCommands = activeSlashCommands.size > 0 || hasCustomSlashCommands;

    // Generate locale input if a specific language is selected
    const localeInput = currentLocale
      ? `\n      [locale]="${currentLocale}"`
      : "";

    return `${this.generateImports(
      hasActiveToolbar && !isToolbarDefault,
      hasActiveBubbleMenu && !isBubbleMenuDefault,
      hasActiveSlashCommands && !isSlashCommandsDefault
    )}

${this.generateComponentDecorator(
      editorState,
      localeInput,
      hasActiveToolbar && !isToolbarDefault,
      hasActiveBubbleMenu && !isBubbleMenuDefault,
      hasActiveSlashCommands && !isSlashCommandsDefault
    )}
export class TiptapDemoComponent {
  
  // ============================================================================
  // DEMO CONTENT
  // ============================================================================
  ${this.generateDemoContent(codeGen)}

  ${hasActiveToolbar && !isToolbarDefault
        ? this.generateToolbarConfig(toolbarConfig, codeGen)
        : ""
      }

  ${hasActiveBubbleMenu && !isBubbleMenuDefault
        ? this.generateBubbleMenuConfig(bubbleMenuConfig, codeGen)
        : ""
      }

  ${hasActiveSlashCommands && !isSlashCommandsDefault
        ? this.generateSlashCommandsConfig(activeSlashCommands, codeGen)
        : ""
      }

  ${this.generateContentChangeHandler(codeGen)}
}`;
  }

  private hasActiveItems(
    config: Record<string, boolean>,
    items: ConfigItem[]
  ): boolean {
    return items.some(
      (item) => item.key !== "separator" && config[item.key] === true
    );
  }

  private isToolbarDefault(config: Record<string, boolean>): boolean {
    // Compare with default values for all elements
    const allKeys = Object.keys(DEFAULT_TOOLBAR_CONFIG);

    return allKeys.every((key) => {
      const configValue = config[key] === true;
      const defaultValue =
        DEFAULT_TOOLBAR_CONFIG[key as keyof typeof DEFAULT_TOOLBAR_CONFIG] ===
        true;
      return configValue === defaultValue;
    });
  }

  private isBubbleMenuDefault(config: Record<string, boolean>): boolean {
    // Compare with default values for all elements
    const allKeys = Object.keys(DEFAULT_BUBBLE_MENU_CONFIG);

    return allKeys.every((key) => {
      const configValue = config[key] === true;
      const defaultValue =
        DEFAULT_BUBBLE_MENU_CONFIG[
        key as keyof typeof DEFAULT_BUBBLE_MENU_CONFIG
        ] === true;
      return configValue === defaultValue;
    });
  }

  private isSlashCommandsDefault(config: SlashCommandsConfig): boolean {
    const hasCustom = !!(config.custom && config.custom.length > 0);
    if (hasCustom) return false;

    // On ne compare que les clés natives
    const keys = Object.keys(DEFAULT_SLASH_COMMANDS_CONFIG) as SlashCommandKey[];
    return keys.every(key => {
      // Si la clé n'est pas dans config, on considère qu'elle est à sa valeur par défaut
      const value = config[key];
      return value === undefined || value === DEFAULT_SLASH_COMMANDS_CONFIG[key];
    });
  }

  private generateImports(
    hasToolbar: boolean,
    hasBubbleMenu: boolean,
    hasSlashCommands: boolean
  ): string {
    const imports = [
      "import { Component } from '@angular/core';",
      "import { TiptapEditorComponent } from 'tiptap-editor';",
    ];

    // Add conditional imports based on used features
    if (hasToolbar || hasBubbleMenu || hasSlashCommands) {
      // Les constantes par défaut sont déjà gérées par le composant si non fourni
    }

    return `// ============================================================================
// IMPORTS
// ============================================================================
${imports.join("\n")}`;
  }

  private generateComponentDecorator(
    editorState: any,
    localeInput: string,
    hasToolbar: boolean,
    hasBubbleMenu: boolean,
    hasSlashCommands: boolean
  ): string {
    const templateProps = [
      `[content]="${this.appI18nService.codeGeneration().demoContentVar}"`,
    ];

    // Add conditional props only if config differs from default values
    if (hasToolbar) {
      templateProps.push(
        `[toolbar]="${this.appI18nService.codeGeneration().toolbarConfigVar}"`
      );
    }

    if (hasBubbleMenu) {
      templateProps.push(
        `[bubbleMenu]="${this.appI18nService.codeGeneration().bubbleMenuConfigVar
        }"`
      );
    }

    // Always present props
    templateProps.push(
      `[showBubbleMenu]="${editorState.showBubbleMenu}"`,
      `[enableSlashCommands]="${editorState.enableSlashCommands}"`,
      `[showToolbar]="${editorState.showToolbar}"`,
      `[placeholder]="${editorState.placeholder}"`,
      `(contentChange)="${this.appI18nService.codeGeneration().onContentChangeVar
      }($event)"`
    );

    // Add slashCommands only if they differ from default values
    if (hasSlashCommands) {
      templateProps.splice(
        4,
        0,
        `[slashCommands]="${this.appI18nService.codeGeneration().slashCommandsConfigVar
        }"`
      );
    }

    // Add locale if specified
    if (localeInput) {
      templateProps.splice(1, 0, localeInput.trim());
    }

    return `@Component({
  selector: 'app-tiptap-demo',
  standalone: true,
  imports: [TiptapEditorComponent],
  template: \`
    <tiptap-editor
      ${templateProps.join("\n      ")}
    >
    </tiptap-editor>
  \`
})`;
  }

  private generateDemoContent(codeGen: any): string {
    return `// ${codeGen.demoContentComment}
  ${codeGen.demoContentVar} = '<p>${codeGen.placeholderContent}</p>';`;
  }

  private generateToolbarConfig(toolbarConfig: any, codeGen: any): string {
    return `
  // ============================================================================
  // TOOLBAR CONFIGURATION
  // ============================================================================
  ${codeGen.toolbarConfigComment}
  ${codeGen.toolbarConfigVar} = {
${this.generateSimpleConfig(toolbarConfig, TOOLBAR_ITEMS)}
  };`;
  }

  private generateBubbleMenuConfig(
    bubbleMenuConfig: any,
    codeGen: any
  ): string {
    return `
  // ============================================================================
  // BUBBLE MENU CONFIGURATION
  // ============================================================================
  ${codeGen.bubbleMenuConfigComment}
  ${codeGen.bubbleMenuConfigVar} = {
${this.generateSimpleConfig(bubbleMenuConfig, BUBBLE_MENU_ITEMS)}
  };`;
  }

  private generateSlashCommandsConfig(
    activeSlashCommands: Set<SlashCommandKey>,
    codeGen: any
  ): string {
    const config = this.configService.slashCommandsConfig();
    const hasCustom = !!(config.custom && config.custom.length > 0);

    let customCode = "";
    if (hasCustom) {
      const t = this.appI18nService.translations().items;
      const customItemsFormatted = JSON.stringify(config.custom, (key, value) => {
        if (key === 'command') return 'PLACEHOLDER_COMMAND';
        return value;
      }, 2)
        .replace(/"command": "PLACEHOLDER_COMMAND"/g, `command: (editor: Editor) => {
      editor.commands.insertContent(\`<h3>✨ \${t.customMagicTitle}</h3><p>...</p>\`);
    }`)
        .split('\n')
        .map((line, i) => i === 0 ? line : '    ' + line)
        .join('\n');

      customCode = `,\n    custom: ${customItemsFormatted}`;
    }

    return `
  // ============================================================================
  // SLASH COMMANDS CONFIGURATION
  // ============================================================================
  ${codeGen.slashCommandsConfigComment}
  ${codeGen.slashCommandsConfigVar} = {
${this.generateSimpleSlashCommandsConfig(activeSlashCommands)}${customCode}
  };`;
  }

  private generateSimpleSlashCommandsConfig(activeCommands: Set<SlashCommandKey>): string {
    return SLASH_COMMAND_KEYS.map(key => {
      const isActive = activeCommands.has(key);
      const comment = isActive ? "" : " // ";
      return `${comment}    ${key}: ${isActive},`;
    }).join("\n");
  }

  private generateContentChangeHandler(codeGen: any): string {
    return `
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  ${codeGen.onContentChangeComment}
  ${codeGen.onContentChangeVar}(content: string) {
    console.log('${codeGen.contentChangedLog}', content);
  }`;
  }

  private generateSimpleConfig(
    config: Record<string, boolean>,
    availableItems: ConfigItem[]
  ): string {
    return availableItems
      .filter((item) => item.key !== "separator")
      .map((item) => {
        const isActive = config[item.key] === true;
        const comment = isActive ? "" : " // ";
        return `${comment}    ${item.key}: ${isActive},`;
      })
      .join("\n");
  }

  // complete slash commands generation removed in favor of simple boolean mapping
  // but kept as private for advanced users who might want to copy-paste logic
  private generateCompleteSlashCommandsConfig(
    activeCommands: Set<SlashCommandKey>
  ): string {
    const slashTranslations = this.i18nService.slashCommands() as Record<string, any>;
    const activeCommandsArray = Array.from(activeCommands);

    return activeCommandsArray
      .map((key) => {
        const translation = slashTranslations[key] || { title: key, description: "", keywords: [] };
        // mapping logic...
        const iconMap: Record<string, string> = {
          heading1: "format_h1",
          heading2: "format_h2",
          heading3: "format_h3",
          bulletList: "format_list_bulleted",
          orderedList: "format_list_numbered",
          blockquote: "format_quote",
          code: "code",
          image: "image",
          horizontalRule: "horizontal_rule",
          table: "table_view",
        };

        const codeGen = this.appI18nService.codeGeneration();
        return `      {
        title: '${translation.title}',
        description: '${translation.description}',
        icon: '${iconMap[key]}',
        keywords: ${JSON.stringify(translation.keywords)},
        command: (editor) => {
          // ${codeGen.commandImplementation} ${key}
          ${this.generateCommandImplementation(key)}
        }
      }`;
      })
      .join(",\n");
  }

  private generateCommandImplementation(key: string): string {
    const codeGen = this.appI18nService.codeGeneration();
    const implementations: Record<string, string> = {
      heading1: "editor.chain().focus().toggleHeading({ level: 1 }).run();",
      heading2: "editor.chain().focus().toggleHeading({ level: 2 }).run();",
      heading3: "editor.chain().focus().toggleHeading({ level: 3 }).run();",
      bulletList: "editor.chain().focus().toggleBulletList().run();",
      orderedList: "editor.chain().focus().toggleOrderedList().run();",
      blockquote: "editor.chain().focus().toggleBlockquote().run();",
      code: "editor.chain().focus().toggleCodeBlock().run();",
      image: `console.log('${codeGen.implementImageUpload}');`,
      horizontalRule: "editor.chain().focus().setHorizontalRule().run();",
      table: "editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run();",
    };

    return (
      implementations[key] ||
      `console.log('${codeGen.commandImplementation} ${key}');`
    );
  }

  // Copy code to clipboard
  async copyCode(): Promise<boolean> {
    try {
      const code = this.generateCode();

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for non-secure contexts or older browsers
        const textArea = document.createElement("textarea");
        textArea.value = code;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
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

  // Method to highlight code (placeholder for now)
  highlightCode(code: string): string {
    // Return raw code without highlighting to avoid display issues
    return code;
  }
}
