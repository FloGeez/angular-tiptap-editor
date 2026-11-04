import { AteStateCalculator } from "../../models/ate-editor-state.model";
import { normalizeColor } from "../../utils/ate-color.utils";

export const AteMarksCalculator: AteStateCalculator = editor => {
  const isCodeBlock = editor.isActive("codeBlock");
  const isCode = editor.isActive("code"); // Inline code mark
  const isImage = editor.isActive("image") || editor.isActive("resizableImage");

  // Check if marks are generally allowed based on context
  const marksAllowed = !isCodeBlock && !isImage;
  // For inline code specifically, we don't allow nesting OTHER marks inside it,
  // but the code mark ITSELF must be togglable to be removed.
  const isInsideInlineCode = isCode;

  // 1. Resolve target element once for this calculation
  const getTargetElement = (): Element | null => {
    if (typeof window === "undefined" || !editor.view?.dom) {
      return null;
    }
    try {
      const { from, empty } = editor.state.selection;
      const { node, offset } = editor.view.domAtPos(from);
      if (node.nodeType === Node.TEXT_NODE) {
        return node.parentElement;
      }
      // A selection starting at the edge of a styled span points at its parent (a heading with a
      // smaller span inside): use the element the selected text starts in
      const start = empty ? null : node.childNodes[offset];
      if (start?.nodeType === Node.ELEMENT_NODE) {
        let element = start as Element;
        while (element.firstElementChild && element.firstChild === element.firstElementChild) {
          element = element.firstElementChild;
        }
        return element;
      }
      return node as Element;
    } catch (_e) {
      return null;
    }
  };

  const targetEl = getTargetElement() || (typeof window !== "undefined" ? editor.view?.dom : null);
  const computedStyle =
    targetEl && typeof window !== "undefined" ? window.getComputedStyle(targetEl) : null;

  // 2. Lightweight helper to extract properties from the pre-calculated style object
  const getStyle = (prop: string): string | null => {
    if (!computedStyle) {
      return null;
    }
    const val = computedStyle.getPropertyValue(prop);
    return normalizeColor(val);
  };

  const colorMark = editor.getAttributes("textStyle")["color"] || null;
  const backgroundMark = editor.getAttributes("highlight")["color"] || null;
  const textStyle = editor.getAttributes("textStyle");
  const computedFontSize = parseFloat(computedStyle?.getPropertyValue("font-size") ?? "");

  return {
    marks: {
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      code: isCode,
      superscript: editor.isActive("superscript"),
      subscript: editor.isActive("subscript"),
      highlight: editor.isActive("highlight"),
      link: editor.isActive("link"),
      linkHref: editor.getAttributes("link")["href"] || null,
      color: colorMark,
      computedColor: colorMark || getStyle("color"),
      background: backgroundMark,
      computedBackground: backgroundMark || getStyle("background-color"),
      fontFamily: textStyle["fontFamily"] || null,
      fontSize: textStyle["fontSize"] || null,
      computedFontSize: Number.isFinite(computedFontSize) ? computedFontSize : null,
      linkOpenOnClick:
        editor.extensionManager.extensions.find(ext => ext.name === "link")?.options?.openOnClick ??
        false,
    },
    can: {
      toggleBold: marksAllowed && !isInsideInlineCode && editor.can().toggleBold(),
      toggleItalic: marksAllowed && !isInsideInlineCode && editor.can().toggleItalic(),
      toggleUnderline: marksAllowed && !isInsideInlineCode && editor.can().toggleUnderline(),
      toggleStrike: marksAllowed && !isInsideInlineCode && editor.can().toggleStrike(),
      toggleCode: marksAllowed && editor.can().toggleCode(),
      toggleHighlight: marksAllowed && !isInsideInlineCode && editor.can().toggleHighlight(),
      toggleLink:
        marksAllowed &&
        !isInsideInlineCode &&
        (editor.can().setLink({ href: "" }) || editor.can().unsetLink()),
      toggleSuperscript: marksAllowed && !isInsideInlineCode && editor.can().toggleSuperscript(),
      toggleSubscript: marksAllowed && !isInsideInlineCode && editor.can().toggleSubscript(),
      setColor: marksAllowed && !isInsideInlineCode && editor.can().setColor(""),
      setHighlight: marksAllowed && !isInsideInlineCode && editor.can().setHighlight(),
      setFontFamily: marksAllowed && !isInsideInlineCode && editor.can().setFontFamily(""),
      setFontSize: marksAllowed && !isInsideInlineCode && editor.can().setFontSize(""),
      undo: editor.can().undo(),
      redo: editor.can().redo(),
    },
  };
};
