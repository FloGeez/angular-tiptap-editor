import { StateCalculator } from "../../models/editor-state.model";

export const MarksCalculator: StateCalculator = (editor) => {
    const isCodeBlock = editor.isActive('codeBlock');
    const isImage = editor.isActive('image') || editor.isActive('resizableImage');

    // Desactiver les marks si on est dans du code ou sur une image
    const canDoMarks = !isCodeBlock && !isImage;

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
            toggleBold: canDoMarks && editor.can().toggleBold(),
            toggleItalic: canDoMarks && editor.can().toggleItalic(),
            toggleUnderline: canDoMarks && editor.can().toggleUnderline(),
            toggleStrike: canDoMarks && editor.can().toggleStrike(),
            toggleCode: canDoMarks && editor.can().toggleCode(),
            toggleHighlight: canDoMarks && editor.can().toggleHighlight(),
            toggleLink: canDoMarks && editor.can().toggleLink({ href: '' }),
            toggleSuperscript: canDoMarks && editor.can().toggleSuperscript(),
            toggleSubscript: canDoMarks && editor.can().toggleSubscript(),
            setColor: canDoMarks && (editor.can() as any).setColor?.('#000000'),
            setHighlight: canDoMarks && (editor.can() as any).setHighlight?.('#000000'),
            undo: editor.can().undo(),
            redo: editor.can().redo(),
        } as any
    };
};
