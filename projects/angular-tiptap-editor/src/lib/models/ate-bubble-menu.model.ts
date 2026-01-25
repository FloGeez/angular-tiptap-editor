import { Editor } from "@tiptap/core";

/**
 * Clés des options du menu bulle de texte
 */
export const ATE_BUBBLE_MENU_KEYS = [
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "superscript",
  "subscript",
  "highlight",
  "highlightPicker",
  "textColor",
  "link",
  "separator",
] as const;

export type AteBubbleMenuKey = (typeof ATE_BUBBLE_MENU_KEYS)[number];

export interface AteBubbleMenuConfig extends Partial<Record<AteBubbleMenuKey, boolean>> {
  custom?: AteCustomBubbleMenuItem[];
}

export interface AteCustomBubbleMenuItem {
  key: string;
  label: string;
  icon: string;
  command: (editor: Editor) => void | Promise<void>;
}

/**
 * Clés des options du menu bulle d'image
 */
export const ATE_IMAGE_BUBBLE_MENU_KEYS = [
  "changeImage",
  "resizeSmall",
  "resizeMedium",
  "resizeLarge",
  "resizeOriginal",
  "deleteImage",
  "separator",
] as const;

export type AteImageBubbleMenuKey = (typeof ATE_IMAGE_BUBBLE_MENU_KEYS)[number];

export type AteImageBubbleMenuConfig = Partial<Record<AteImageBubbleMenuKey, boolean>>;

/**
 * Clés des options du menu de table
 */
export const ATE_TABLE_BUBBLE_MENU_KEYS = [
  "addRowBefore",
  "addRowAfter",
  "deleteRow",
  "addColumnBefore",
  "addColumnAfter",
  "deleteColumn",
  "deleteTable",
  "toggleHeaderRow",
  "toggleHeaderColumn",
  "separator",
] as const;

export type AteTableBubbleMenuKey = (typeof ATE_TABLE_BUBBLE_MENU_KEYS)[number];

export type AteTableBubbleMenuConfig = Partial<Record<AteTableBubbleMenuKey, boolean>>;

/**
 * Clés des options du menu de cellule
 */
export const ATE_CELL_BUBBLE_MENU_KEYS = ["mergeCells", "splitCell"] as const;

export type AteCellBubbleMenuKey = (typeof ATE_CELL_BUBBLE_MENU_KEYS)[number];

export type AteCellBubbleMenuConfig = Partial<Record<AteCellBubbleMenuKey, boolean>>;
