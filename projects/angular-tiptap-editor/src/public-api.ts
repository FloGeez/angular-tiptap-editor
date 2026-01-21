/*
 * Public API Surface of tiptap-editor
 */

// Main component
export * from "./lib/components/editor/angular-tiptap-editor.component";

// Host directive for FormControl integration (Required by Angular)
export * from "./lib/directives/ate-noop-value-accessor.directive";

// Services
export * from "./lib/services/ate-i18n.service";
export * from "./lib/services/ate-editor-commands.service";
export * from "./lib/services/ate-image.service";
export * from "./lib/services/ate-color-picker.service";
export * from "./lib/services/ate-link.service";

// State & Calculators (Essential for custom plugins)
export * from "./lib/models/ate-editor-state.model";
export * from "./lib/extensions/calculators/ate-discovery.calculator";
export * from "./lib/extensions/calculators/ate-image.calculator";
export * from "./lib/extensions/calculators/ate-marks.calculator";
export * from "./lib/extensions/calculators/ate-selection.calculator";
export * from "./lib/extensions/calculators/ate-structure.calculator";
export * from "./lib/extensions/calculators/ate-table.calculator";

// Types and interfaces for configuration
export * from "./lib/models/ate-toolbar.model";
export * from "./lib/models/ate-image.model";
export * from "./lib/models/ate-bubble-menu.model";
export * from "./lib/models/ate-editor-config.model";
export type {
  AteCustomSlashCommands,
  AteSlashCommandItem,
} from "./lib/components/slash-commands/ate-slash-commands.component";

// Default configurations
export * from "./lib/config/ate-editor.config";

// Utility functions for slash commands
export * from "./lib/config/ate-slash-commands.config";

// Translations
export type { SupportedLocale } from "./lib/services/ate-i18n.service";
