// Main component
export { AngularTiptapEditorComponent } from "./tiptap-editor.component";

// Bubble menus
export { TiptapBubbleMenuComponent } from "./tiptap-bubble-menu.component";
export { TiptapImageBubbleMenuComponent } from "./tiptap-image-bubble-menu.component";
export { TiptapTableBubbleMenuComponent } from "./tiptap-table-bubble-menu.component";
export { TiptapCellBubbleMenuComponent } from "./tiptap-cell-bubble-menu.component";
export { TiptapLinkBubbleMenuComponent } from "./tiptap-link-bubble-menu.component";

// Toolbar components
export { TiptapToolbarComponent } from "./tiptap-toolbar.component";
export { TiptapButtonComponent } from "./tiptap-button.component";
export { TiptapSeparatorComponent } from "./tiptap-separator.component";

// Slash commands
export { TiptapSlashCommandsComponent } from "./tiptap-slash-commands.component";

// Services
export { TiptapI18nService } from "./services/i18n.service";
export { EditorCommandsService } from "./services/editor-commands.service";
export { ImageService } from "./services/image.service";

// Models and types
export type {
  BubbleMenuConfig,
  ImageBubbleMenuConfig,
  TableBubbleMenuConfig,
  CellBubbleMenuConfig,
} from "./models/bubble-menu.model";

// Image upload types
export type {
  ImageUploadHandler,
  ImageUploadContext,
  ImageUploadHandlerResult,
  ImageUploadResult,
  ImageData,
} from "./services/image.service";
