/*
 * Public API Surface of tiptap-editor
 */

// Main component - only public component
export * from "./lib/tiptap-editor.component";

// Host directive for FormControl integration
export * from "./lib/noop-value-accessor.directive";

// Internationalization service
export * from "./lib/services/i18n.service";

// Editor commands service
export * from "./lib/services/editor-commands.service";

// Image service
export * from "./lib/services/image.service";

// Types and interfaces for configuration
export type { ToolbarConfig } from "./lib/tiptap-toolbar.component";
export type {
  BubbleMenuConfig,
  ImageBubbleMenuConfig,
  TableBubbleMenuConfig,
  CellBubbleMenuConfig,
} from "./lib/models/bubble-menu.model";
export type {
  CustomSlashCommands,
  SlashCommandItem,
} from "./lib/tiptap-slash-commands.component";
// Default configurations
export { DEFAULT_TOOLBAR_CONFIG } from "./lib/tiptap-editor.component";
export { DEFAULT_BUBBLE_MENU_CONFIG } from "./lib/tiptap-editor.component";
export { DEFAULT_IMAGE_BUBBLE_MENU_CONFIG } from "./lib/tiptap-editor.component";
export { DEFAULT_TABLE_MENU_CONFIG } from "./lib/tiptap-editor.component";

// Utility functions to create and filter internationalized slash commands
export {
  createDefaultSlashCommands,
  filterSlashCommands,
  SLASH_COMMAND_KEYS,
  DEFAULT_SLASH_COMMANDS_CONFIG,
} from "./lib/config/slash-commands.config";
export type {
  SlashCommandKey,
  SlashCommandsConfig,
} from "./lib/config/slash-commands.config";

// Types for height configuration
export type HeightConfig = {
  minHeight?: number;
  height?: number;
  maxHeight?: number;
};

// Supported locales type
export type { SupportedLocale } from "./lib/services/i18n.service";
