import { StateCalculator } from "../../models/editor-state.model";

export const MarksCalculator: StateCalculator = (editor) => {
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
            color: editor.getAttributes('textStyle')['color'] || null,
            background: editor.getAttributes('highlight')['color'] || null,
        },
        can: {
            toggleBold: editor.can().toggleBold(),
            toggleItalic: editor.can().toggleItalic(),
            toggleUnderline: editor.can().toggleUnderline(),
            toggleStrike: editor.can().toggleStrike(),
            toggleCode: editor.can().toggleCode(),
            toggleHighlight: editor.can().toggleHighlight(),
            toggleLink: editor.can().toggleLink({ href: '' }),
            toggleSuperscript: editor.can().toggleSuperscript(),
            toggleSubscript: editor.can().toggleSubscript(),
            undo: editor.can().undo(),
            redo: editor.can().redo(),
        } as any
    };
};
