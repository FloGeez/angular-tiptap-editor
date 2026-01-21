import { ToolbarConfig } from "./toolbar.model";
import {
  BubbleMenuConfig,
  ImageBubbleMenuConfig,
  TableBubbleMenuConfig,
  CellBubbleMenuConfig,
} from "./bubble-menu.model";
import { SlashCommandsConfig } from "../config/slash-commands.config";
import { AteImageUploadConfig } from "./image.model";

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
  /** Editor height (e.g., '300px', 'auto') */
  height?: string;
  /** Focus position on initialization */
  autofocus?: "start" | "end" | "all" | boolean | number;
  /** Placeholder text displayed when the editor is empty */
  placeholder?: string;
  /** Initial editing state (if false, the editor is read-only) */
  editable?: boolean;
  /** Minimum editor height (e.g., '200px') */
  minHeight?: string;
  /** Maximum editor height (e.g., '500px') */
  maxHeight?: string;
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
  /** Enable or disable slash commands (/) */
  enableSlashCommands?: boolean;
  /** Maximum number of characters allowed */
  maxCharacters?: number;

  // --- 3. Complex Configurations (Config Objects) ---

  /** Detailed toolbar configuration (items, groups) */
  toolbar?: ToolbarConfig;
  /** Text context menu configuration */
  bubbleMenu?: BubbleMenuConfig;
  /** Image context menu configuration */
  imageBubbleMenu?: ImageBubbleMenuConfig;
  /** Table context menu configuration */
  tableBubbleMenu?: TableBubbleMenuConfig;
  /** Cell context menu configuration */
  cellBubbleMenu?: CellBubbleMenuConfig;
  /** Slash commands configuration (/) */
  slashCommands?: SlashCommandsConfig;
  /** If true, shows the floating toolbar on focus */
  floatingToolbar?: boolean;

  // --- 4. External Modules ---

  /** Technical configuration for image uploads */
  imageUpload?: AteImageUploadConfig;
}
