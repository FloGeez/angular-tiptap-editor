import { Injector, Type } from "@angular/core";
import { NodeConfig } from "@tiptap/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";

/**
 * Common options for rendering any Angular component as a TipTap NodeView
 */
export interface AteComponentRenderOptions {
  /**
   * Angular injector to use for creating the component
   */
  injector: Injector;

  /**
   * Additional inputs to pass to the component
   */
  inputs?: Record<string, unknown>;

  /**
   * Custom wrapper element tag (default: 'div')
   */
  wrapperTag?: string;

  /**
   * CSS classes to add to the wrapper element
   */
  wrapperClass?: string;

  /**
   * Whether the node should be treated as an atom (not editable)
   * Default: true
   */
  atom?: boolean;

  /**
   * Enables editable content for <ng-content>.
   * If true, TipTap will treat the component's content as editable.
   * @default false
   */
  editableContent?: boolean;

  /**
   * Optional CSS selector to target an internal element of the component as the editable area.
   */
  contentSelector?: string;

  /**
   * Type of content allowed in the editable area.
   */
  contentMode?: "block" | "inline";

  /**
   * Whether to ignore mutations in the component's DOM.
   * If true, TipTap won't try to sync changes from the component's DOM back to the editor state.
   * @default true
   */
  ignoreMutation?:
    | boolean
    | ((mutation: MutationRecord | { type: "selection"; target: Node }) => boolean);

  /**
   * Callback called when an Output event is emitted by the component.
   */
  onOutput?: (outputName: string, value: unknown) => void;

  /**
   * Callback called when the node is updated.
   */
  onUpdate?: (node: ProseMirrorNode) => void;

  /**
   * Callback called when the component is destroyed.
   */
  onDestroy?: () => void;
}

/**
 * Unified configuration for registering ANY Angular component.
 */
export interface RegisterAngularComponentOptions<T = unknown> {
  /**
   * The Angular component to register
   */
  component: Type<T>;

  /**
   * Unique name for the TipTap node
   */
  name?: string;

  /**
   * Default inputs (for standard components)
   */
  defaultInputs?: Record<string, unknown>;

  /**
   * TipTap attributes (for TipTap-aware components)
   */
  attributes?: Record<
    string,
    {
      default?: unknown;
      parseHTML?: (element: HTMLElement) => unknown;
      renderHTML?: (attributes: Record<string, unknown>) => Record<string, unknown> | null;
    }
  >;

  /**
   * CSS selector for the editable area inside the component
   */
  contentSelector?: string;

  /**
   * Content mode for the editable area
   */
  contentMode?: "block" | "inline";

  /**
   * Enable editable content via <ng-content> or contentSelector
   * @default false
   */
  editableContent?: boolean;

  /**
   * Node group (block or inline)
   * @default 'block'
   */
  group?: "block" | "inline";

  /**
   * Is the node draggable?
   * @default true
   */
  draggable?: boolean;

  /**
   * Whether to ignore mutations in the component's DOM.
   * @default true
   */
  ignoreMutation?:
    | boolean
    | ((mutation: MutationRecord | { type: "selection"; target: Node }) => boolean);

  /**
   * Custom HTML attributes for the wrapper
   */
  HTMLAttributes?: Record<string, unknown>;

  /**
   * Custom parseHTML rules
   */
  parseHTML?: NodeConfig["parseHTML"];

  /**
   * Custom renderHTML function
   */
  renderHTML?: NodeConfig["renderHTML"];

  /**
   * Callback called when an Output event is emitted by the component.
   */
  onOutput?: (outputName: string, value: unknown) => void;
}
