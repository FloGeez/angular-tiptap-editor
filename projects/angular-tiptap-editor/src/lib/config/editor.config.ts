import { ToolbarConfig } from "../models/toolbar.model";
import {
    BubbleMenuConfig,
    ImageBubbleMenuConfig,
    TableBubbleMenuConfig,
    CellBubbleMenuConfig,
} from "../models/bubble-menu.model";

// Default toolbar configuration
export const DEFAULT_TOOLBAR_CONFIG: ToolbarConfig = {
    bold: true,
    italic: true,
    underline: true,
    strike: true,
    code: true,
    codeBlock: true,
    superscript: false,
    subscript: false,
    highlight: false,
    highlightPicker: true,
    heading1: true,
    heading2: true,
    heading3: true,
    bulletList: true,
    orderedList: true,
    blockquote: true,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    link: true,
    image: true,
    horizontalRule: true,
    table: true,
    undo: true,
    redo: true,
    clear: false, // Disabled by default (opt-in)
    textColor: true,
    separator: true,
};

// Default bubble menu configuration
export const DEFAULT_BUBBLE_MENU_CONFIG: BubbleMenuConfig = {
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
export const DEFAULT_IMAGE_BUBBLE_MENU_CONFIG: ImageBubbleMenuConfig = {
    changeImage: true,
    resizeSmall: true,
    resizeMedium: true,
    resizeLarge: true,
    resizeOriginal: true,
    deleteImage: true,
    separator: true,
};

// Default table bubble menu configuration
export const DEFAULT_TABLE_MENU_CONFIG: TableBubbleMenuConfig = {
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
export const DEFAULT_CELL_MENU_CONFIG: CellBubbleMenuConfig = {
    mergeCells: true,
    splitCell: true,
};
