import {
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
  Type,
  ComponentRef,
} from "@angular/core";
import { NodeView, Decoration, EditorView } from "@tiptap/pm/view";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Editor } from "@tiptap/core";
import { AteAngularNodeView } from "./ate-angular-node-view";
import { AteComponentRenderOptions } from "./ate-node-view.models";
import { Subscription } from "rxjs";

/**
 * Universal Renderer for Angular Components as TipTap NodeViews.
 *
 * Supports:
 * - TipTap-Aware components (extending AteAngularNodeView)
 * - Standard library components (automatic @Input() sync)
 * - Signal-based inputs and outputs (Angular 18+)
 * - Content projection (editableContent)
 * - Unified lifecycle and event management
 */
export function AteNodeViewRenderer<T>(
  component: Type<T>,
  options: AteComponentRenderOptions
): (props: {
  node: ProseMirrorNode;
  view: EditorView;
  getPos: () => number | undefined;
  decorations: readonly Decoration[];
  editor: Editor;
  extension: unknown;
}) => NodeView {
  return props => {
    const { node, view: _view, getPos, decorations, editor, extension } = props;
    const {
      injector,
      inputs = {},
      wrapperTag = "div",
      wrapperClass,
      editableContent = false,
      contentSelector,
      onOutput,
      ignoreMutation = true,
    } = options;

    const dom = document.createElement(wrapperTag);
    if (wrapperClass) {
      dom.className = wrapperClass;
    }

    const applicationRef = injector.get(ApplicationRef);
    const environmentInjector = injector.get(EnvironmentInjector);

    // 1. Setup Content Projection (ng-content)
    let initialNodes: Node[][] = [];
    let contentDOM: HTMLElement | null = null;

    if (editableContent && !contentSelector) {
      contentDOM = document.createElement("div");
      contentDOM.setAttribute("data-node-view-content", "");
      initialNodes = [[contentDOM]];
    }

    // 2. Create the Angular Component
    const componentRef: ComponentRef<T> = createComponent(component, {
      environmentInjector,
      elementInjector: injector,
      projectableNodes: initialNodes,
    });

    const instance = componentRef.instance;
    const subscriptions: Subscription[] = [];

    // 3. Initialize TipTap-Aware instances
    if (instance instanceof AteAngularNodeView) {
      instance._initNodeView({
        editor,
        node,
        decorations,
        selected: false,
        extension,
        getPos,
        updateAttributes: attrs => editor.commands.updateAttributes(node.type.name, attrs),
        deleteNode: () => {
          const pos = getPos();
          if (pos !== undefined) {
            editor.commands.deleteRange({ from: pos, to: pos + node.nodeSize });
          }
        },
      });
    }

    // 4. Synchronize Inputs (Handles standard @Input and Signal-based inputs)
    const syncInputs = (nodeToSync: ProseMirrorNode) => {
      // Combine base inputs from options with dynamic node attributes
      const mergedInputs = { ...inputs, ...nodeToSync.attrs };
      Object.entries(mergedInputs).forEach(([key, value]) => {
        if (key !== "id" && value !== null && value !== undefined) {
          try {
            componentRef.setInput(key, value);
          } catch {
            // Silently ignore inputs that don't exist on the component
          }
        }
      });
    };

    syncInputs(node);

    // 5. Setup Outputs (Handles EventEmitter and OutputRef)
    if (onOutput) {
      Object.entries(instance as Record<string, unknown>).forEach(([key, potentialOutput]) => {
        if (
          potentialOutput &&
          typeof (potentialOutput as { subscribe?: (cb: (val: unknown) => void) => void })
            .subscribe === "function"
        ) {
          const sub = (
            potentialOutput as { subscribe: (cb: (val: unknown) => void) => Subscription }
          ).subscribe((value: unknown) => {
            onOutput(key, value);
          });
          if (sub instanceof Subscription) {
            subscriptions.push(sub);
          }
        }
      });
    }

    // 6. Attach to DOM and ApplicationRef
    applicationRef.attachView(componentRef.hostView);
    const componentElement = componentRef.location.nativeElement;

    // Target specific element for content if selector provided
    if (editableContent && contentSelector) {
      contentDOM = componentElement.querySelector(contentSelector);
    }

    dom.appendChild(componentElement);

    // Initial detection to ensure the component is rendered
    componentRef.changeDetectorRef.detectChanges();

    // 7. Return the TipTap NodeView Interface
    return {
      dom,
      contentDOM,

      update: (updatedNode, updatedDecorations) => {
        if (updatedNode.type !== node.type) {
          return false;
        }

        // Update Aware component signals
        if (instance instanceof AteAngularNodeView) {
          instance._updateNodeView(updatedNode, updatedDecorations);
        }

        // Update inputs
        syncInputs(updatedNode);

        // Notify and Detect changes
        componentRef.changeDetectorRef.detectChanges();
        if (options.onUpdate) {
          options.onUpdate(updatedNode);
        }

        return true;
      },

      selectNode: () => {
        if (instance instanceof AteAngularNodeView) {
          instance._selectNodeView();
        }
        dom.classList.add("ProseMirror-selectednode");
      },

      deselectNode: () => {
        if (instance instanceof AteAngularNodeView) {
          instance._deselectNodeView();
        }
        dom.classList.remove("ProseMirror-selectednode");
      },

      destroy: () => {
        if (options.onDestroy) {
          options.onDestroy();
        }
        subscriptions.forEach(s => s.unsubscribe());
        applicationRef.detachView(componentRef.hostView);
        componentRef.destroy();
      },

      stopEvent: event => {
        const target = event.target as HTMLElement;
        const isEditable =
          target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
        return isEditable;
      },

      ignoreMutation: mutation => {
        if (typeof ignoreMutation === "function") {
          return ignoreMutation(mutation);
        }
        return ignoreMutation;
      },
    };
  };
}
