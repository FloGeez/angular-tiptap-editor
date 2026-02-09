import { Type } from "@angular/core";
import { AteToolbarConfig } from "./ate-toolbar.model";
import { RegisterAngularComponentOptions } from "../node-view/ate-node-view.models";
import {
  AteBubbleMenuConfig,
  AteImageBubbleMenuConfig,
  AteTableBubbleMenuConfig,
  AteCellBubbleMenuConfig,
} from "./ate-bubble-menu.model";
import { AteSlashCommandsConfig } from "../config/ate-slash-commands.config";
import { AteImageUploadConfig } from "./ate-image.model";
import { Extension, Node, Mark, EditorOptions } from "@tiptap/core";
import { AteStateCalculator } from "./ate-editor-state.model";
import { AteCustomSlashCommands } from "./ate-slash-command.model";

/**
 * Type representing an Angular component that can be registered as an editor node.
 * Can be a direct Component class or a full registration options object.
 */
export type AteAngularNode = Type<unknown> | RegisterAngularComponentOptions<unknown>;

/**
 * Global configuration interface for Angular Tiptap Editor.
 * Uses a flat structure for common settings and objects for complex configurations.
 */
export interface AteEditorConfig {
  // --- 1. Core Settings (First-class citizens) ---

  /** Editor theme: light, dark, or system auto-detection */
  theme?: "light" | "dark" | "auto";
  /** Display mode: classic or seamless (no borders/background) */
  mode?: "classic" | "seamless";
  /** Editor height (e.g., '300px', 300, 'auto') */
  height?: string | number;
  /** Focus position on initialization */
  autofocus?: "start" | "end" | "all" | boolean | number;
  /** Placeholder text displayed when the editor is empty */
  placeholder?: string;
  /** Initial editing state (if false, the editor is read-only) */
  editable?: boolean;
  /** Minimum editor height (e.g., '200px', 200) */
  minHeight?: string | number;
  /** Maximum editor height (e.g., '500px', 500) */
  maxHeight?: string | number;
  /** If true, the editor takes 100% of the parent container's height */
  fillContainer?: boolean;
  /** Disabled state (often used with forms) */
  disabled?: boolean;
  /** Editor locale (overrides the global i18n service) */
  locale?: string;
  /** Enable browser spellcheck */
  spellcheck?: boolean;
  /** Enable smart cleanup when pasting from Office/Word */
  enableOfficePaste?: boolean;

  // --- 2. Display Options (Simple booleans) ---

  /** Show or hide the toolbar */
  showToolbar?: boolean;
  /** Show or hide the footer (counters area) */
  showFooter?: boolean;
  /** Show or hide the character count */
  showCharacterCount?: boolean;
  /** Show or hide the word count */
  showWordCount?: boolean;
  /** Show or hide the read-only/edit toggle button */
  showEditToggle?: boolean;
  /** Show or hide the text context menu */
  showBubbleMenu?: boolean;
  /** Show or hide the image context menu */
  showImageBubbleMenu?: boolean;
  /** Show or hide the table menu */
  showTableMenu?: boolean;
  /** Show or hide the cell menu */
  showCellMenu?: boolean;
  /** Whether to allow image downloading from bubble menu */
  downloadImage?: boolean;
  /** Enable or disable slash commands (/) */
  enableSlashCommands?: boolean;
  /** Maximum number of characters allowed */
  maxCharacters?: number;

  // --- 3. Complex Configurations (Config Objects) ---

  /** Detailed toolbar configuration (items, groups) */
  toolbar?: AteToolbarConfig;
  /** Text context menu configuration */
  bubbleMenu?: AteBubbleMenuConfig;
  /** Image context menu configuration */
  imageBubbleMenu?: AteImageBubbleMenuConfig;
  /** Table context menu configuration */
  tableBubbleMenu?: AteTableBubbleMenuConfig;
  /** Cell context menu configuration */
  cellBubbleMenu?: AteCellBubbleMenuConfig;
  /** Slash commands configuration (/) */
  slashCommands?: AteSlashCommandsConfig;
  /** If true, shows the floating toolbar on focus */
  floatingToolbar?: boolean;

  // --- 4. External Modules ---

  /** Technical configuration for image uploads */
  imageUpload?: AteImageUploadConfig;

  /**
   * List of Angular components to automatically register as interactive editor nodes.
   * This is the preferred way to extend the editor with custom Angular logic.
   */
  angularNodes?: AteAngularNode[];

  // --- 5. Low-level & Reactive Extensions ---

  /** Standard TipTap extensions (Nodes, Marks, or Plugins) */
  tiptapExtensions?: (Extension | Node | Mark)[];
  /** Raw TipTap editor options (e.g., enableInputRules, injectCSS, etc.) */
  tiptapOptions?: Partial<EditorOptions>;
  /** Reactive state calculators to extend the editor's live state */
  stateCalculators?: AteStateCalculator[];
  /**
   * Fully custom slash commands configuration.
   * When provided, it replaces the default groups based on toolbar toggles.
   */
  customSlashCommands?: AteCustomSlashCommands;
}
