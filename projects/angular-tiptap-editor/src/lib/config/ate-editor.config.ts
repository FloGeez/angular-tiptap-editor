import { AteToolbarConfig } from "../models/ate-toolbar.model";
import {
  AteBubbleMenuConfig,
  AteImageBubbleMenuConfig,
  AteTableBubbleMenuConfig,
  AteCellBubbleMenuConfig,
} from "../models/ate-bubble-menu.model";
import { AteImageUploadConfig } from "../models/ate-image.model";

// Default toolbar configuration
export const ATE_DEFAULT_TOOLBAR_CONFIG: AteToolbarConfig = {
  bold: true,
  italic: true,
  underline: true,
  strike: true,
  code: true,
  codeBlock: true,
  superscript: false, // Disabled by default (opt-in)
  subscript: false, // Disabled by default (opt-in)
  highlight: false, // Disabled by default (opt-in)
  highlightPicker: true,
  heading1: true,
  heading2: true,
  heading3: true,
  bulletList: true,
  orderedList: true,
  blockquote: true,
  alignLeft: false, // Disabled by default (opt-in)
  alignCenter: false, // Disabled by default (opt-in)
  alignRight: false, // Disabled by default (opt-in)
  alignJustify: false, // Disabled by default (opt-in)
  link: true,
  image: true,
  horizontalRule: false, // Disabled by default (opt-in)
  table: true,
  undo: true,
  redo: true,
  clear: false, // Disabled by default (opt-in)
  textColor: true,
  separator: true,
};

// Default bubble menu configuration
export const ATE_DEFAULT_BUBBLE_MENU_CONFIG: AteBubbleMenuConfig = {
  bold: true,
  italic: true,
  underline: true,
  strike: true,
  code: true,
  superscript: false,
  subscript: false,
  highlight: false,
  highlightPicker: true,
  textColor: true,
  link: true,
  separator: true,
};

// Default image bubble menu configuration
export const ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG: AteImageBubbleMenuConfig = {
  changeImage: true,
  downloadImage: true,
  resizeSmall: true,
  resizeMedium: true,
  resizeLarge: true,
  resizeOriginal: true,
  alignLeft: true,
  alignCenter: true,
  alignRight: true,
  deleteImage: true,
  separator: true,
};

// Default table bubble menu configuration
export const ATE_DEFAULT_TABLE_MENU_CONFIG: AteTableBubbleMenuConfig = {
  addRowBefore: true,
  addRowAfter: true,
  deleteRow: true,
  addColumnBefore: true,
  addColumnAfter: true,
  deleteColumn: true,
  toggleHeaderRow: true,
  toggleHeaderColumn: true,
  deleteTable: true,
  separator: true,
};

// Default cell bubble menu configuration
export const ATE_DEFAULT_CELL_MENU_CONFIG: AteCellBubbleMenuConfig = {
  mergeCells: true,
  splitCell: true,
};

// Default image upload configuration
export const ATE_DEFAULT_IMAGE_UPLOAD_CONFIG: AteImageUploadConfig = {
  maxSize: 5, // 5MB
  maxWidth: 1920,
  maxHeight: 1080,
  allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  quality: 0.8,
};

import { AteEditorConfig } from "../models/ate-editor-config.model";

/**
 * Ultimate default configuration for the Angular Tiptap Editor.
 * This serves as the 'Level 4' fallback in the configuration hierarchy:
 * 1. Component Inputs (Le Roi)
 * 2. Component [config] (Le Prince)
 * 3. Global provideAteEditor() (Le Duc)
 * 4. ATE_DEFAULT_CONFIG (Le Peuple)
 */
export const ATE_DEFAULT_CONFIG: AteEditorConfig = {
  theme: "auto",
  mode: "classic",
  height: "auto",
  minHeight: "200px",
  maxHeight: "none",
  fillContainer: false,
  autofocus: false,
  editable: true,
  disabled: false,
  spellcheck: true,
  enableOfficePaste: true,
  showToolbar: true,
  showFooter: true,
  showCharacterCount: true,
  showWordCount: true,
  showEditToggle: false,
  showBubbleMenu: true,
  showImageBubbleMenu: true,
  downloadImage: true,
  showTableMenu: true,
  showCellMenu: true,
  enableSlashCommands: true,
  floatingToolbar: false,
  toolbar: ATE_DEFAULT_TOOLBAR_CONFIG,
  bubbleMenu: ATE_DEFAULT_BUBBLE_MENU_CONFIG,
  imageBubbleMenu: ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG,
  imageUpload: ATE_DEFAULT_IMAGE_UPLOAD_CONFIG,
  tableBubbleMenu: ATE_DEFAULT_TABLE_MENU_CONFIG,
  cellBubbleMenu: ATE_DEFAULT_CELL_MENU_CONFIG,
  slashCommands: {},
  tiptapExtensions: [],
  tiptapOptions: {},
  stateCalculators: [],
  angularNodes: [],
};
