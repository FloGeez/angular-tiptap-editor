import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core";

export interface ResizableImageOptions {
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

export const ResizableImage = Node.create<ResizableImageOptions>({
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
      const container = document.createElement("div");
      container.className = "resizable-image-container";
      container.style.position = "relative";
      container.style.display = "inline-block";

      const img = document.createElement("img");
      img.src = node.attrs["src"];
      img.alt = node.attrs["alt"] || "";
      img.title = node.attrs["title"] || "";
      img.className = "ate-image";

      if (node.attrs["width"]) img.width = node.attrs["width"];
      if (node.attrs["height"]) img.height = node.attrs["height"];

      img.parentNode?.insertBefore(container, img);
      container.appendChild(img);

      // Add modern resize controls
      const resizeControls = document.createElement("div");
      resizeControls.className = "resize-controls";
      resizeControls.style.display = "none";

      // Create 8 handles for full resizing capability
      const handles = ["nw", "n", "ne", "w", "e", "sw", "s", "se"];
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
      let startY = 0;
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
        startY = e.clientY;

        // Use current image dimensions instead of initial ones
        startWidth = parseInt(img.getAttribute("width") || "0") || node.attrs["width"] || img.naturalWidth;
        startHeight = parseInt(img.getAttribute("height") || "0") || node.attrs["height"] || img.naturalHeight;

        // Add resizing class to body
        document.body.classList.add("resizing");

        const handleMouseMove = (e: MouseEvent) => {
          if (!isResizing) return;

          const deltaX = e.clientX - startX;
          const deltaY = e.clientY - startY;

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
            case "s":
              newHeight = startHeight + deltaY;
              newWidth = newHeight * aspectRatio;
              break;
            case "n":
              newHeight = startHeight - deltaY;
              newWidth = newHeight * aspectRatio;
              break;
            case "se":
              newWidth = startWidth + deltaX;
              newHeight = startHeight + deltaY;
              break;
            case "sw":
              newWidth = startWidth - deltaX;
              newHeight = startHeight + deltaY;
              break;
            case "ne":
              newWidth = startWidth + deltaX;
              newHeight = startHeight - deltaY;
              break;
            case "nw":
              newWidth = startWidth - deltaX;
              newHeight = startHeight - deltaY;
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

          // Update Tiptap node with new dimensions
          if (typeof getPos === "function") {
            const finalWidth = parseInt(img.getAttribute("width") || "0");
            const finalHeight = parseInt(img.getAttribute("height") || "0");

            if (finalWidth && finalHeight) {
              editor.commands.updateAttributes("resizableImage", {
                width: finalWidth,
                height: finalHeight,
              });
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
        resizeControls.style.display = "block";
        container.classList.add("selected");
        img.classList.add("selected");
      };

      const deselectNode = () => {
        resizeControls.style.display = "none";
        container.classList.remove("selected");
        img.classList.remove("selected");
      };

      return {
        dom: container,
        selectNode,
        deselectNode,
        update: updatedNode => {
          if (updatedNode.type.name !== "resizableImage") return false;

          img.src = updatedNode.attrs["src"];
          img.alt = updatedNode.attrs["alt"] || "";
          img.title = updatedNode.attrs["title"] || "";

          if (updatedNode.attrs["width"]) img.width = updatedNode.attrs["width"];
          if (updatedNode.attrs["height"]) img.height = updatedNode.attrs["height"];

          return true;
        },
      };
    };
  },
});
