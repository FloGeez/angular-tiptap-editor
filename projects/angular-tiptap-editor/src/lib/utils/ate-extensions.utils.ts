import type { Extension, Mark, Node } from "@tiptap/core";
import type { StarterKitOptions } from "@tiptap/starter-kit";

/**
 * Maps the runtime `.name` of each extension bundled in `@tiptap/starter-kit`
 * to its corresponding option key in `StarterKitOptions`.
 */
export const STARTER_KIT_NAME_TO_OPTION: Readonly<Record<string, keyof StarterKitOptions>> = {
  blockquote: "blockquote",
  bold: "bold",
  bulletList: "bulletList",
  code: "code",
  codeBlock: "codeBlock",
  doc: "document",
  dropCursor: "dropcursor",
  gapCursor: "gapcursor",
  hardBreak: "hardBreak",
  heading: "heading",
  undoRedo: "undoRedo",
  horizontalRule: "horizontalRule",
  italic: "italic",
  listItem: "listItem",
  listKeymap: "listKeymap",
  link: "link",
  orderedList: "orderedList",
  paragraph: "paragraph",
  strike: "strike",
  text: "text",
  underline: "underline",
  trailingNode: "trailingNode",
};

/**
 * Describes which parts of Angular Tiptap Editor's UI or state calculators
 * depend on a given built-in or StarterKit extension name.
 */
export const ATE_BUILTIN_UI_DEPENDENCIES: Readonly<Record<string, string>> = {
  blockquote: "toolbar/slash menu blockquote buttons, AteStructureCalculator",
  bold: "toolbar/bubble menu bold buttons, AteMarksCalculator",
  bulletList: "toolbar/slash menu bullet list buttons, AteStructureCalculator",
  code: "toolbar/bubble menu inline code buttons, AteMarksCalculator",
  codeBlock: "toolbar/slash menu code block buttons, AteStructureCalculator",
  doc: "top-level ProseMirror document schema",
  dropCursor: "drag-and-drop cursor indicator",
  gapCursor: "gap cursor navigation around leaf block nodes",
  hardBreak: "Shift+Enter line break shortcut",
  heading:
    "toolbar/bubble menu/slash menu heading controls, table of contents, AteStructureCalculator",
  undoRedo: "toolbar undo/redo buttons, AteStructureCalculator",
  horizontalRule: "toolbar/slash menu horizontal rule buttons",
  italic: "toolbar/bubble menu italic buttons, AteMarksCalculator",
  listItem: "bullet/ordered list items, block shortcuts",
  listKeymap: "list backspace/delete keyboard navigation",
  link: "toolbar/bubble menu link editor, Mod+K shortcut, AteMarksCalculator",
  orderedList: "toolbar/slash menu ordered list buttons, AteStructureCalculator",
  paragraph: "default text block node, AteStructureCalculator",
  strike: "toolbar/bubble menu strikethrough buttons, AteMarksCalculator",
  text: "core inline text node",
  underline: "toolbar/bubble menu underline buttons, AteMarksCalculator",
  trailingNode: "automatic trailing paragraph after block nodes",
  textStyle: "color picker, AteMarksCalculator",
  color: "toolbar/bubble menu text color picker, AteMarksCalculator",
  placeholder: "empty editor placeholder decoration",
  superscript: "toolbar/bubble menu superscript buttons, AteMarksCalculator",
  subscript: "toolbar/bubble menu subscript buttons, AteMarksCalculator",
  textAlign: "toolbar/image bubble menu alignment buttons, AteStructureCalculator",
  ateLinkClickBehavior: "read-only and Ctrl+click link navigation",
  ateBlockShortcuts: "Mod+D and Mod+Shift+ArrowUp/Down block shortcuts",
  ateLinkShortcut: "Mod+K link editor shortcut",
  highlight: "toolbar/bubble menu highlight picker, AteMarksCalculator",
  resizableImage:
    "image node view, image bubble menu, image upload/resize service, AteImageCalculator",
  atePasteColors: "optional stripping of colors and highlights pasted from other apps",
  atePastedImage: "pasted HTML image sanitization and base64 re-hosting",
  ateUploadProgress: "image upload progress overlay",
  tableExtension: "toolbar/slash menu table insertion, table/cell bubble menus, AteTableCalculator",
  tableOfContents: "slash menu table of contents node, AteTableOfContentsComponent",
  tiptapState: "reactive editor state engine (toolbar, bubble menus, footer)",
  blockControls: "block plus button and drag handle",
  officePaste: "Word/Excel paste normalization",
  characterCount: "footer character/word counters and maxCharacters limit",
};

export function getExtensionName(ext: Extension | Node | Mark): string | undefined {
  return (ext as { name?: string })?.name;
}
