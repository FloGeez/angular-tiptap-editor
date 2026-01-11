import { StateCalculator } from "../../models/editor-state.model";

export const StructureCalculator: StateCalculator = (editor) => {
    return {
        nodes: {
            isHeader: editor.isActive('heading'),
            h1: editor.isActive('heading', { level: 1 }),
            h2: editor.isActive('heading', { level: 2 }),
            h3: editor.isActive('heading', { level: 3 }),
            isBulletList: editor.isActive('bulletList'),
            isOrderedList: editor.isActive('orderedList'),
            isBlockquote: editor.isActive('blockquote'),
            isCodeBlock: editor.isActive('codeBlock'),
            alignLeft: editor.isActive({ textAlign: 'left' }),
            alignCenter: editor.isActive({ textAlign: 'center' }),
            alignRight: editor.isActive({ textAlign: 'right' }),
            alignJustify: editor.isActive({ textAlign: 'justify' }),
        } as any,
        can: {
            toggleHeading1: editor.can().toggleHeading({ level: 1 }),
            toggleHeading2: editor.can().toggleHeading({ level: 2 }),
            toggleHeading3: editor.can().toggleHeading({ level: 3 }),
            toggleBulletList: editor.can().toggleBulletList(),
            toggleOrderedList: editor.can().toggleOrderedList(),
            toggleBlockquote: editor.can().toggleBlockquote(),
            setTextAlignLeft: editor.can().setTextAlign('left'),
            setTextAlignCenter: editor.can().setTextAlign('center'),
            setTextAlignRight: editor.can().setTextAlign('right'),
            setTextAlignJustify: editor.can().setTextAlign('justify'),
            insertHorizontalRule: editor.can().setHorizontalRule(),
            insertTable: (editor.can() as any).insertTable?.(),
            insertImage: (editor.can() as any).setImage?.({ src: '' }) || (editor.can() as any).insertImage?.(),
        } as any
    };
};
