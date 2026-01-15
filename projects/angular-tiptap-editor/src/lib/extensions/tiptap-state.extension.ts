import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorStateSnapshot, INITIAL_EDITOR_STATE, StateCalculator } from '../models/editor-state.model';

export interface TiptapStateOptions {
    onUpdate?: (state: EditorStateSnapshot) => void;
    calculators: StateCalculator[];
}

/**
 * High-performance flat property merger.
 * Processes sub-objects (marks, can, nodes) property by property.
 */
function fastMerge(target: any, source: any) {
    if (!source) return;

    for (const key in source) {
        const sourceVal = source[key];

        // If the value is an object (marks, can, nodes, selection)
        if (sourceVal !== null && typeof sourceVal === 'object' && !Array.isArray(sourceVal)) {
            if (!target[key]) target[key] = {};

            // Merge internal properties
            for (const subKey in sourceVal) {
                const subVal = sourceVal[subKey];
                // TRUE priority rule for boolean state categories
                if (typeof subVal === 'boolean' && (key === 'marks' || key === 'can' || key === 'nodes')) {
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

function createFreshSnapshot(): EditorStateSnapshot {
    return JSON.parse(JSON.stringify(INITIAL_EDITOR_STATE));
}

export const TiptapStateExtension = Extension.create<TiptapStateOptions>({
    name: 'tiptapState',

    addOptions() {
        return {
            onUpdate: undefined,
            calculators: [],
        };
    },

    addProseMirrorPlugins() {
        const extension = this;
        return [
            new Plugin({
                key: new PluginKey('tiptapState'),
                view: () => ({
                    update: (view) => {
                        const { editor } = extension;
                        if (!editor) return;

                        const snapshot = createFreshSnapshot();
                        const calcs = extension.options.calculators;

                        for (let i = 0; i < calcs.length; i++) {
                            try {
                                const partial = calcs[i](editor);
                                fastMerge(snapshot, partial);
                            } catch (e) {
                                console.error('TiptapStateExtension: Calculator error', e);
                            }
                        }

                        if (extension.options.onUpdate) {
                            extension.options.onUpdate(snapshot);
                        }
                    },
                }),
            }),
        ];
    },

    onFocus() {
        this.editor.view.dispatch(this.editor.state.tr.setMeta('tiptapStateForceUpdate', true));
    },

    onBlur() {
        this.editor.view.dispatch(this.editor.state.tr.setMeta('tiptapStateForceUpdate', true));
    },
});
