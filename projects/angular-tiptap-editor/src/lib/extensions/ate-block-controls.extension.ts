import { Extension } from "@tiptap/core";
import { EditorState, NodeSelection, Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet, EditorView } from "@tiptap/pm/view";
import { Node, Slice } from "@tiptap/pm/model";

export const ATE_BLOCK_DRAG_MIME = "application/x-ate-block-drag";

const DRAGGING_CLASS = "ate-block-dragging";
const DROP_BEFORE_CLASS = "ate-block-drop-before";
const DROP_AFTER_CLASS = "ate-block-drop-after";

interface PosRange {
  from: number;
  to: number;
}

interface ActiveBlockDrag extends PosRange {
  doc: Node;
  slice: Slice;
}

interface DropIndicatorState {
  pos: number | null;
}

const blockDragKey = new PluginKey<DropIndicatorState>("ateBlockDrag");
const blockDragResetters = new WeakMap<EditorView, () => void>();

export function endAteBlockDrag(view: EditorView): void {
  blockDragResetters.get(view)?.();
}

export function ateMultiBlockSelection(state: EditorState, blockPos: number): PosRange | null {
  const covered = coveredTopLevelRange(state.doc, state.selection);
  return covered && blockPos >= covered.from && blockPos < covered.to ? covered : null;
}

function coveredTopLevelRange(doc: Node, selection: PosRange): PosRange | null {
  const blocks: PosRange[] = [];
  doc.forEach((node, offset) => {
    const end = offset + node.nodeSize;
    if (offset < selection.to && end > selection.from) {
      blocks.push({ from: offset, to: end });
    }
  });
  const last = blocks.at(-1);
  if (blocks.length < 2 || !last) {
    return null;
  }
  return { from: blocks[0].from, to: last.to };
}

function topLevelDropPos(
  view: EditorView,
  point: { clientX: number; clientY: number }
): number | null {
  const hit = view.posAtCoords({ left: point.clientX, top: point.clientY });
  if (!hit) {
    return null;
  }
  const $pos = view.state.doc.resolve(hit.pos);
  if ($pos.depth === 0) {
    return hit.pos;
  }
  const start = $pos.before(1);
  const dom = view.nodeDOM(start);
  if (!(dom instanceof Element)) {
    return $pos.after(1);
  }
  const rect = dom.getBoundingClientRect();
  return point.clientY < rect.top + (rect.bottom - rect.top) / 2 ? start : $pos.after(1);
}

function dropIndicatorDecoration(doc: Node, pos: number): Decoration | null {
  if (pos > doc.content.size || doc.resolve(pos).depth !== 0) {
    return null;
  }
  if (pos < doc.content.size) {
    const next = doc.nodeAt(pos);
    return next ? Decoration.node(pos, pos + next.nodeSize, { class: DROP_BEFORE_CLASS }) : null;
  }
  const last = doc.lastChild;
  return last ? Decoration.node(pos - last.nodeSize, pos, { class: DROP_AFTER_CLASS }) : null;
}

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

