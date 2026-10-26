import { isDevMode } from "@angular/core";
import { getStyleProperty } from "@tiptap/core";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";

const FORBIDDEN_CHARACTERS = /[;"'<>\\{}]|[^ -~]/;
const FORBIDDEN_TOKENS = /url\(|expression\(|!important|\/\*/i;
const HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NAMED_COLOR = /^[a-z]+$/i;
const COLOR_FUNCTION = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\([\d\s.,%/a-z+-]*\)$/i;
const CSS_VARIABLE = /^var\(\s*--[\w-]+\s*\)$/;

export function sanitizeCssColor(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const color = value.trim();
  if (!color || FORBIDDEN_CHARACTERS.test(color) || FORBIDDEN_TOKENS.test(color)) {
    return null;
  }
  if (typeof CSS !== "undefined" && typeof CSS.supports === "function") {
    return CSS.supports("color", color) ? color : null;
  }
  const isKnownShape =
    HEX_COLOR.test(color) ||
    NAMED_COLOR.test(color) ||
    COLOR_FUNCTION.test(color) ||
    CSS_VARIABLE.test(color);
  return isKnownShape ? color : null;
}

function warnDroppedColor(value: unknown): void {
  if (isDevMode()) {
    console.warn(`[ATE] Ignored invalid color value, it is not rendered: ${String(value)}`);
  }
}

function renderableColor(value: unknown): string | null {
  const color = sanitizeCssColor(value);
  if (color === null && value) {
    warnDroppedColor(value);
  }
  return color;
}

export const AteColor = Color.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          color: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              sanitizeCssColor(
                (getStyleProperty(element, "color") ?? element.style.color)?.replace(/['"]+/g, "")
              ),
            renderHTML: (attributes: Record<string, unknown>) => {
              const color = renderableColor(attributes["color"]);
              return color ? { style: `color: ${color}` } : {};
            },
          },
        },
      },
    ];
  },
});

export const AteHighlight = Highlight.extend({
  addAttributes() {
    if (!this.options.multicolor) {
      return {};
    }
    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          sanitizeCssColor(element.getAttribute("data-color")) ??
          sanitizeCssColor(getStyleProperty(element, "background-color")) ??
          sanitizeCssColor(element.style.backgroundColor),
        renderHTML: (attributes: Record<string, unknown>) => {
          const color = renderableColor(attributes["color"]);
          return color
            ? { "data-color": color, style: `background-color: ${color}; color: inherit` }
            : {};
        },
      },
    };
  },
});
