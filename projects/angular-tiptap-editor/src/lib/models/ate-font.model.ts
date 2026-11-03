/** A font offered in the font family menu */
export interface AteFontFamily {
  /** Name shown in the menu, drawn in the font itself */
  label: string;
  /** CSS `font-family` value applied to the text, e.g. `Georgia, serif` */
  value: string;
}

/**
 * Choices of the font family and font size menus (`toolbar.fontFamily`, `toolbar.fontSize`,
 * `bubbleMenu.fontFamily`, `bubbleMenu.fontSize`). The menus also offer the editor's default font
 * and size, which remove the font family or size from the text.
 */
export interface AteFontsConfig {
  /** Fonts offered in the font family menu. Default: `ATE_DEFAULT_FONT_FAMILIES` */
  families?: AteFontFamily[];
  /**
   * Sizes offered in the font size menu, as CSS lengths (`"16px"`, `"1.5rem"`...).
   * Any other size can also be typed in the menu, in pixels. Default: `ATE_DEFAULT_FONT_SIZES`
   */
  sizes?: string[];
}
