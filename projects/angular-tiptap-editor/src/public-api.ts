/*
 * Public API Surface of tiptap-editor
 */

// Main component & Provider
export * from "./lib/components/editor/angular-tiptap-editor.component";
export * from "./lib/ate-editor.provider";

// Directives
export * from "./lib/directives/ate-noop-value-accessor.directive";
export * from "./lib/directives/ate-tooltip.directive";

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
export * from "./lib/models/ate-slash-command.model";

// Default configurations
export * from "./lib/config/ate-editor.config";
export * from "./lib/config/ate-global-config.token";

// Utility functions for slash commands
export * from "./lib/config/ate-slash-commands.config";

// Translations
export type { SupportedLocale } from "./lib/services/ate-i18n.service";

// Angular NodeView Integration
export { AteAngularNodeView } from "./lib/node-view/ate-angular-node-view";
export { AteNodeViewRenderer } from "./lib/node-view/ate-node-view.renderer";
export { createAngularComponentExtension } from "./lib/node-view/ate-node-view.factory";
export { registerAngularComponent } from "./lib/node-view/ate-register-angular-component";

// Node View Types - AteAngularNode is the primary public type
export type { AteAngularNode } from "./lib/models/ate-editor-config.model";
// Advanced: Low-level options for full control over node registration
export type {
  RegisterAngularComponentOptions,
  AteComponentRenderOptions,
} from "./lib/node-view/ate-node-view.models";
