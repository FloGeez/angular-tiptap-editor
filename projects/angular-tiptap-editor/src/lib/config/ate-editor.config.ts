import { AteToolbarConfig } from "../models/ate-toolbar.model";
import {
  AteBubbleMenuConfig,
  AteImageBubbleMenuConfig,
  AteTableBubbleMenuConfig,
  AteCellBubbleMenuConfig,
} from "../models/ate-bubble-menu.model";
import { AteImageUploadConfig } from "../models/ate-image.model";
import { AteFontFamily } from "../models/ate-font.model";

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
  taskList: false, // Disabled by default (opt-in)
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
  fontFamily: false, // Disabled by default (opt-in)
  fontSize: false, // Disabled by default (opt-in)
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
  fontFamily: false,
  fontSize: false,
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
import { AtePasteConfig } from "../models/ate-paste.model";

/** Default paste settings: everything pasted from other apps is kept */
export const ATE_DEFAULT_PASTE_CONFIG: AtePasteConfig = {
  colors: true,
  highlights: true,
  fontFamilies: true,
  fontSizes: true,
};

/** Fonts of the font family menu: web-safe fonts, available on every system */
export const ATE_DEFAULT_FONT_FAMILIES: AteFontFamily[] = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Tahoma", value: "Tahoma, Verdana, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Garamond", value: "Garamond, Georgia, serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
];

/** Sizes of the font size menu */
export const ATE_DEFAULT_FONT_SIZES: string[] = [
  "12px",
  "14px",
  "16px",
  "18px",
  "20px",
  "24px",
  "30px",
  "36px",
  "48px",
  "64px",
];

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
  showFooter: false,
  showCharacterCount: true,
  showWordCount: true,
  showEditToggle: false,
  showBubbleMenu: true,
  showImageBubbleMenu: true,
  downloadImage: true,
  showTableMenu: true,
  showCellMenu: true,
  enableSlashCommands: true,
  enableBlockShortcuts: true,
  enableTextAlign: true,
  blockControls: "none",
  floatingToolbar: false,
  toolbar: ATE_DEFAULT_TOOLBAR_CONFIG,
  bubbleMenu: ATE_DEFAULT_BUBBLE_MENU_CONFIG,
  imageBubbleMenu: ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG,
  imageUpload: ATE_DEFAULT_IMAGE_UPLOAD_CONFIG,
  paste: ATE_DEFAULT_PASTE_CONFIG,
  fonts: { families: ATE_DEFAULT_FONT_FAMILIES, sizes: ATE_DEFAULT_FONT_SIZES },
  tableBubbleMenu: ATE_DEFAULT_TABLE_MENU_CONFIG,
  cellBubbleMenu: ATE_DEFAULT_CELL_MENU_CONFIG,
  slashCommands: {},
  tiptapExtensions: [],
  tiptapOptions: {},
  starterKitOptions: {},
  stateCalculators: [],
  angularNodes: [],
};
