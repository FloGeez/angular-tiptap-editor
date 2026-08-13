import { InjectionToken, Signal } from "@angular/core";

/**
 * Provided by `AteEditorChassisComponent`: the editor ID that chrome resolved
 * via `injectAteEditorRef()` should default to when given no explicit
 * `[editor]` input, so content projected into a chassis targets THAT
 * chassis's own editor rather than whichever one is globally active.
 *
 * Not provided outside a chassis — `injectAteEditorRef()` falls through to
 * `AteEditorRegistry.activeEditor()` in that case, same as before.
 */
export const ATE_DEFAULT_EDITOR_ID = new InjectionToken<Signal<string | undefined>>(
  "ATE_DEFAULT_EDITOR_ID"
);
