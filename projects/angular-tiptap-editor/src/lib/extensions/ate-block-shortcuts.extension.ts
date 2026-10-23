import { Extension } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { EditorState, NodeSelection, Selection, Transaction } from "@tiptap/pm/state";

const LIST_ITEM_NODE_NAMES = new Set(["listItem", "taskItem"]);

export interface AteBlockShortcutsOptions {
  /** Whether the shortcuts are active. Evaluated on every key press, so it can change at runtime */
  enabled: () => boolean;
}

export interface AteBlockAtSelection {
  node: ProseMirrorNode;
  /** Document position right before the block */
  pos: number;
  parent: ProseMirrorNode;
  /** Index of the block among its parent's children */
  index: number;
}

/**
 * Resolves the block the shortcuts act on: a selected block node, the list or task item
 * holding the cursor, or else the top-level block holding the cursor.
 */
export function findBlockAtSelection(selection: Selection): AteBlockAtSelection | null {
  const { $from } = selection;
  if (selection instanceof NodeSelection && selection.node.isBlock) {
    return {
      node: selection.node,
      pos: selection.from,
      parent: $from.parent,
      index: $from.index(),
    };
  }
  if ($from.depth < 1) {
    return null;
  }
  let depth = 1;
  for (let current = $from.depth; current > 0; current--) {
    if (LIST_ITEM_NODE_NAMES.has($from.node(current).type.name)) {
      depth = current;
      break;
    }
  }
  return {
    node: $from.node(depth),
    pos: $from.before(depth),
    parent: $from.node(depth - 1),
    index: $from.index(depth - 1),
  };
}

/** Inserts a copy of the current block right after it */
export function duplicateBlock(state: EditorState): Transaction | null {
  const block = findBlockAtSelection(state.selection);
  if (!block) {
    return null;
  }
  return state.tr.insert(block.pos, block.node).scrollIntoView();
}

/** Swaps the current block with its previous sibling, or returns `null` at the first position */
export function moveBlockUp(state: EditorState): Transaction | null {
  const block = findBlockAtSelection(state.selection);
  if (!block || block.index === 0) {
    return null;
  }
  const previous = block.parent.child(block.index - 1);
  const end = block.pos + block.node.nodeSize;
  return state.tr
    .insert(end, previous)
    .delete(block.pos - previous.nodeSize, block.pos)
    .scrollIntoView();
}

/** Swaps the current block with its next sibling, or returns `null` at the last position */
export function moveBlockDown(state: EditorState): Transaction | null {
  const block = findBlockAtSelection(state.selection);
  if (!block || block.index >= block.parent.childCount - 1) {
    return null;
  }
  const next = block.parent.child(block.index + 1);
  const end = block.pos + block.node.nodeSize;
  return state.tr
    .delete(end, end + next.nodeSize)
    .insert(block.pos, next)
    .scrollIntoView();
}

/**
 * Notion-style block shortcuts: `Mod+D` duplicates the current block, `Mod+Shift+ArrowUp` and
 * `Mod+Shift+ArrowDown` move it one sibling up or down. Inside a list the block is the list
 * or task item, which moves within its list. At the edges the key event is left alone.
 */
export const AteBlockShortcuts = Extension.create<AteBlockShortcutsOptions>({
  name: "ateBlockShortcuts",

  addOptions() {
    return {
      enabled: () => true,
    };
  },

  addKeyboardShortcuts() {
    const run = (build: (state: EditorState) => Transaction | null) => (): boolean => {
      if (!this.options.enabled() || !this.editor.isEditable) {
        return false;
      }
      const transaction = build(this.editor.state);
      if (!transaction) {
        return false;
      }
      this.editor.view.dispatch(transaction);
      return true;
    };

    return {
      "Mod-d": run(duplicateBlock),
      "Mod-Shift-ArrowUp": run(moveBlockUp),
      "Mod-Shift-ArrowDown": run(moveBlockDown),
    };
  },
});
