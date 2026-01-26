import { Editor } from "@tiptap/core";
import { AteStateCalculator } from "../../models/ate-editor-state.model";

/**
 * DiscoveryCalculator automatically detects and tracks the state of any TipTap extension.
 * It provides a "fallback" reactive state for any mark or node not explicitly handled
 * by specialized calculators.
 */
export const AteDiscoveryCalculator: AteStateCalculator = (editor: Editor) => {
  const state: { marks: Record<string, boolean>; nodes: Record<string, boolean> } = {
    marks: {},
    nodes: {},
  };

  // We skip core extensions that are already handled by specialized calculators
  // to avoid redundant calculations and maintain precise attribute tracking.
  const handled = [
    "bold",
    "italic",
    "underline",
    "strike",
    "code",
    "link",
    "highlight",
    "superscript",
    "subscript",
    "table",
    "image",
    "resizableImage",
    "heading",
    "bulletList",
    "orderedList",
    "blockquote",
    "textAlign",
    "textStyle",
    "color",
  ];

  editor.extensionManager.extensions.forEach(extension => {
    const name = extension.name;
    const type = extension.type;

    // Skip internal/core extensions or already handled ones
    if (
      [
        "selection",
        "editable",
        "focus",
        "undo",
        "redo",
        "history",
        "placeholder",
        "characterCount",
      ].includes(name)
    ) {
      return;
    }

    if (handled.includes(name)) {
      return;
    }

    if (type === "mark") {
      state.marks[name] = editor.isActive(name);
    } else if (type === "node") {
      state.nodes[name] = editor.isActive(name);
    }
  });

  return state;
};
