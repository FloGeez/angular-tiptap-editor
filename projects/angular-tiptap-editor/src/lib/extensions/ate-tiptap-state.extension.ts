import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import {
  AteEditorStateSnapshot,
  ATE_INITIAL_EDITOR_STATE,
  AteStateCalculator,
} from "../models/ate-editor-state.model";

export interface AteTiptapStateOptions {
  onUpdate?: (state: AteEditorStateSnapshot) => void;
  calculators: AteStateCalculator[];
}

/**
 * High-performance flat property merger.
 * Processes sub-objects (marks, can, nodes) property by property.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fastMerge(target: any, source: any) {
  if (!source) {
    return;
  }

  for (const key in source) {
    const sourceVal = source[key];

    // If the value is an object (marks, can, nodes, selection)
    if (sourceVal !== null && typeof sourceVal === "object" && !Array.isArray(sourceVal)) {
      if (!target[key]) {
        target[key] = {};
      }

      // Merge internal properties
      for (const subKey in sourceVal) {
        const subVal = sourceVal[subKey];
        // TRUE priority rule for boolean state categories
        if (typeof subVal === "boolean" && (key === "marks" || key === "can" || key === "nodes")) {
          target[key][subKey] = target[key][subKey] || subVal;
        } else {
          target[key][subKey] = subVal;
        }
      }
    } else {
      // Simple value (isFocused, isEditable)
      target[key] = sourceVal;
    }
  }
}

function createFreshSnapshot(): AteEditorStateSnapshot {
  return JSON.parse(JSON.stringify(ATE_INITIAL_EDITOR_STATE));
}

export const AteTiptapStateExtension = Extension.create<AteTiptapStateOptions>({
  name: "ateTiptapState",

  addOptions() {
    return {
      onUpdate: undefined,
      calculators: [],
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("tiptapState"),
        view: () => ({
          update: _view => {
            const { editor } = this;
            if (!editor) {
              return;
            }

            const snapshot = createFreshSnapshot();
            const calcs = this.options.calculators;

            for (const calculator of calcs) {
              try {
                const partial = calculator(editor);
                fastMerge(snapshot, partial);
              } catch (e) {
                console.error("TiptapStateExtension: Calculator error", e);
              }
            }

            if (this.options.onUpdate) {
              this.options.onUpdate(snapshot);
            }
          },
        }),
      }),
    ];
  },

  onFocus() {
    this.editor.view.dispatch(this.editor.state.tr.setMeta("tiptapStateForceUpdate", true));
  },

  onBlur() {
    this.editor.view.dispatch(this.editor.state.tr.setMeta("tiptapStateForceUpdate", true));
  },
});
