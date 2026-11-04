import { AteFontFamily } from "../models/ate-font.model";

const normalizeFontFamily = (value: string) =>
  value
    .split(",")
    .map(name =>
      name
        .trim()
        .replace(/^["']|["']$/g, "")
        .toLowerCase()
    )
    .join(",");

/** The menu font matching a `font-family` value, compared without quotes, spaces or case */
export function findFontFamily(
  value: string | null,
  families: AteFontFamily[]
): AteFontFamily | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = normalizeFontFamily(value);
  return families.find(family => normalizeFontFamily(family.value) === normalized);
}

/**
 * Name to show for a `font-family` value: the label of the matching menu font, otherwise the first
 * font of the value (`"Calibri", sans-serif` pasted from Word shows as Calibri)
 */
export function fontFamilyLabel(value: string, families: AteFontFamily[]): string {
  return (
    findFontFamily(value, families)?.label ??
    value
      .split(",")[0]
      .trim()
      .replace(/^["']|["']$/g, "")
  );
}

const PX_PER_UNIT: Record<string, number> = { px: 1, pt: 4 / 3, pc: 16, in: 96, rem: 16, em: 16 };

/** A CSS font size in pixels (`11pt` from Word is 14.67), NaN for keywords and unknown units */
export function fontSizeToPx(value: string): number {
  const match = /^\s*(\d*\.?\d+)\s*([a-z%]*)\s*$/i.exec(value);
  if (!match) {
    return NaN;
  }
  const amount = parseFloat(match[1]);
  const unit = match[2].toLowerCase() || "px";
  if (unit === "%") {
    return (amount / 100) * 16;
  }
  return unit in PX_PER_UNIT ? amount * PX_PER_UNIT[unit] : NaN;
}

/** Smallest and largest sizes the font size controls apply, in pixels */
export const ATE_FONT_SIZE_RANGE = { min: 1, max: 400 };

/** A size brought within `ATE_FONT_SIZE_RANGE` */
export function clampFontSizePx(px: number): number {
  return Math.min(Math.max(px, ATE_FONT_SIZE_RANGE.min), ATE_FONT_SIZE_RANGE.max);
}

/** The whole size next to `px`, out of range included: 14.67 has 14 below and 15 above */
export function neighbourFontSizePx(px: number, delta: 1 | -1): number {
  return delta > 0 ? Math.floor(px) + 1 : Math.ceil(px) - 1;
}

/** The size one step larger or smaller, within `ATE_FONT_SIZE_RANGE` */
export function stepFontSizePx(px: number, delta: 1 | -1): number {
  return clampFontSizePx(neighbourFontSizePx(px, delta));
}

/** A size in px, pt, pc or in: it does not depend on the size of the surrounding text */
const ABSOLUTE_FONT_SIZE = /^\s*\d*\.?\d+\s*(px|pt|pc|in)?\s*$/i;

/**
 * Size the selection is displayed with, in pixels: its `font-size` when it is absolute, else the
 * size the browser computes. A keyword (`small`), a relative size (`0.8em`, `120%`, `1.2rem`) or a
 * `calc()` pasted from another app depends on the text around it.
 */
export function currentFontSizePx(marks: {
  fontSize: string | null;
  computedFontSize: number | null;
}): number {
  const { fontSize, computedFontSize } = marks;
  if (fontSize && ABSOLUTE_FONT_SIZE.test(fontSize)) {
    return fontSizeToPx(fontSize);
  }
  return computedFontSize ?? (fontSize ? fontSizeToPx(fontSize) : NaN);
}

/** A size in pixels as shown in the menus: no unit, at most one decimal */
export function formatFontSize(px: number): string {
  return String(Math.round(px * 10) / 10);
}
