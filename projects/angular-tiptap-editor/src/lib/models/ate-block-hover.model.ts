import { Node as PMNode } from "@tiptap/pm/model";

/**
 * The node currently hovered by the pointer, produced by the block-hover
 * extension registered on a given editor instance. Not resolvable from a
 * plain editor ID alone — carried alongside the editor in `AteEditorRef` so
 * `AteBlockControlsComponent` can resolve it the same way it resolves the
 * editor itself.
 */
export interface AteHoveredBlockData {
  node: PMNode;
  element: HTMLElement;
  pos: number;
}