function createBlockDragPlugin(): Plugin<DropIndicatorState> {
  let active: ActiveBlockDrag | null = null;
  let marked: HTMLElement | null = null;
  let stopListening: (() => void) | null = null;

  const setIndicator = (view: EditorView, pos: number | null): void => {
    if (blockDragKey.getState(view.state)?.pos !== pos) {
      view.dispatch(view.state.tr.setMeta(blockDragKey, pos));
    }
  };

  const reset = (view: EditorView): void => {
    if (active && view.dragging?.slice === active.slice) {
      view.dragging = null;
    }
    active = null;
    stopListening?.();
    stopListening = null;
    marked?.classList.remove(DRAGGING_CLASS);
    marked = null;
    if (!view.isDestroyed) {
      setIndicator(view, null);
    }
  };

  const listenForDragEnd = (view: EditorView): void => {
    stopListening?.();
    const onEnd = (): void => reset(view);
    const events = ["dragend", "drop"];
    events.forEach(name => window.addEventListener(name, onEnd));
    stopListening = () => events.forEach(name => window.removeEventListener(name, onEnd));
  };

  const resetOnForeignDrag = (view: EditorView, event: DragEvent): void => {
    if (active && !Array.from(event.dataTransfer?.types ?? []).includes(ATE_BLOCK_DRAG_MIME)) {
      reset(view);
    }
  };

  return new Plugin<DropIndicatorState>({
    key: blockDragKey,
    state: {
      init: () => ({ pos: null }),
      apply: (tr, value) => {
        const meta = tr.getMeta(blockDragKey) as number | null | undefined;
        if (meta !== undefined) {
          return { pos: meta };
        }
        return tr.docChanged ? { pos: null } : value;
      },
    },
    view: view => {
      blockDragResetters.set(view, () => reset(view));
      return {
        destroy: () => {
          reset(view);
          blockDragResetters.delete(view);
        },
      };
    },
    props: {
      decorations: state => {
        const pos = blockDragKey.getState(state)?.pos;
        if (pos === null || pos === undefined) {
          return null;
        }
        const decoration = dropIndicatorDecoration(state.doc, pos);
        return decoration ? DecorationSet.create(state.doc, [decoration]) : null;
      },
      handleDOMEvents: {
        dragstart: (view, event) => {
          const transfer = event.dataTransfer;
          if (
            !view.editable ||
            !transfer ||
            !Array.from(transfer.types).includes(ATE_BLOCK_DRAG_MIME)
          ) {
            return false;
          }
          reset(view);
          const { selection, doc } = view.state;
          const range = coveredTopLevelRange(doc, selection) ?? {
            from: selection.from,
            to: selection.to,
          };
          if (range.from === range.to) {
            return false;
          }
          const slice = doc.slice(range.from, range.to);
          active = { ...range, doc, slice };
          view.dragging = { slice, move: true };
          marked =
            view.dom.offsetParent instanceof HTMLElement
              ? view.dom.offsetParent
              : view.dom.parentElement;
          marked?.classList.add(DRAGGING_CLASS);
          listenForDragEnd(view);
          const { dom, text } = view.serializeForClipboard(slice);
          transfer.clearData();
          transfer.setData("text/html", dom.innerHTML);
          transfer.setData("text/plain", text);
          transfer.setData(ATE_BLOCK_DRAG_MIME, "1");
          return true;
        },
        dragleave: (view, event) => {
          const related = event.relatedTarget;
          if (active && !(related instanceof globalThis.Node && view.dom.contains(related))) {
            setIndicator(view, null);
          }
          return false;
        },
        dragenter: (view, event) => {
          resetOnForeignDrag(view, event);
          return false;
        },
        dragover: (view, event) => {
          resetOnForeignDrag(view, event);
          if (active && !event.dataTransfer?.files?.length) {
            setIndicator(view, topLevelDropPos(view, event));
          }
          return false;
        },
      },
      handleDrop: (view, event) => {
        const drag = active;
        if (!drag || event.dataTransfer?.files?.length) {
          return false;
        }
        if (drag.doc !== view.state.doc) {
          event.preventDefault();
          reset(view);
          return true;
        }
        const target = topLevelDropPos(view, event);
        if (target === null) {
          return false;
        }
        event.preventDefault();
        if (target >= drag.from && target <= drag.to) {
          reset(view);
          return true;
        }
        const tr = view.state.tr.delete(drag.from, drag.to);
        const at = tr.mapping.map(target);
        tr.insert(at, drag.slice.content);
        const { content } = drag.slice;
        const only = content.childCount === 1 ? content.firstChild : null;
        tr.setSelection(
          only && NodeSelection.isSelectable(only)
            ? NodeSelection.create(tr.doc, at)
            : TextSelection.between(tr.doc.resolve(at), tr.doc.resolve(at + content.size))
        );
        tr.setMeta(blockDragKey, null).setMeta("uiEvent", "drop");
        view.dispatch(tr.scrollIntoView());
        reset(view);
        return true;
      },
    },
  });
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
                rafId = requestAnimationFrame(() => {
                  update(view);
                  rafId = null;
                });
              }
              return false;
            },
            mouseleave: () => {
              if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
              reset();
              return false;
            },
          },
        },
      }),
      createBlockDragPlugin(),
    ];
  },
});
