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

// Angular NodeView Integration
export * from "./lib/node-view/ate-angular-node-view";
export * from "./lib/node-view/ate-node-view.models";
export * from "./lib/node-view/ate-node-view.renderer";
export * from "./lib/node-view/ate-node-view.factory";
export * from "./lib/node-view/ate-register-angular-component"; // Simplified API

// ============================================
// Deprecated Aliases (to be removed in v3.0.0)
// ============================================

import { AteI18nService } from "./lib/services/ate-i18n.service";
import { AteEditorCommandsService } from "./lib/services/ate-editor-commands.service";
import { AteImageService } from "./lib/services/ate-image.service";
import { AteColorPickerService } from "./lib/services/ate-color-picker.service";
import { AteLinkService } from "./lib/services/ate-link.service";
import {
  AteEditorStateSnapshot,
  ATE_INITIAL_EDITOR_STATE,
} from "./lib/models/ate-editor-state.model";
import { AteToolbarConfig } from "./lib/models/ate-toolbar.model";
import {
  AteBubbleMenuConfig,
  AteTableBubbleMenuConfig,
  AteCellBubbleMenuConfig,
  AteImageBubbleMenuConfig,
} from "./lib/models/ate-bubble-menu.model";
import {
  AteSlashCommandsConfig,
  AteSlashCommandKey,
  ATE_SLASH_COMMAND_KEYS,
  ATE_DEFAULT_SLASH_COMMANDS_CONFIG,
} from "./lib/config/ate-slash-commands.config";
import { AteEditorConfig } from "./lib/models/ate-editor-config.model";
import {
  AteImageUploadOptions,
  AteImageUploadHandler,
  AteImageUploadResult,
  AteImageData,
  AteResizeOptions,
} from "./lib/models/ate-image.model";
import {
  AteCustomSlashCommands,
  AteSlashCommandItem,
} from "./lib/components/slash-commands/ate-slash-commands.component";
import { AteDiscoveryCalculator } from "./lib/extensions/calculators/ate-discovery.calculator";
import { AteImageCalculator } from "./lib/extensions/calculators/ate-image.calculator";
import { AteMarksCalculator } from "./lib/extensions/calculators/ate-marks.calculator";
import { AteSelectionCalculator } from "./lib/extensions/calculators/ate-selection.calculator";
import { AteStructureCalculator } from "./lib/extensions/calculators/ate-structure.calculator";
import { AteTableCalculator } from "./lib/extensions/calculators/ate-table.calculator";
import {
  ATE_DEFAULT_TOOLBAR_CONFIG,
  ATE_DEFAULT_BUBBLE_MENU_CONFIG,
  ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG,
  ATE_DEFAULT_TABLE_MENU_CONFIG,
  ATE_DEFAULT_CELL_MENU_CONFIG,
} from "./lib/config/ate-editor.config";

/** @deprecated Renamed to `AteI18nService`. This alias will be removed in v3.0.0. */
export { AteI18nService as TiptapI18nService };
/** @deprecated Renamed to `AteEditorCommandsService`. This alias will be removed in v3.0.0. */
export { AteEditorCommandsService as EditorCommandsService };
/** @deprecated Renamed to `AteImageService`. This alias will be removed in v3.0.0. */
export { AteImageService as ImageService };
/** @deprecated Renamed to `AteColorPickerService`. This alias will be removed in v3.0.0. */
export { AteColorPickerService as ColorPickerService };
/** @deprecated Renamed to `AteLinkService`. This alias will be removed in v3.0.0. */
export { AteLinkService as LinkService };

/** @deprecated Renamed to `AteEditorStateSnapshot`. This alias will be removed in v3.0.0. */
export type { AteEditorStateSnapshot as EditorStateSnapshot };
/** @deprecated Renamed to `ATE_INITIAL_EDITOR_STATE`. This alias will be removed in v3.0.0. */
export const INITIAL_EDITOR_STATE = ATE_INITIAL_EDITOR_STATE;

/** @deprecated Renamed to `AteToolbarConfig`. This alias will be removed in v3.0.0. */
export type { AteToolbarConfig as ToolbarConfig };
/** @deprecated Renamed to `AteBubbleMenuConfig`. This alias will be removed in v3.0.0. */
export type { AteBubbleMenuConfig as BubbleMenuConfig };
/** @deprecated Renamed to `AteTableBubbleMenuConfig`. This alias will be removed in v3.0.0. */
export type { AteTableBubbleMenuConfig as TableBubbleMenuConfig };
/** @deprecated Renamed to `AteCellBubbleMenuConfig`. This alias will be removed in v3.0.0. */
export type { AteCellBubbleMenuConfig as CellBubbleMenuConfig };
/** @deprecated Renamed to `AteImageBubbleMenuConfig`. This alias will be removed in v3.0.0. */
export type { AteImageBubbleMenuConfig as ImageBubbleMenuConfig };

