import { Editor } from "@tiptap/core";

/**
 * Clés des boutons de la barre d'outils native
 */
export const ATE_TOOLBAR_KEYS = [
  "bold",
  "italic",
  "underline",
  "strike",
  "code",
  "codeBlock",
  "superscript",
  "subscript",
  "highlight",
  "highlightPicker",
  "heading1",
  "heading2",
  "heading3",
  "bulletList",
  "orderedList",
  "blockquote",
  "alignLeft",
  "alignCenter",
  "alignRight",
  "alignJustify",
  "link",
  "image",
  "horizontalRule",
  "table",
  "undo",
  "redo",
  "clear",
  "textColor",
  "separator",
] as const;

export type AteToolbarKey = (typeof ATE_TOOLBAR_KEYS)[number];

export interface AteToolbarConfig extends Partial<Record<AteToolbarKey, boolean>> {
  /**
   * Boutons personnalisés à ajouter
   */
  custom?: AteCustomToolbarItem[];
}

export interface AteCustomToolbarItem {
  key: string;
  label: string;
  icon: string;
  command: (editor: Editor) => void | Promise<void>;
}
