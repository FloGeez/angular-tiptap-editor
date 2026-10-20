import {
  ATE_DEFAULT_ICONS,
  ATE_MATERIAL_SYMBOLS_VIEWBOX,
  ATE_STROKE_ICONS,
  AteIconName,
  AteIcons,
} from "angular-tiptap-editor";
import {
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Baseline,
  Bold,
  Check,
  Code,
  Download,
  ExternalLink,
  Eye,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image,
  ImagePlus,
  ImageUp,
  Italic,
  Link,
  List,
  ListOrdered,
  Maximize,
  Minus,
  PaintBucket,
  PanelLeft,
  PanelTop,
  Pencil,
  Pipette,
  Plus,
  Redo2,
  RemoveFormatting,
  Square,
  SquareTerminal,
  Strikethrough,
  Subscript,
  Superscript,
  Table,
  TableCellsMerge,
  TableCellsSplit,
  TableOfContents,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
  TextQuote,
  Trash2,
  Underline,
  Undo2,
  Unlink,
  X,
} from "lucide-static";

export type IconSetKey = "material" | "ate" | "lucide";

export interface IconSet {
  key: IconSetKey;
  name: string;
  /** Icons registered on top of ATE_DEFAULT_ICONS */
  icons: AteIcons;
  /** Library icons shown in the selector card */
  preview: AteIconName[];
}

/**
 * Lucide (ISC): every library icon is mapped, so the whole editor switches
 * to a stroke style. `satisfies` breaks the build if the library adds an icon.
 */
const LUCIDE_ICONS = {
  bold: Bold,
  italic: Italic,
  underline: Underline,
  strike: Strikethrough,
  code: Code,
  superscript: Superscript,
  subscript: Subscript,
  highlight: Highlighter,
  link: Link,
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  bulletList: List,
  orderedList: ListOrdered,
  blockquote: TextQuote,
  codeBlock: SquareTerminal,
  horizontalRule: Minus,
  image: Image,
  table: Table,
  tableOfContents: TableOfContents,
  alignLeft: TextAlignStart,
  alignCenter: TextAlignCenter,
  alignRight: TextAlignEnd,
  alignJustify: TextAlignJustify,
  textColor: Baseline,
  highlightColor: PaintBucket,
  customColor: Pipette,
  unsetColor: RemoveFormatting,
  openLink: ExternalLink,
  unsetLink: Unlink,
  changeImage: ImageUp,
  downloadImage: Download,
  resizeSmall: Square,
  resizeMedium: Square,
  resizeLarge: Square,
  resizeOriginal: Maximize,
  deleteImage: Trash2,
  imageUpload: ImagePlus,
  addRowBefore: BetweenHorizontalStart,
  addRowAfter: BetweenHorizontalEnd,
  deleteRow: Trash2,
  addColumnBefore: BetweenVerticalStart,
  addColumnAfter: BetweenVerticalEnd,
  deleteColumn: Trash2,
  toggleHeaderRow: PanelTop,
  toggleHeaderColumn: PanelLeft,
  deleteTable: Trash2,
  mergeCells: TableCellsMerge,
  splitCell: TableCellsSplit,
  undo: Undo2,
  redo: Redo2,
  clearContent: Trash2,
  blockAdd: Plus,
  blockDrag: GripVertical,
  edit: Pencil,
  preview: Eye,
  apply: Check,
  clear: X,
} satisfies Record<AteIconName, string>;

const PREVIEW: AteIconName[] = ["bold", "italic", "heading1", "bulletList", "link", "undo"];

export const ICON_SETS: Record<IconSetKey, IconSet> = {
  material: { key: "material", name: "Material Symbols", icons: {}, preview: PREVIEW },
  ate: { key: "ate", name: "/ATE Stroke", icons: ATE_STROKE_ICONS, preview: PREVIEW },
  lucide: { key: "lucide", name: "Lucide", icons: LUCIDE_ICONS, preview: PREVIEW },
};

export const DEFAULT_ICON_SET: IconSetKey = "material";

/** Icons to register for a set: library defaults first, since register() merges */
export function resolveIconSet(key: IconSetKey): AteIcons {
  return { ...ATE_DEFAULT_ICONS, ...(ICON_SETS[key] ?? ICON_SETS[DEFAULT_ICON_SET]).icons };
}

/** Full <svg> markup of an icon of a set, as the AteIconRegistry would render it */
export function iconSetSvg(key: IconSetKey, name: AteIconName): string {
  const icon = resolveIconSet(key)[name] ?? "";
  return icon.trimStart().startsWith("<svg")
    ? icon
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ATE_MATERIAL_SYMBOLS_VIEWBOX}" fill="currentColor">${icon}</svg>`;
}
