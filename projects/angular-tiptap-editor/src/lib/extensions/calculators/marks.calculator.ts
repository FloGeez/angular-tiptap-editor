import { StateCalculator } from "../../models/editor-state.model";

export const MarksCalculator: StateCalculator = (editor) => {
    const isCodeBlock = editor.isActive('codeBlock');
    const isCode = editor.isActive('code'); // Inline code mark
    const isImage = editor.isActive('image') || editor.isActive('resizableImage');

    // Check if marks are generally allowed based on context
    // Marks are NOT allowed inside code blocks, inline code, or on images
    const marksAllowed = !isCodeBlock && !isCode && !isImage;

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
            color: editor.getAttributes('textStyle')['color'] || null,
            background: editor.getAttributes('highlight')['color'] || null,
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
