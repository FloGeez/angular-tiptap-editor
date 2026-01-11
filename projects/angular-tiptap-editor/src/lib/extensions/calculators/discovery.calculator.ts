import { Editor } from '@tiptap/core';
import { StateCalculator } from '../../models/editor-state.model';

/**
 * DiscoveryCalculator automatically detects and tracks the state of any TipTap extension.
 * It provides a "fallback" reactive state for any mark or node not explicitly handled 
 * by specialized calculators.
 */
export const DiscoveryCalculator: StateCalculator = (editor: Editor) => {
    const state: any = { marks: {}, nodes: {}, can: {} };

    // We skip core extensions that are already handled by specialized calculators
    // to avoid redundant calculations and maintain precise attribute tracking (like colors).
    const handled = [
        'bold', 'italic', 'underline', 'strike', 'code', 'link',
        'highlight', 'superscript', 'subscript', 'table', 'image',
        'heading', 'bulletList', 'orderedList', 'blockquote', 'textAlign',
        'textStyle', 'color'
    ];

    // Access the extension manager to find all registered marks and nodes
    const extensions = (editor as any).extensionManager.extensions;

    extensions.forEach((ext: any) => {
        // Skip utilities and already handled core extensions
        if (ext.type === 'extension' || handled.includes(ext.name)) {
            return;
        }

        // Identify and track basic boolean states
        const name = ext.name;
        const isActive = editor.isActive(name);

        if (ext.type === 'mark') {
            state.marks[name] = isActive;

            // Attempt to guess the toggle command name
            const commandName = `toggle${name.charAt(0).toUpperCase() + name.slice(1)}`;
            if ((editor.can() as any)[commandName]) {
                try {
                    state.can[commandName] = (editor.can() as any)[commandName]();
                } catch (e) {
                    // Some commands might require arguments even if they are marks
                }
            }
        } else if (ext.type === 'node') {
            state.nodes[name] = isActive;
        }
    });

    return state;
};
