import { Directive, signal, Signal, WritableSignal } from "@angular/core";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Decoration } from "@tiptap/pm/view";
import { Editor } from "@tiptap/core";

/**
 * Props that are injected into Angular NodeView components
 */
export interface AteAngularNodeViewProps {
  editor: Editor;
  node: ProseMirrorNode;
  decorations: readonly Decoration[];
  selected: boolean;
  extension: unknown;
  getPos: () => number | undefined;
  updateAttributes: (attrs: Record<string, unknown>) => void;
  deleteNode: () => void;
}

/**
 * Base abstract class for custom 'Angular Nodes'.
 *
 * Extend this class in your custom components to automatically receive TipTap editor
 * properties (node attributes, selection state, etc.) as reactive Signals.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-counter',
 *   template: `
 *     <div>
 *       <button (click)="increment()">Count: {{ node().attrs['count'] }}</button>
 *     </div>
 *   `
 * })
 * export class CounterComponent extends AteAngularNodeView {
 *   increment() {
 *     const count = this.node().attrs['count'] || 0;
 *     this.updateAttributes({ count: count + 1 });
 *   }
 * }
 * ```
 */
@Directive()
export abstract class AteAngularNodeView {
  /**
   * The TipTap editor instance
   */
  public editor!: Signal<Editor>;

  /**
   * The ProseMirror node
   */
  public node!: Signal<ProseMirrorNode>;

  /**
   * Decorations applied to this node
   */
  public decorations!: Signal<readonly Decoration[]>;

  /**
   * Whether the node is currently selected
   */
  public selected!: Signal<boolean>;

  /**
   * The extension instance that created this node
   */
  public extension!: Signal<unknown>;

  /**
   * Function to get the current position of this node in the document
   */
  public getPos!: () => number | undefined;

  /**
   * Update the attributes of this node
   *
   * @param attrs - Partial attributes to update
   *
   * @example
   * ```typescript
   * this.updateAttributes({ count: 5, color: 'blue' });
   * ```
   */
  public updateAttributes!: (attrs: Record<string, unknown>) => void;

  /**
   * Delete this node from the document
   */
  public deleteNode!: () => void;

  /** @internal */
  private _writableSignals?: {
    node: WritableSignal<ProseMirrorNode>;
    decorations: WritableSignal<readonly Decoration[]>;
    selected: WritableSignal<boolean>;
  };

  /**
   * Internal method to initialize the component with NodeView props.
   * This is called by the AngularNodeViewRenderer.
   *
   * @internal
   */
  _initNodeView(props: AteAngularNodeViewProps): void {
    // Create signals from the props
    const editorSignal = signal(props.editor);
    const nodeSignal = signal(props.node);
    const decorationsSignal = signal(props.decorations);
    const selectedSignal = signal(props.selected);
    const extensionSignal = signal(props.extension);

    // Assign to the component
    this.editor = editorSignal.asReadonly();
    this.node = nodeSignal.asReadonly();
    this.decorations = decorationsSignal.asReadonly();
    this.selected = selectedSignal.asReadonly();
    this.extension = extensionSignal.asReadonly();
    this.getPos = props.getPos;
    this.updateAttributes = props.updateAttributes;
    this.deleteNode = props.deleteNode;

    // Store writable signals for updates
    this._writableSignals = {
      node: nodeSignal,
      decorations: decorationsSignal,
      selected: selectedSignal,
    };
  }

  /**
   * Internal method to update the component when the node changes.
   * This is called by the AngularNodeViewRenderer.
   *
   * @internal
   */
  _updateNodeView(node: ProseMirrorNode, decorations: readonly Decoration[]): void {
    if (this._writableSignals) {
      this._writableSignals.node.set(node);
      this._writableSignals.decorations.set(decorations);
    }
  }

  /**
   * Internal method to update the selection state.
   * This is called by the AngularNodeViewRenderer.
   *
   * @internal
   */
  _selectNodeView(): void {
    if (this._writableSignals) {
      this._writableSignals.selected.set(true);
    }
  }

  /**
   * Internal method to update the deselection state.
   * This is called by the AngularNodeViewRenderer.
   *
   * @internal
   */
  _deselectNodeView(): void {
    if (this._writableSignals) {
      this._writableSignals.selected.set(false);
    }
  }
}
