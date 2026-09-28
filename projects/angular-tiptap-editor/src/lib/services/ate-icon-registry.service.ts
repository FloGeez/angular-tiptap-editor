import { Injectable, InjectionToken, inject, signal } from "@angular/core";
import { ATE_DEFAULT_ICONS, ATE_MATERIAL_SYMBOLS_VIEWBOX } from "../icons/ate-default-icons";

/**
 * Icons keyed by name. Each value is SVG markup:
 * - a full `<svg>` element (any viewBox), used as-is;
 * - or only its inner markup (`<path d="…"/>`), drawn in the Material Symbols viewBox (`0 -960 960 960`).
 *
 * Icons are sized with `1em` and painted with `currentColor`.
 */
export type AteIcons = Record<string, string>;

/**
 * Injection Token for the icons registered with `provideAteIcons()`.
 */
export const ATE_ICONS = new InjectionToken<AteIcons[]>("ATE_ICONS");

/**
 * A root-level registry resolving icon names to SVG markup.
 *
 * The library ships the SVG of every icon it uses, so the Material Symbols font is not required.
 * Names that are not registered fall back to the Material Symbols font ligature: load the font
 * to use any Material Symbols name in custom toolbar items, bubble menus or slash commands.
 */
@Injectable({
  providedIn: "root",
})
export class AteIconRegistry {
  private readonly _icons = signal<AteIcons>(
    Object.assign({}, ATE_DEFAULT_ICONS, ...(inject(ATE_ICONS, { optional: true }) ?? []))
  );

  /**
   * Register or override icons at runtime.
   */
  register(icons: AteIcons): void {
    this._icons.update(current => ({ ...current, ...icons }));
  }

  /**
   * Full SVG markup of an icon, or null when it is not registered.
   * Reactive when called inside a computed or an effect.
   */
  svg(name: string): string | null {
    const icon = this._icons()[name];
    if (!icon) {
      return null;
    }
    return icon.trimStart().startsWith("<svg")
      ? icon
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ATE_MATERIAL_SYMBOLS_VIEWBOX}">${icon}</svg>`;
  }

  /**
   * Markup drawing an icon: its SVG, or the Material Symbols font ligature when it is not registered.
   */
  markup(name: string): string {
    return this.svg(name) ?? `<span class="material-symbols-outlined">${escapeHtml(name)}</span>`;
  }

  /**
   * HTML of an icon for contexts outside Angular templates (ProseMirror widgets, raw HTML).
   */
  html(name: string, className = ""): string {
    const classes = escapeHtml(`ate-icon ${className}`.trim());
    return `<span class="${classes}" aria-hidden="true">${this.markup(name)}</span>`;
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!
  );
}
