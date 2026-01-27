import { Extension, getAttributes } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const AteLinkClickBehavior = Extension.create({
  name: "linkClickBehavior",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("linkClickBehavior"),
        props: {
          handleClick(view, _pos, event) {
            // handleClick only runs in the browser, but we guard it for absolute SSR safety
            if (typeof window === "undefined") {
              return false;
            }

            const isModKey = event.ctrlKey || event.metaKey;

            // If editor is editable, only proceed if Ctrl/Cmd is pressed
            if (view.editable && !isModKey) {
              return false;
            }

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
