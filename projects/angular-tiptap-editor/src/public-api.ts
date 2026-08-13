/*
 * Public API Surface of tiptap-editor
 */

// Main component & Provider
export * from "./lib/components/editor/angular-tiptap-editor.component";
export { AteTableOfContentsComponent } from "./lib/components/table-of-contents/ate-table-of-contents.component";
export {
  AteTocNodeComponent,
  AteTocNodeOptions,
  getAteTocNodeExtension,
} from "./lib/components/table-of-contents/ate-toc-node.component";
export * from "./lib/ate-editor.provider";

// Composable building blocks: assemble your own editor layout instead of the
// batteries-included component. AteEditorChassisComponent is the recommended
// starting point (zero DI setup); AteEditorCoreComponent is the lower-level
// primitive for full control. See their JSDoc for usage.
export { AteEditorChassisComponent } from "./lib/components/editor-chassis/ate-editor-chassis.component";
export { AteEditorCoreComponent } from "./lib/components/editor-core/ate-editor-core.component";
export { ATE_EDITOR_PROVIDERS } from "./lib/config/ate-editor-providers.config";
export {
  buildAteExtensions,
  type AteExtensionBuilderConfig,
  type AteExtensionBuilderDeps,
} from "./lib/extensions/ate-extension-builder";

// UI chrome components, usable standalone alongside AteEditorCoreComponent
export { AteToolbarComponent } from "./lib/components/toolbar/ate-toolbar.component";
export { AteBubbleMenuComponent } from "./lib/components/bubble-menus/text/ate-bubble-menu.component";
export { AteImageBubbleMenuComponent } from "./lib/components/bubble-menus/image/ate-image-bubble-menu.component";
export { AteTableBubbleMenuComponent } from "./lib/components/bubble-menus/table/ate-table-bubble-menu.component";
export { AteCellBubbleMenuComponent } from "./lib/components/bubble-menus/table/ate-cell-bubble-menu.component";
export { AteLinkBubbleMenuComponent } from "./lib/components/bubble-menus/link/ate-link-bubble-menu.component";
export { AteColorBubbleMenuComponent } from "./lib/components/bubble-menus/color/ate-color-bubble-menu.component";
export { AteSlashCommandsComponent } from "./lib/components/slash-commands/ate-slash-commands.component";
export { AteBlockControlsComponent } from "./lib/components/editor/ate-block-controls.component";
export { AteEditToggleComponent } from "./lib/components/edit-toggle/ate-edit-toggle.component";

// UI atoms, for building a fully custom toolbar with matching visuals
export { AteButtonComponent } from "./lib/components/ui/ate-button.component";
export { AteSeparatorComponent } from "./lib/components/ui/ate-separator.component";
export { AteColorPickerComponent } from "./lib/components/color-picker/ate-color-picker.component";

// Directives
export * from "./lib/directives/ate-noop-value-accessor.directive";
export * from "./lib/directives/ate-tooltip.directive";

// Services
export * from "./lib/services/ate-i18n.service";
export * from "./lib/services/ate-editor-commands.service";
export * from "./lib/services/ate-image.service";
export * from "./lib/services/ate-color-picker.service";
export * from "./lib/services/ate-link.service";
export * from "./lib/services/ate-export.service";
export * from "./lib/services/ate-editor-registry.service";
export * from "./lib/services/ate-editor-ref-resolver";
export * from "./lib/models/ate-editor-ref";

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
export * from "./lib/models/ate-toc.model";

// Default configurations
export * from "./lib/config/ate-editor.config";
export * from "./lib/config/ate-global-config.token";
export * from "./lib/config/ate-toc.config";

// Utility functions for slash commands
export * from "./lib/config/ate-slash-commands.config";

// Translations
export type { SupportedLocale } from "./lib/i18n/ateTranslationsModel";

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
