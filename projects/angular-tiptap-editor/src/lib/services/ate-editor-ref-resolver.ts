import { computed, inject, ElementRef, Signal } from "@angular/core";
import { Editor } from "@tiptap/core";
import { AteEditorRef, AteEditorInput } from "../models/ate-editor-ref";
import { AteEditorRegistry } from "./ate-editor-registry.service";

/**
 * DOM attribute stamped by `AngularTiptapEditorComponent`, `AteEditorChassisComponent`,
 * and `AteEditorBrutComponent` on their own host element, holding their own
 * `registeredId()`. `injectAteEditorRef()` walks up the real DOM to find the
 * nearest one — not Angular's DI/logical tree, which only reflects where a
 * component was *declared*, not where it physically renders. Content
 * projected through a wrapper (e.g. `AngularTiptapEditorComponent` projecting
 * its own chrome into its internal `AteEditorChassisComponent`) is declared
 * at the wrapper's level but renders inside the wrapped component's DOM
 * subtree; a DOM walk finds the right scope either way, a DI token lookup
 * doesn't (it resolves against the declaring component, so it silently
 * missed this exact case until an unrelated editor elsewhere on the page
 * became "active" and got targeted instead).
 */
export const ATE_EDITOR_SCOPE_ATTR = "data-ate-editor-id";

/**
 * Resolves an `AteEditorInput` signal into the matching `AteEditorRef`, via
 * `AteEditorRegistry` — the same registry-lookup pattern `AteTableOfContentsComponent`
 * has always used. Chrome components built on this never need to live under a
 * `providers: ATE_EDITOR_PROVIDERS` ancestor: they resolve by ID, by the raw
 * `Editor` instance (reverse-looked-up in the registry), or fall back to
 * whichever editor is currently active.
 *
 * Resolution order when no explicit input is given: the nearest DOM ancestor
 * carrying `[data-ate-editor-id]` (see `ATE_EDITOR_SCOPE_ATTR`) — so chrome
 * physically rendered inside an editor host targets THAT editor specifically,
 * no matter how many components sit between where it's declared and where it
 * renders — then the globally active editor.
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
  const elementRef = inject(ElementRef<HTMLElement>, { optional: true });

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

    // Read as a plain dependency (not for its value): registry.editors() is a
    // NEW Map reference on every register()/unregister() anywhere on the
    // page, so reading it here forces this computed to be marked dirty and
    // re-run its (non-reactive) DOM lookup below whenever the set of live
    // editors changes — e.g. when the ancestor host this chrome piece is
    // sitting in registers its own editor slightly after this computed's
    // first read (a real risk: `closest()` reads the DOM directly, which
    // Angular's signal graph can't track, so without an explicit signal
    // dependency here this would only ever get re-checked by coincidence,
    // whenever `registry.activeEditor()` happens to change to a genuinely
    // different value).
    registry.editors();

    const scopedId = elementRef?.nativeElement
      ?.closest?.(`[${ATE_EDITOR_SCOPE_ATTR}]`)
      ?.getAttribute(ATE_EDITOR_SCOPE_ATTR);
    if (scopedId) {
      const scoped = registry.get(scopedId);
      if (scoped) {
        return scoped;
      }
    }

    return registry.activeEditor() ?? null;
  });
}
