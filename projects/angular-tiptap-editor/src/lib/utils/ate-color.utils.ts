/**
 * Normalizes color values (rgb/rgba to hex).
 */
export function normalizeColor(color: string | null | undefined): string | null {
  if (!color || color === "transparent" || color === "rgba(0, 0, 0, 0)") {
    return null;
  }
  if (color.startsWith("#")) {
    return color;
  }

  // Support both comma-separated (legacy) and space-separated (modern) rgb/rgba
  const rgbMatch = color
    .trim()
    .match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i);

  // If it's a named color or something else we don't recognize,
  // we can't easily normalize it to hex without a heavy dictionary.
  // However, getComputedStyle usually returns rgb() which we handle above.
  if (!rgbMatch) {
    // Simple fallback for common named colors if getComputedStyle fails to return rgb
    const named: Record<string, string> = { black: "#000000", white: "#ffffff", red: "#ff0000" };
    if (named[color.toLowerCase()]) {
      return named[color.toLowerCase()]!;
    }
    return null;
  }

  const r = Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[1]!))));
  const g = Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[2]!))));
  const b = Math.max(0, Math.min(255, Math.round(parseFloat(rgbMatch[3]!))));
  const a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;

  // If completely transparent, return null
  if (a === 0) {
    return null;
  }

  return (
    "#" +
    [r, g, b]
      .map(n => n.toString(16).padStart(2, "0"))
      .join("")
      .toLowerCase()
  );
}

/**
 * Calculate luminance (0-255).
 */
export function getLuminance(color: string | null | undefined): number {
  const normalized = normalizeColor(color);
  if (!normalized) {
    return 0;
  } // Default to dark (luminance 0) if no color
  const hex = normalized.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}

/**
 * Returns contrast color for readability.
 */
export function getContrastColor(color: string): "black" | "white" {
  return getLuminance(color) > 128 ? "black" : "white";
}
