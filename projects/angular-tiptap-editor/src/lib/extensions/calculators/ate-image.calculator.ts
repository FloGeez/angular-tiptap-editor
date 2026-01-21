import { StateCalculator } from "../../models/ate-editor-state.model";

export const ImageCalculator: StateCalculator = editor => {
  return {
    nodes: {
      isImage: editor.isActive("image") || editor.isActive("resizableImage"),
    },
  };
};
