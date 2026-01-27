import { Injector } from "@angular/core";
import { Node } from "@tiptap/core";
import { RegisterAngularComponentOptions } from "./ate-node-view.models";
import { createAngularComponentExtension } from "./ate-node-view.factory";

/**
 * Registers ANY Angular component as a TipTap node extension.
 *
 * This function is the single public entry point for adding custom components.
 * It supports two distinct modes:
 *
 * 1. **TipTap-Aware Mode** (the component extends `AteAngularNodeView`):
 *    Grants direct access to the TipTap API (`editor`, `node`, `updateAttributes`, etc.) within the component.
 *
 * 2. **Standard Mode** (library or legacy components):
 *    Allows using any existing Angular component. Its `@Input()` properties are automatically
 *    synchronized with TipTap node attributes.
 *
 * @param injector - The Angular Injector (obtained via `inject(Injector)`)
 * @param options - Configuration options for the component extension
 * @returns A TipTap Node extension ready to be used
 *
 * @example
 * ```typescript
 * registerAngularComponent(injector, {
 *   component: MyComponent,
 *   name: 'myComponent',
 *   defaultInputs: { color: 'blue' }
 * });
 * ```
 */
export function registerAngularComponent<T = unknown>(
  injector: Injector,
  options: RegisterAngularComponentOptions<T>
): Node {
  return createAngularComponentExtension(injector, options);
}
