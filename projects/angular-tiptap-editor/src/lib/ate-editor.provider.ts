import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  APP_INITIALIZER,
  Injector,
} from "@angular/core";
import { setGlobalInjector } from "./node-view/ate-injector.registry";

import { ATE_GLOBAL_CONFIG } from "./config/ate-global-config.token";
import { AteEditorConfig } from "./models/ate-editor-config.model";

/**
 * Provides the necessary configuration and initialization for the Angular TipTap Editor.
 * This should be called in your app.config.ts (for standalone) or main.ts.
 *
 * This provider is essential for 'Angular Nodes' to work correctly, as it captures the
 * root Injector required to instantiate custom Angular components within the editor.
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideAteEditor({
 *       theme: 'dark',
 *       mode: 'seamless'
 *     })
 *   ]
 * });
 * ```
 */
export function provideAteEditor(config?: AteEditorConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: ATE_GLOBAL_CONFIG,
      useValue: config || {},
    },
    {
      provide: APP_INITIALIZER,
      useFactory: (injector: Injector) => () => {
        setGlobalInjector(injector);
      },
      deps: [Injector],
      multi: true,
    },
  ]);
}
