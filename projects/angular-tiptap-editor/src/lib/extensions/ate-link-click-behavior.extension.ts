import { Extension, getAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const AteLinkClickBehavior = Extension.create({
  name: "linkClickBehavior",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("linkClickBehavior"),
        props: {
          handleClick(view, _pos, _event) {
            // handleClick only runs in the browser, but we guard it for absolute SSR safety
            if (typeof window === "undefined") return false;

            // If editor is editable, let TipTap/BubbleMenu handle it
            if (view.editable) return false;

            const attrs = getAttributes(view.state, "link");
            if (attrs["href"]) {
              window.open(attrs["href"], "_blank", "noopener,noreferrer");
              return true;
            }
            return false;
          },
        },
      }),
    ];
  },
});
