import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core";

export interface AteResizableImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    resizableImage: {
      setResizableImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: number;
        height?: number;
      }) => ReturnType;
      updateResizableImage: (options: {
        src?: string;
        alt?: string;
        title?: string;
        width?: number;
        height?: number;
      }) => ReturnType;
    };
  }
}

export const AteResizableImage = Node.create<AteResizableImageOptions>({
  name: "resizableImage",

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? "inline" : "block";
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: element => {
          const width = element.getAttribute("width");
          return width ? parseInt(width, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes["width"]) {
            return {};
          }
          return {
            width: attributes["width"],
          };
        },
      },
      height: {
        default: null,
        parseHTML: element => {
          const height = element.getAttribute("height");
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: attributes => {
          if (!attributes["height"]) {
            return {};
          }
          return {
            height: attributes["height"],
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addCommands() {
    return {
      setResizableImage:
        options =>
        ({ commands }) => {
          return commands.insertContent(
            {
              type: this.name,
              attrs: options,
            },
            {
              updateSelection: true,
            }
          );
        },
      updateResizableImage:
        options =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, options);
        },
    };
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/,
        type: this.type,
        getAttributes: match => {
          const [, alt, src, title] = match;
          return { src, alt, title };
        },
      }),
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const wrapper = document.createElement("div");
      wrapper.className = "resizable-image-wrapper";
      wrapper.style.display = "block";
      if (node.attrs["textAlign"]) {
        wrapper.style.textAlign = node.attrs["textAlign"];
        wrapper.setAttribute("data-align", node.attrs["textAlign"]);
      }

      const container = document.createElement("div");
      container.className = "resizable-image-container";
      container.style.position = "relative";
      container.style.display = "inline-block";

      const img = document.createElement("img");
      img.src = node.attrs["src"];
      img.alt = node.attrs["alt"] || "";
      img.title = node.attrs["title"] || "";
      img.className = "ate-image";
      img.style.display = "inline-block"; // Ensure it respects container text-align

      if (node.attrs["width"]) {
        img.width = node.attrs["width"];
      }
      if (node.attrs["height"]) {
        img.height = node.attrs["height"];
      }

      wrapper.appendChild(container);
      container.appendChild(img);

      // Allow selection in read-only mode to show bubble menu/download
      img.addEventListener("click", e => {
        if (!editor.isEditable) {
          e.preventDefault();
          e.stopPropagation();
          const pos = getPos();
          if (typeof pos === "number") {
            editor.commands.setNodeSelection(pos);
            editor.view.focus();
          }
        }
      });

      // Add modern resize controls
      const resizeControls = document.createElement("div");
      resizeControls.className = "resize-controls";

      // Create 2 handles (sides only) for a minimalist UI
      const handles = ["w", "e"];
      handles.forEach(direction => {
        const handle = document.createElement("div");
        handle.className = `resize-handle resize-handle-${direction}`;
        handle.setAttribute("data-direction", direction);
        resizeControls.appendChild(handle);
      });

      // Attach controls to container
      container.appendChild(resizeControls);

      // Variables for resizing
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;
      let startHeight = 0;
      let aspectRatio = 1;

      // Calculate aspect ratio
      img.onload = () => {
        aspectRatio = img.naturalWidth / img.naturalHeight;
      };

      // Resizing logic
      const handleMouseDown = (e: MouseEvent, direction: string) => {
        e.preventDefault();
        e.stopPropagation();

        isResizing = true;
        startX = e.clientX;

        // Use current image dimensions instead of initial ones
        startWidth =
          parseInt(img.getAttribute("width") || "0") || node.attrs["width"] || img.naturalWidth;
        startHeight =
          parseInt(img.getAttribute("height") || "0") || node.attrs["height"] || img.naturalHeight;

        // Add resizing class to body
        document.body.classList.add("resizing");

        const handleMouseMove = (e: MouseEvent) => {
          if (!isResizing) {
            return;
          }

          const deltaX = e.clientX - startX;

          let newWidth = startWidth;
          let newHeight = startHeight;

          // Resize according to direction
          switch (direction) {
            case "e":
              newWidth = startWidth + deltaX;
              newHeight = newWidth / aspectRatio;
              break;
            case "w":
              newWidth = startWidth - deltaX;
              newHeight = newWidth / aspectRatio;
              break;
          }

          // Limits
          newWidth = Math.max(50, Math.min(2000, newWidth));
          newHeight = Math.max(50, Math.min(2000, newHeight));

          // Update image attributes directly
          img.setAttribute("width", Math.round(newWidth).toString());
          img.setAttribute("height", Math.round(newHeight).toString());
        };

        const handleMouseUp = () => {
          isResizing = false;
          document.body.classList.remove("resizing");

          // Update Tiptap node with new dimensions at the specific position
          const pos = typeof getPos === "function" ? getPos() : undefined;
          if (typeof pos === "number") {
            const finalWidth = parseInt(img.getAttribute("width") || "0");
            const finalHeight = parseInt(img.getAttribute("height") || "0");

            if (finalWidth && finalHeight) {
              editor.view.dispatch(
                editor.view.state.tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  width: finalWidth,
                  height: finalHeight,
                })
              );
            }
          }

          document.removeEventListener("mousemove", handleMouseMove);
          document.removeEventListener("mouseup", handleMouseUp);
        };

        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
      };

      // Add events to handles
      resizeControls.addEventListener("mousedown", e => {
        const target = e.target as HTMLElement;
        if (target.classList.contains("resize-handle")) {
          const direction = target.getAttribute("data-direction");
          if (direction) {
            handleMouseDown(e, direction);
          }
        }
      });

      // Proper selection management via ProseMirror lifecycle
      const selectNode = () => {
        wrapper.classList.add("selected");
        container.classList.add("selected");
        img.classList.add("selected");
      };

      const deselectNode = () => {
        wrapper.classList.remove("selected");
        container.classList.remove("selected");
        img.classList.remove("selected");
      };

      return {
        dom: wrapper,
        selectNode,
        deselectNode,
        update: updatedNode => {
          if (updatedNode.type.name !== "resizableImage") {
            return false;
          }

          img.src = updatedNode.attrs["src"];
          img.alt = updatedNode.attrs["alt"] || "";
          img.title = updatedNode.attrs["title"] || "";

          if (updatedNode.attrs["width"]) {
            img.width = updatedNode.attrs["width"];
          }
          if (updatedNode.attrs["height"]) {
            img.height = updatedNode.attrs["height"];
          }

          if (updatedNode.attrs["textAlign"]) {
            wrapper.style.textAlign = updatedNode.attrs["textAlign"];
            wrapper.setAttribute("data-align", updatedNode.attrs["textAlign"]);
          } else {
            wrapper.style.textAlign = "";
            wrapper.removeAttribute("data-align");
          }

          return true;
        },
        stopEvent: (event: Event) => {
          const target = event.target as HTMLElement;
          return !!target.closest(".resize-controls");
        },
        ignoreMutation: () => true,
      };
    };
  },
});
