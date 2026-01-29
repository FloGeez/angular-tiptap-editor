import { Injector } from "@angular/core";
import { Node } from "@tiptap/core";
import { RegisterAngularComponentOptions } from "./ate-node-view.models";
import { createAngularComponentExtension } from "./ate-node-view.factory";
import { getGlobalInjector } from "./ate-injector.registry";

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
 * @param injectorOrOptions - The Angular Injector OR the configuration options
 * @param maybeOptions - Configuration options (if the first param was an injector)
 * @returns A TipTap Node extension ready to be used
 *
 * @example
 * ```typescript
 * // Modern way (requires provideAteEditor())
 * registerAngularComponent({
 *   component: MyComponent,
 *   name: 'myComponent'
 * });
 *
 * // Classic way
 * registerAngularComponent(injector, {
 *   component: MyComponent
 * });
 * ```
 */
export function registerAngularComponent<T = unknown>(
  injectorOrOptions: Injector | RegisterAngularComponentOptions<T>,
  maybeOptions?: RegisterAngularComponentOptions<T>
): Node {
  let injector: Injector;
  let options: RegisterAngularComponentOptions<T>;

  // Duck-typing check: Injectors have a 'get' method
  const isInjector = (obj: unknown): obj is Injector =>
    obj !== null && typeof obj === "object" && typeof (obj as Injector).get === "function";

  if (isInjector(injectorOrOptions)) {
    injector = injectorOrOptions;
    options = maybeOptions!;
  } else {
    injector = getGlobalInjector();
    options = injectorOrOptions as RegisterAngularComponentOptions<T>;
  }

  return createAngularComponentExtension(injector, options);
}
