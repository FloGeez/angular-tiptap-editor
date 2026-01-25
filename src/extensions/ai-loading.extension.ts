import { Mark, mergeAttributes } from "@tiptap/core";

// Extension to display the spinning AI emoji
export const AiLoading = Mark.create({
  name: "aiLoading",
  parseHTML() {
    return [
      {
        tag: "span.spinning-ai",
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "spinning-ai material-symbols-outlined" }), 0];
  },
});
