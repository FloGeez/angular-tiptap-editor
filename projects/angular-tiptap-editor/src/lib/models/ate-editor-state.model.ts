import { Editor } from "@tiptap/core";

export type StateCalculator = (editor: Editor) => Partial<{
  [K in keyof EditorStateSnapshot]: EditorStateSnapshot[K] extends object
    ? Partial<EditorStateSnapshot[K]>
    : EditorStateSnapshot[K];
}>;

export interface EditorStateSnapshot {
  /** Global editor states */
  isFocused: boolean;
  isEditable: boolean;

  /**
   * Detailed selection information to avoid overlap between menus
   */
  selection: {
    type: "text" | "node" | "cell" | "none";
    from: number;
    to: number;
    empty: boolean;
    /** Specific for CellSelection */
    isSingleCell: boolean;
  };

  /** Text formatting states (Marks) */
  marks: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    strike: boolean;
    code: boolean;
    superscript: boolean;
    subscript: boolean;
    highlight: boolean;
    link: boolean;
    linkHref: string | null;
    color: string | null;
    computedColor: string | null;
    background: string | null;
    computedBackground: string | null;
    linkOpenOnClick: boolean;
  };

  /** Capability states (canExecute) */
  can: {
    toggleBold: boolean;
    toggleItalic: boolean;
    toggleUnderline: boolean;
    toggleStrike: boolean;
    toggleCode: boolean;
    toggleHighlight: boolean;
    toggleLink: boolean;
    toggleSuperscript: boolean;
    toggleSubscript: boolean;
    setColor: boolean;
    setHighlight: boolean;
    undo: boolean;
    redo: boolean;

    /** Table specific capabilities */
    addRowBefore: boolean;
    addRowAfter: boolean;
    deleteRow: boolean;
    addColumnBefore: boolean;
    addColumnAfter: boolean;
    deleteColumn: boolean;
    deleteTable: boolean;
    mergeCells: boolean;
    splitCell: boolean;
    toggleHeaderRow: boolean;
    toggleHeaderColumn: boolean;

    /** Structure/Node capabilities */
    toggleHeading1: boolean;
    toggleHeading2: boolean;
    toggleHeading3: boolean;
    toggleBulletList: boolean;
    toggleOrderedList: boolean;
    toggleBlockquote: boolean;
    toggleCodeBlock: boolean;
    setTextAlignLeft: boolean;
    setTextAlignCenter: boolean;
    setTextAlignRight: boolean;
    setTextAlignJustify: boolean;
    insertHorizontalRule: boolean;
    insertTable: boolean;
    insertImage: boolean;
  };

  /** Current node context */
  nodes: {
    isTable: boolean;
    isTableNodeSelected: boolean;
    isTableCell: boolean;
    isImage: boolean;
    isBlockquote: boolean;
    isCodeBlock: boolean;
    isBulletList: boolean;
    isOrderedList: boolean;

    /** Headings */
    h1: boolean;
    h2: boolean;
    h3: boolean;

    /** Alignment */
    alignLeft: boolean;
    alignCenter: boolean;
    alignRight: boolean;
    alignJustify: boolean;

    /** Table specific */
    isTableHeaderRow: boolean;
    isTableHeaderColumn: boolean;

    /** Name of the active node at selection head */
    activeNodeName: string | null;
  };

  /** Placeholder for custom extension states */
  custom: Record<string, unknown>;
}

export const INITIAL_EDITOR_STATE: EditorStateSnapshot = {
  isFocused: false,
  isEditable: true,
  selection: {
    type: "none",
    from: 0,
    to: 0,
    empty: true,
    isSingleCell: false,
  },
  marks: {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    code: false,
    superscript: false,
    subscript: false,
    highlight: false,
    link: false,
    linkHref: null,
    color: null,
    computedColor: null,
    background: null,
    computedBackground: null,
    linkOpenOnClick: false,
  },
  can: {
    toggleBold: false,
    toggleItalic: false,
    toggleUnderline: false,
    toggleStrike: false,
    toggleCode: false,
    toggleHighlight: false,
    toggleLink: false,
    toggleSuperscript: false,
    toggleSubscript: false,
    setColor: false,
    setHighlight: false,
    undo: false,
    redo: false,
    addRowBefore: false,
    addRowAfter: false,
    deleteRow: false,
    addColumnBefore: false,
    addColumnAfter: false,
    deleteColumn: false,
    deleteTable: false,
    mergeCells: false,
    splitCell: false,
    toggleHeaderRow: false,
    toggleHeaderColumn: false,
    toggleHeading1: false,
    toggleHeading2: false,
    toggleHeading3: false,
    toggleBulletList: false,
    toggleOrderedList: false,
    toggleBlockquote: false,
    toggleCodeBlock: false,
    setTextAlignLeft: false,
    setTextAlignCenter: false,
    setTextAlignRight: false,
    setTextAlignJustify: false,
    insertHorizontalRule: false,
    insertTable: false,
    insertImage: false,
  },
  nodes: {
    isTable: false,
    isTableNodeSelected: false,
    isTableCell: false,
    isImage: false,
    isBlockquote: false,
    isCodeBlock: false,
    isBulletList: false,
    isOrderedList: false,
    h1: false,
    h2: false,
    h3: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    isTableHeaderRow: false,
    isTableHeaderColumn: false,
    activeNodeName: null,
  },
  custom: {},
};
