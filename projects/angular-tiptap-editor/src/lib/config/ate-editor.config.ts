import { AteToolbarConfig } from "../models/ate-toolbar.model";
import {
  AteBubbleMenuConfig,
  AteImageBubbleMenuConfig,
  AteTableBubbleMenuConfig,
  AteCellBubbleMenuConfig,
} from "../models/ate-bubble-menu.model";

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
  resizeSmall: true,
  resizeMedium: true,
  resizeLarge: true,
  resizeOriginal: true,
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
