import { Injectable, InjectionToken, inject, signal } from "@angular/core";
import {
  ATE_DEFAULT_ICONS,
  ATE_MATERIAL_SYMBOLS_VIEWBOX,
  AteIconName,
} from "../icons/ate-default-icons";

/**
 * An icon name: a library icon (autocompleted), a custom registered icon,
 * or any Material Symbols name rendered with the font.
 */
export type AteIconKey = AteIconName | (string & {});

/**
 * Icons keyed by name. Library icons are keyed by what they do (`bold`, `addRowBefore`…).
 * Each value is SVG markup:
 * - a full `<svg>` element (any viewBox), used as-is: it keeps its own `fill` and `stroke`
 *   (use `currentColor` in them to follow the text color, e.g. stroke icons like Lucide);
 * - or only its inner markup (`<path d="…"/>`), drawn in the Material Symbols viewBox
 *   (`0 -960 960 960`) and filled with `currentColor`.
 *
 * Icons are sized with `1em`.
 */
export type AteIcons = Partial<Record<AteIconName, string>> & Record<string, string>;

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
  private readonly _icons = signal<Record<string, string>>(
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
  svg(name: AteIconKey): string | null {
    const icon = this._icons()[name];
    if (!icon) {
      return null;
    }
    return icon.trimStart().startsWith("<svg")
      ? icon
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ATE_MATERIAL_SYMBOLS_VIEWBOX}" fill="currentColor">${icon}</svg>`;
  }

  /**
   * Markup drawing an icon: its SVG, or the Material Symbols font ligature when it is not registered.
   */
  markup(name: AteIconKey): string {
    return this.svg(name) ?? `<span class="material-symbols-outlined">${escapeHtml(name)}</span>`;
  }

  /**
   * HTML of an icon for contexts outside Angular templates (ProseMirror widgets, raw HTML).
   */
  html(name: AteIconKey, className = ""): string {
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
