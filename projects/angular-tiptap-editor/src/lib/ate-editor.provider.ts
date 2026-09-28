import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  APP_INITIALIZER,
  Injector,
} from "@angular/core";
import { setGlobalInjector } from "./node-view/ate-injector.registry";

import { ATE_GLOBAL_CONFIG } from "./config/ate-global-config.token";
import { AteEditorConfig } from "./models/ate-editor-config.model";
import { ATE_ICONS, AteIcons } from "./services/ate-icon-registry.service";

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

/**
 * Registers SVG icons, to override the library icons or to add icons for custom
 * toolbar items, bubble menus and slash commands. Can be called several times.
 *
 * Values are a full `<svg>` element, or only its inner markup drawn in the
 * Material Symbols viewBox (`0 -960 960 960`). Unregistered names fall back to
 * the Material Symbols font, when it is loaded.
 * @example
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideAteEditor(),
 *     provideAteIcons({
 *       format_bold: '<svg viewBox="0 0 24 24"><path d="…"/></svg>',
 *       rocket: '<path d="…"/>',
 *     })
 *   ]
 * });
 * ```
 */
export function provideAteIcons(icons: AteIcons): EnvironmentProviders {
  return makeEnvironmentProviders([{ provide: ATE_ICONS, useValue: icons, multi: true }]);
}
