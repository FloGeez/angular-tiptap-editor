import { StateCalculator } from "../../models/editor-state.model";

export const ImageCalculator: StateCalculator = (editor) => {
    return {
        nodes: {
            isImage: editor.isActive('image') || editor.isActive('resizableImage'),
        } as any
    };
};
