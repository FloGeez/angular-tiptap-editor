import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core";
import { AteImageSrcResolver } from "../models/ate-image.model";
import { ateResolveImageSrc } from "../utils/ate-image-src-resolver.utils";

export interface AteResizableImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, unknown>;
  srcResolver: () => AteImageSrcResolver | null | undefined;
}

export interface AteResizableImageMarkdownState {
  write: (text: string) => void;
  esc: (text: string, startOfLine?: boolean) => string;
  closeBlock: (node: unknown) => void;
}

export interface AteResizableImageStorage {
  /** One callback per image node view: re-applies the resolver when it changes */
  srcRefreshers: Set<() => void>;
  /** Markdown spec read by `tiptap-markdown`; ignored when it is not installed */
  markdown: {
    serialize: (
      state: AteResizableImageMarkdownState,
      node: { attrs: Record<string, unknown>; isInline: boolean }
    ) => void;
    parse: Record<string, never>;
  };
}

function ateImageToMarkdown(
  attrs: Record<string, unknown> | undefined,
  escapeAlt: (text: string) => string = text => text.replace(/[\\[\]]/g, "\\$&")
): string {
  const alt = escapeAlt(String(attrs?.["alt"] ?? ""));
  const src = String(attrs?.["src"] ?? "").replace(/[()]/g, "\\$&");
  const title = attrs?.["title"] ? ` "${String(attrs["title"]).replace(/"/g, '\\"')}"` : "";
  return `![${alt}](${src}${title})`;
}

declare module "@tiptap/core" {
  interface Storage {
    resizableImage: AteResizableImageStorage;
  }

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

export const AteResizableImage = Node.create<AteResizableImageOptions, AteResizableImageStorage>({
  name: "resizableImage",

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
      srcResolver: () => null,
    };
  },

  addStorage() {
    return {
      srcRefreshers: new Set(),
      markdown: {
        serialize: (state, node) => {
          state.write(ateImageToMarkdown(node.attrs, text => state.esc(text)));
          if (!node.isInline) {
            state.closeBlock(node);
          }
        },
        parse: {},
      },
    };
  },

  markdownTokenName: "image",

  parseMarkdown: (token, helpers) =>
    helpers.createNode("resizableImage", {
      src: token["href"],
      title: token["title"],
      alt: token.text,
    }),

  renderMarkdown: node => ateImageToMarkdown(node.attrs),

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
    const options = this.options;
    const storage = this.storage;
    return ({ node, getPos, editor }) => {
      let currentNode = node;
      let requestedSrc: string | null = null;
      let requestedWith: AteImageSrcResolver | null = null;
      let destroyed = false;
      const wrapper = document.createElement("div");
      wrapper.className = "resizable-image-wrapper";
      wrapper.style.display = "block";
      if (currentNode.attrs["textAlign"]) {
        wrapper.style.textAlign = currentNode.attrs["textAlign"];
        wrapper.setAttribute("data-align", currentNode.attrs["textAlign"]);
      }

      const container = document.createElement("div");
      container.className = "resizable-image-container";
      container.style.position = "relative";
      container.style.display = "inline-block";

      const img = document.createElement("img");
      img.alt = currentNode.attrs["alt"] || "";
      img.title = currentNode.attrs["title"] || "";
      img.className = "ate-image";
      img.style.display = "inline-block"; // Ensure it respects container text-align

      if (currentNode.attrs["width"]) {
        img.width = currentNode.attrs["width"];
      }
      if (currentNode.attrs["height"]) {
        img.height = currentNode.attrs["height"];
      }

      const applySrc = (src: string | null) => {
        const resolver = options.srcResolver() ?? null;
        if (!resolver || !src) {
          requestedSrc = null;
          requestedWith = null;
          img.src = src ?? "";
          return;
        }
        if (src === requestedSrc && resolver === requestedWith) {
          return;
        }
        // A new resolver for the same src keeps the current image until the new URL is ready, so it does not blink
        if (src !== requestedSrc) {
          img.removeAttribute("src");
        }
        requestedSrc = src;
        requestedWith = resolver;
        ateResolveImageSrc(resolver, src).then(resolved => {
          if (!destroyed && requestedSrc === src && requestedWith === resolver) {
            img.src = resolved;
          }
        });
      };
      const refreshSrc = () => applySrc(currentNode.attrs["src"]);
      refreshSrc();
      storage.srcRefreshers.add(refreshSrc);

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
          parseInt(img.getAttribute("width") || "0") ||
          currentNode.attrs["width"] ||
          img.naturalWidth;
        startHeight =
          parseInt(img.getAttribute("height") || "0") ||
          currentNode.attrs["height"] ||
          img.naturalHeight;

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
                  ...currentNode.attrs,
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

          currentNode = updatedNode;

          applySrc(updatedNode.attrs["src"]);
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
        destroy: () => {
          destroyed = true;
          storage.srcRefreshers.delete(refreshSrc);
        },
      };
    };
  },
});
