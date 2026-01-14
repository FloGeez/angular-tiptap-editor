import { StateCalculator } from "../../models/editor-state.model";
import { normalizeColor } from "../../utils/color.utils";

export const MarksCalculator: StateCalculator = (editor) => {
    const isCodeBlock = editor.isActive('codeBlock');
    const isCode = editor.isActive('code'); // Inline code mark
    const isImage = editor.isActive('image') || editor.isActive('resizableImage');

    // Check if marks are generally allowed based on context
    // Marks are NOT allowed inside code blocks, inline code, or on images
    const marksAllowed = !isCodeBlock && !isCode && !isImage;

    // Helper for computed styles with fallback to editor root
    const getComputedStyleValue = (prop: string) => {
        if (typeof window === 'undefined' || !editor.view?.dom) return null;

        try {
            const { from } = editor.state.selection;
            const dom = editor.view.domAtPos(from);

            // Find the closest element containing the selection
            let el: HTMLElement | null = null;
            if (dom.node.nodeType === Node.TEXT_NODE) {
                el = dom.node.parentElement;
            } else if (dom.node instanceof HTMLElement) {
                el = dom.node;
            }

            // getComputedStyle is already inherited, so this captures 
            // the actual visible style at this position.
            const target = el || editor.view.dom;
            const val = window.getComputedStyle(target).getPropertyValue(prop);

            return normalizeColor(val);
        } catch (e) {
            return null;
        }
    };

    const colorMark = editor.getAttributes('textStyle')['color'] || null;
    const backgroundMark = editor.getAttributes('highlight')['color'] || null;

    return {
        marks: {
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            strike: editor.isActive('strike'),
            code: editor.isActive('code'),
            superscript: editor.isActive('superscript'),
            subscript: editor.isActive('subscript'),
            highlight: editor.isActive('highlight'),
            link: editor.isActive('link'),
            linkHref: editor.getAttributes('link')['href'] || null,
            color: colorMark,
            computedColor: colorMark || getComputedStyleValue('color'),
            background: backgroundMark,
            computedBackground: backgroundMark || getComputedStyleValue('background-color'),
        },
        can: {
            toggleBold: marksAllowed && editor.can().toggleBold(),
            toggleItalic: marksAllowed && editor.can().toggleItalic(),
            toggleUnderline: marksAllowed && editor.can().toggleUnderline(),
            toggleStrike: marksAllowed && editor.can().toggleStrike(),
            toggleCode: marksAllowed && editor.can().toggleCode(),
            toggleHighlight: marksAllowed && editor.can().toggleHighlight(),
            toggleLink: marksAllowed && (editor.can().setLink({ href: '' }) || editor.can().unsetLink()),
            toggleSuperscript: marksAllowed && editor.can().toggleSuperscript(),
            toggleSubscript: marksAllowed && editor.can().toggleSubscript(),
            setColor: marksAllowed && editor.can().setColor(''),
            setHighlight: marksAllowed && editor.can().setHighlight(),
            undo: editor.can().undo(),
            redo: editor.can().redo(),
        }
    };
};