/** @deprecated Renamed to `AteSlashCommandsConfig`. This alias will be removed in v3.0.0. */
export type { AteSlashCommandsConfig as SlashCommandsConfig };
/** @deprecated Renamed to `AteSlashCommandKey`. This alias will be removed in v3.0.0. */
export type { AteSlashCommandKey as SlashCommandKey };
/** @deprecated Renamed to `ATE_SLASH_COMMAND_KEYS`. This alias will be removed in v3.0.0. */
export const SLASH_COMMAND_KEYS = ATE_SLASH_COMMAND_KEYS;
/** @deprecated Renamed to `ATE_DEFAULT_SLASH_COMMANDS_CONFIG`. This alias will be removed in v3.0.0. */
export const DEFAULT_SLASH_COMMANDS_CONFIG = ATE_DEFAULT_SLASH_COMMANDS_CONFIG;

/** @deprecated Renamed to `AteEditorConfig`. This alias will be removed in v3.0.0. */
export type { AteEditorConfig as EditorConfig };

/** @deprecated Renamed to `AteImageUploadOptions`. This alias will be removed in v3.0.0. */
export type { AteImageUploadOptions as ImageUploadOptions };
/** @deprecated Renamed to `AteImageUploadHandler`. This alias will be removed in v3.0.0. */
export type { AteImageUploadHandler as ImageUploadHandler };
/** @deprecated Renamed to `AteImageUploadResult`. This alias will be removed in v3.0.0. */
export type { AteImageUploadResult as ImageUploadResult };
/** @deprecated Renamed to `AteImageData`. This alias will be removed in v3.0.0. */
export type { AteImageData as ImageData };
/** @deprecated Renamed to `AteResizeOptions`. This alias will be removed in v3.0.0. */
export type { AteResizeOptions as ResizeOptions };

/** @deprecated Renamed to `AteCustomSlashCommands`. This alias will be removed in v3.0.0. */
export type { AteCustomSlashCommands as CustomSlashCommands };
/** @deprecated Renamed to `AteSlashCommandItem`. This alias will be removed in v3.0.0. */
export type { AteSlashCommandItem as SlashCommandItem };

/** @deprecated Renamed to `AteDiscoveryCalculator`. This alias will be removed in v3.0.0. */
export const DiscoveryCalculator = AteDiscoveryCalculator;
/** @deprecated Renamed to `AteImageCalculator`. This alias will be removed in v3.0.0. */
export const ImageCalculator = AteImageCalculator;
/** @deprecated Renamed to `AteMarksCalculator`. This alias will be removed in v3.0.0. */
export const MarksCalculator = AteMarksCalculator;
/** @deprecated Renamed to `AteSelectionCalculator`. This alias will be removed in v3.0.0. */
export const SelectionCalculator = AteSelectionCalculator;
/** @deprecated Renamed to `AteStructureCalculator`. This alias will be removed in v3.0.0. */
export const StructureCalculator = AteStructureCalculator;
/** @deprecated Renamed to `AteTableCalculator`. This alias will be removed in v3.0.0. */
export const TableCalculator = AteTableCalculator;

/** @deprecated Renamed to `ATE_DEFAULT_TOOLBAR_CONFIG`. This alias will be removed in v3.0.0. */
export const DEFAULT_TOOLBAR_CONFIG = ATE_DEFAULT_TOOLBAR_CONFIG;
/** @deprecated Renamed to `ATE_DEFAULT_BUBBLE_MENU_CONFIG`. This alias will be removed in v3.0.0. */
export const DEFAULT_BUBBLE_MENU_CONFIG = ATE_DEFAULT_BUBBLE_MENU_CONFIG;
/** @deprecated Renamed to `ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG`. This alias will be removed in v3.0.0. */
export const DEFAULT_IMAGE_BUBBLE_MENU_CONFIG = ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG;
/** @deprecated Renamed to `ATE_DEFAULT_TABLE_MENU_CONFIG`. This alias will be removed in v3.0.0. */
export const DEFAULT_TABLE_MENU_CONFIG = ATE_DEFAULT_TABLE_MENU_CONFIG;
/** @deprecated Renamed to `ATE_DEFAULT_CELL_MENU_CONFIG`. This alias will be removed in v3.0.0. */
export const DEFAULT_CELL_MENU_CONFIG = ATE_DEFAULT_CELL_MENU_CONFIG;
