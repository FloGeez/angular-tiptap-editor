import { AteStateCalculator } from "../../models/ate-editor-state.model";

export const AteImageCalculator: AteStateCalculator = editor => {
  return {
    nodes: {
      isImage: editor.isActive("image") || editor.isActive("resizableImage"),
    },
  };
};
