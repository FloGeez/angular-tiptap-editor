import { Injectable, signal, computed, Signal } from "@angular/core";
import { Editor } from "@tiptap/core";
import { AteEditorRef } from "../models/ate-editor-ref";
import { AteEditorCommandsService } from "./ate-editor-commands.service";
import { AteHoveredBlockData } from "../models/ate-block-hover.model";

/**
 * A root-level registry service to register, unregister, and manage active editor instances.
 * This service is provided in 'root' and can be injected anywhere in the application.
 */
@Injectable({
  providedIn: "root",
})
export class AteEditorRegistry {
  private static counter = 0;

  // Map of registered editors
  private readonly _editors = signal<Map<string, AteEditorRef>>(new Map());
  readonly editors = this._editors.asReadonly();

  // Active (last focused or last registered) editor ID
  private readonly _activeEditorId = signal<string | null>(null);
  readonly activeEditorId = this._activeEditorId.asReadonly();

  // List of all active editor IDs reactively
  readonly editorIds = computed(() => Array.from(this._editors().keys()));

  // Active AteEditorRef reactively
  readonly activeEditor = computed(() => {
    const activeId = this._activeEditorId();
    if (!activeId) {
      return null;
    }
    return this._editors().get(activeId) || null;
  });

  /**
   * Register an editor instance.
   * Returns the final registered ID.
   */
  register(
    id: string | undefined,
    getEditor: () => Editor | null,
    commandsService: AteEditorCommandsService,
    hoveredBlock: Signal<AteHoveredBlockData | null>
  ): string {
    const finalId = id || `ate-editor-${++AteEditorRegistry.counter}`;
    const editorRef = new AteEditorRef(finalId, getEditor, commandsService, hoveredBlock);

    this._editors.update(map => {
      const newMap = new Map(map);
      newMap.set(finalId, editorRef);
      return newMap;
    });

    // If there is no active editor, make this one active
    if (!this._activeEditorId()) {
      this._activeEditorId.set(finalId);
    }

    return finalId;
  }

  /**
   * Unregister an editor instance by ID.
   */
  unregister(id: string): void {
    this._editors.update(map => {
      const newMap = new Map(map);
      newMap.delete(id);
      return newMap;
    });

    // If the active editor is the one being unregistered, find a fallback
    if (this._activeEditorId() === id) {
      const remainingIds = this.editorIds();
      if (remainingIds.length > 0) {
        // Set active to the last registered one remaining
        this._activeEditorId.set(remainingIds[remainingIds.length - 1]);
      } else {
        this._activeEditorId.set(null);
      }
    }
  }

  /**
   * Mark an editor as active (usually on focus).
   */
  setActive(id: string): void {
    if (this._editors().has(id)) {
      this._activeEditorId.set(id);
    }
  }

  /**
   * Retrieve an editor reference by ID, or the active editor if ID is not specified.
   */
  get(id?: string): AteEditorRef | undefined {
    if (id) {
      return this._editors().get(id);
    }
    const activeId = this._activeEditorId();
    return activeId ? this._editors().get(activeId) : undefined;
  }
}
