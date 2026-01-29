import { Injector } from "@angular/core";

/**
 * Internal registry to store the root injector for the editor.
 * This allows registerAngularComponent to work without explicitly passing the injector.
 * @internal
 */
let globalInjector: Injector | null = null;

export function setGlobalInjector(injector: Injector): void {
  globalInjector = injector;
}

export function getGlobalInjector(): Injector {
  if (!globalInjector) {
    throw new Error(
      "[ATE] Global Injector not found. Make sure to call provideAteEditor() in your app.config.ts or main.ts."
    );
  }
  return globalInjector;
}
