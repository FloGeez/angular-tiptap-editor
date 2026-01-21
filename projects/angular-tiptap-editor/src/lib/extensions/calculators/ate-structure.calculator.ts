import { AteStateCalculator } from "../../models/ate-editor-state.model";

export const AteStructureCalculator: AteStateCalculator = editor => {
  return {
    nodes: {
      isBlockquote: editor.isActive("blockquote"),
      isCodeBlock: editor.isActive("codeBlock"),
      isBulletList: editor.isActive("bulletList"),
      isOrderedList: editor.isActive("orderedList"),
      h1: editor.isActive("heading", { level: 1 }),
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      alignLeft: editor.isActive({ textAlign: "left" }),
      alignCenter: editor.isActive({ textAlign: "center" }),
      alignRight: editor.isActive({ textAlign: "right" }),
      alignJustify: editor.isActive({ textAlign: "justify" }),
    },
    can: {
      toggleHeading1: editor.can().toggleHeading({ level: 1 }),
      toggleHeading2: editor.can().toggleHeading({ level: 2 }),
      toggleHeading3: editor.can().toggleHeading({ level: 3 }),
      toggleBulletList: editor.can().toggleBulletList(),
      toggleOrderedList: editor.can().toggleOrderedList(),
      toggleBlockquote: editor.can().toggleBlockquote(),
      toggleCodeBlock: editor.can().toggleCodeBlock(),
      setTextAlignLeft: editor.can().setTextAlign("left"),
      setTextAlignCenter: editor.can().setTextAlign("center"),
      setTextAlignRight: editor.can().setTextAlign("right"),
      setTextAlignJustify: editor.can().setTextAlign("justify"),
      insertHorizontalRule: editor.can().setHorizontalRule(),
      insertTable: editor.can().insertTable(),
      insertImage: editor.can().setResizableImage({ src: "" }),
    },
  };
};
