/*
 * Public API Surface of tiptap-editor
 */

// Main component
export * from "./lib/tiptap-editor.component";

// Host directive for FormControl integration (Required by Angular)
export * from "./lib/noop-value-accessor.directive";

// Services
export * from "./lib/services/i18n.service";
export * from "./lib/services/editor-commands.service";
export * from "./lib/services/image.service";
export * from "./lib/services/color-picker.service";
export * from "./lib/services/link.service";

// State & Calculators (Essential for custom plugins)
export * from "./lib/models/editor-state.model";
export * from "./lib/extensions/calculators/discovery.calculator";
export * from "./lib/extensions/calculators/image.calculator";
export * from "./lib/extensions/calculators/marks.calculator";
export * from "./lib/extensions/calculators/selection.calculator";
export * from "./lib/extensions/calculators/structure.calculator";
export * from "./lib/extensions/calculators/table.calculator";

// Types and interfaces for configuration
export * from "./lib/models/toolbar.model";
export * from "./lib/models/image.model";
export * from "./lib/models/bubble-menu.model";
export * from "./lib/models/editor-config.model";
export type {
  CustomSlashCommands,
  SlashCommandItem,
} from "./lib/tiptap-slash-commands.component";

// Default configurations
export * from "./lib/config/editor.config";

// Utility functions for slash commands
export * from "./lib/config/slash-commands.config";

// Translations
export type { SupportedLocale } from "./lib/services/i18n.service";
