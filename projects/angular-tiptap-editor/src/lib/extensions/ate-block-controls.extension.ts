import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { EditorView } from "@tiptap/pm/view";
import { Node } from "@tiptap/pm/model";

export interface AteBlockControlsOptions {
  onHover?: (data: { node: Node; element: HTMLElement; pos: number } | null) => void;
}

// Helper to get the DOM element properly
function getDomElement(view: EditorView, pos: number): HTMLElement | null {
  const dom = view.nodeDOM(pos);
  if (!dom) {
    return null;
  }
  if (dom instanceof HTMLElement) {
    return dom;
  }
  return dom.parentElement;
}

// VERTICAL SCAN (For the empty margin)
function findBlockElementAtY(view: EditorView, y: number): HTMLElement | null {
  const editorDom = view.dom as HTMLElement;
  const children = Array.from(editorDom.children) as HTMLElement[];

  // We look for the direct child of the editor (Level 1) that intercepts the Y line
  return (
    children.find(child => {
      if (getComputedStyle(child).position === "absolute") {
        return false;
      }
      const rect = child.getBoundingClientRect();
      // Tolérance de 5px
      return y >= rect.top - 5 && y <= rect.bottom + 5;
    }) || null
  );
}

function resolveBlockData(
  view: EditorView,
  y: number,
  targetElement: HTMLElement | null
): { node: Node; element: HTMLElement; pos: number } | null {
  let blockEl: HTMLElement | null = null;

  // 1. FAST PATH : Direct target
  // LEVEL 1: We look for the first parent element that is a direct child of the editor
  if (targetElement && !targetElement.classList.contains("ProseMirror")) {
    blockEl = targetElement.closest(".ProseMirror > *") as HTMLElement;
  }

  // 2. GUTTER PATH : Vertical scan
  if (!blockEl) {
    blockEl = findBlockElementAtY(view, y);
  }

  if (!blockEl) {
    return null;
  }

  // 3. PROSEMIRROR NODE RESOLUTION
  try {
    // We ask for the position at the beginning of this root block
    const pos = view.posAtDOM(blockEl, 0);
    const $pos = view.state.doc.resolve(pos);

    // CASE A : STANDARD BLOCKS (H1, P, Lists, Blockquotes...)
    // We make sure to take the node of depth 1 (Direct child of the Doc)
    if ($pos.depth >= 1) {
      const rootNode = $pos.node(1);
      const rootPos = $pos.before(1);
      const rootElement = getDomElement(view, rootPos);

      // Sécurité : on vérifie que l'élément DOM correspond bien
      if (rootNode && (rootElement || blockEl)) {
        return { node: rootNode, element: rootElement || blockEl, pos: rootPos };
      }
    }

    // CASE B : IMAGES / ATOMS (Depth 0)
    // Sometimes a root image is seen as Depth 0 by resolve()
    // We look at the node right after the position
    if ($pos.depth === 0) {
      const nodeAfter = $pos.nodeAfter;
      if (nodeAfter && (nodeAfter.isBlock || nodeAfter.isAtom)) {
        return { node: nodeAfter, element: blockEl, pos: pos };
      }
    }
  } catch (_e) {
    // console.warn(_e);
  }

  return null;
}

export const AteBlockControlsExtension = Extension.create<AteBlockControlsOptions>({
  name: "ateBlockControls",

  addOptions() {
    return { onHover: undefined };
  },

  addProseMirrorPlugins() {
    let lastHoveredElement: HTMLElement | null = null;
    let lastHoveredPos: number | null = null;
    let rafId: number | null = null;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const update = (view: EditorView) => {
      if (!this.editor.isEditable) {
        return;
      }

      const editorRect = view.dom.getBoundingClientRect();
      const gutterWidth = 80;

      // Check Limites (Marge Gauche + Editeur)
      if (
        lastMouseY < editorRect.top ||
        lastMouseY > editorRect.bottom ||
        lastMouseX > editorRect.right ||
        lastMouseX < editorRect.left - gutterWidth
      ) {
        if (lastHoveredElement) {
          reset();
        }
        return;
      }

      // STICKY ANTI-FLICKER
      // On garde le bloc tant qu'on est dans sa hauteur
      if (lastHoveredElement && lastHoveredElement.isConnected) {
        const rect = lastHoveredElement.getBoundingClientRect();
        if (lastMouseY >= rect.top && lastMouseY <= rect.bottom) {
          return;
        }
      }

      const target = document.elementFromPoint(lastMouseX, lastMouseY) as HTMLElement;

      const data = resolveBlockData(view, lastMouseY, target);

      if (data && (data.element !== lastHoveredElement || data.pos !== lastHoveredPos)) {
        lastHoveredElement = data.element;
        lastHoveredPos = data.pos;
        this.options.onHover?.(data);
      } else if (!data) {
        if (!lastHoveredElement || !lastHoveredElement.isConnected) {
          reset();
        }
      }
    };

    const reset = () => {
      this.options.onHover?.(null);
      lastHoveredElement = null;
      lastHoveredPos = null;
    };

    return [
      new Plugin({
        key: new PluginKey("ateBlockControls"),
        props: {
          handleDOMEvents: {
            mousemove: (view: EditorView, event: MouseEvent) => {
              lastMouseX = event.clientX;
              lastMouseY = event.clientY;

              if (rafId === null) {
                rafId = window.requestAnimationFrame(() => {
                  update(view);
                  rafId = null;
                });
              }
              return false;
            },
            mouseleave: () => {
              if (rafId) {
                window.cancelAnimationFrame(rafId);
                rafId = null;
              }
              reset();
              return false;
            },
          },
        },
      }),
    ];
  },
});
