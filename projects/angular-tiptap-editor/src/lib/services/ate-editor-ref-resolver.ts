import { computed, inject, Signal } from "@angular/core";
import { Editor } from "@tiptap/core";
import { AteEditorRef, AteEditorInput } from "../models/ate-editor-ref";
import { AteEditorRegistry } from "./ate-editor-registry.service";

/**
 * Resolves an `AteEditorInput` signal into the matching `AteEditorRef`, via
 * `AteEditorRegistry` — the same registry-lookup pattern `AteTableOfContentsComponent`
 * has always used. Chrome components built on this never need to live under a
 * `providers: ATE_EDITOR_PROVIDERS` ancestor: they resolve by ID, by the raw
 * `Editor` instance (reverse-looked-up in the registry), or fall back to
 * whichever editor is currently active.
 *
 * Must be called in an Angular injection context (e.g. a component field
 * initializer), the same rule as `input()`/`inject()`.
 *
 * The returned signal re-derives on every read — do not cache `.editor()`/
 * `.commandsService` from a single call into a plain field, since the
 * resolved editor can change identity over a component's lifetime (e.g. the
 * active editor changing on a page with multiple editors).
 */
export function injectAteEditorRef(input: Signal<AteEditorInput>): Signal<AteEditorRef | null> {
  const registry = inject(AteEditorRegistry);

  return computed(() => {
    const value = input();

    if (value instanceof AteEditorRef) {
      return value;
    }

    if (typeof value === "string") {
      return registry.get(value) ?? null;
    }

    if (value instanceof Editor) {
      for (const ref of registry.editors().values()) {
        if (ref.editor === value) {
          return ref;
        }
      }
      return null;
    }

    return registry.activeEditor() ?? null;
  });
}
