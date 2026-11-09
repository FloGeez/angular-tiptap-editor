import { Extension } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";

/**
 * Style properties kept on each node type, as CSS properties or prefixes of their longhands
 * (`margin` keeps `margin-top`, `margin-inline-start`...). Only what the editor has no own
 * attribute for: text alignment, colors on text, fonts and sizes are handled elsewhere.
 */
const BOX = ["margin", "padding", "border", "background-color"];
const TEXT_BLOCK = [...BOX, "line-height", "text-indent"];
const LIST = ["margin", "padding", "list-style-type"];

export const ATE_SOURCE_STYLES: Record<string, string[]> = {
  paragraph: TEXT_BLOCK,
  heading: TEXT_BLOCK,
  blockquote: TEXT_BLOCK,
  bulletList: LIST,
  orderedList: LIST,
  listItem: LIST,
  // No width: the table takes it from its columns
  table: ["margin", "border", "background-color"],
  tableRow: ["height", "background-color"],
  tableCell: ["padding", "border", "background-color", "vertical-align", "height"],
  tableHeader: ["padding", "border", "background-color", "vertical-align", "height"],
};

/** The elements that can carry the styles above once parsed */
const BLOCK_ELEMENTS = "p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, li, table, tr, td, th";

const ALL_SOURCE_STYLES = Array.from(new Set(Object.values(ATE_SOURCE_STYLES).flat()));

const matches = (property: string, allowed: string[]) =>
  allowed.some(name => property === name || property.startsWith(name + "-"));

/**
 * The properties of `style` listed in `allowed`, with their values. The longhands, then the names
 * themselves: Firefox lists `vertical-align` as its `baseline-*` longhands only.
 */
function sourceProperties(style: CSSStyleDeclaration, allowed: string[]): [string, string][] {
  const properties: [string, string][] = [];
  for (const property of Array.from(style)) {
    if (matches(property, allowed)) {
      properties.push([property, style.getPropertyValue(property)]);
    }
  }
  allowed.forEach(name => {
    const value = style.getPropertyValue(name);
    if (value) {
      properties.push([name, value]);
    }
  });
  return properties;
}

/** The properties of `style` listed in `allowed`, as a style attribute, or null when there are none */
export function pickSourceStyles(style: CSSStyleDeclaration, allowed: string[]): string | null {
  const kept = document.createElement("div").style;
  sourceProperties(style, allowed).forEach(([property, value]) =>
    kept.setProperty(property, value, style.getPropertyPriority(property))
  );
  return kept.cssText || null;
}

/** Removes the block styles (spacing, borders, backgrounds of blocks and cells) from pasted HTML */
export function stripSourceStyles(content: DocumentFragment): void {
  content.querySelectorAll<HTMLElement>(BLOCK_ELEMENTS).forEach(element => {
    sourceProperties(element.style, ALL_SOURCE_STYLES).forEach(([property]) =>
      element.style.removeProperty(property)
    );
    if (!element.getAttribute("style")?.trim()) {
      element.removeAttribute("style");
    }
    if (element.matches("td, th")) {
      element.removeAttribute("valign");
    }
  });
}

const PX_PER_UNIT: Record<string, number> = {
  px: 1,
  pt: 4 / 3,
  pc: 16,
  in: 96,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
};

/** A CSS length in pixels, null for other units (%, auto) */
function toPixels(value: string): number | null {
  const match = /^([\d.]+)\s*([a-z]*)$/i.exec(value.trim());
  if (!match) {
    return null;
  }
  const ratio = PX_PER_UNIT[match[2].toLowerCase() || "px"];
  return ratio ? Math.round(parseFloat(match[1]) * ratio) : null;
}

/**
 * Turns the table attributes of other apps into what the editor reads: `valign` becomes
 * `vertical-align`, and the width of a cell (`width` attribute or style, as Word sets them)
 * becomes its column width, unless the table gives its columns a width.
 */
export function prepareSourceStyles(content: DocumentFragment): void {
  content.querySelectorAll<HTMLElement>("td, th").forEach(cell => {
    const valign = cell.getAttribute("valign");
    if (valign && !cell.style.verticalAlign) {
      cell.style.verticalAlign = valign;
    }
    cell.removeAttribute("valign");
    if (cell.hasAttribute("colwidth") || (Number(cell.getAttribute("colspan")) || 1) > 1) {
      return;
    }
    const width = toPixels(cell.style.width || cell.getAttribute("width") || "");
    if (width) {
      cell.setAttribute("colwidth", String(width));
    }
  });
}

/** The widths of the columns a `<colgroup>` sets, null for a column without one */
function colgroupWidths(table: HTMLTableElement): (number | null)[] {
  const widths: (number | null)[] = [];
  table.querySelectorAll<HTMLTableColElement>(":scope > colgroup > col").forEach(col => {
    const width = toPixels(col.getAttribute("width") || col.style.width || "");
    for (let i = 0; i < Math.max(1, col.span || 1); i++) {
      widths.push(width);
    }
  });
  return widths;
}

/**
 * Gives each cell the widths of the `<colgroup>` columns it covers. Tiptap reads them by the
 * position of the cell in its row, which is another column as soon as a cell spans several rows or
 * columns: in Google Docs tables with merged cells, every column got the width of another one.
 */
export function prepareColumnWidths(content: DocumentFragment): void {
  content.querySelectorAll<HTMLTableElement>("table").forEach(table => {
    const widths = colgroupWidths(table);
    if (!widths.some(width => width)) {
      return;
    }
    // Columns taken by cells of the rows above that span down to this one
    const taken: number[][] = [];
    Array.from(table.rows).forEach((row, rowIndex) => {
      let column = 0;
      Array.from(row.cells).forEach(cell => {
        while (taken[rowIndex]?.includes(column)) {
          column++;
        }
        const colspan = Math.max(1, cell.colSpan || 1);
        const rowspan = Math.max(1, cell.rowSpan || 1);
        for (let r = rowIndex; r < rowIndex + rowspan; r++) {
          for (let c = column; c < column + colspan; c++) {
            (taken[r] ??= []).push(c);
          }
        }
        const spanned = widths.slice(column, column + colspan);
        if (
          !cell.hasAttribute("colwidth") &&
          spanned.length === colspan &&
          spanned.every(Boolean)
        ) {
          cell.setAttribute("colwidth", spanned.join(","));
        }
        column += colspan;
      });
    });
  });
}

/**
 * A paragraph that only holds images becomes these images: images are blocks in the editor, so
 * the paragraph would stay behind, empty, above them. Its alignment goes to the images.
 */
export function unwrapImageParagraphs(content: DocumentFragment): void {
  content.querySelectorAll<HTMLElement>("p").forEach(paragraph => {
    const images = Array.from(paragraph.children);
    if (
      !images.length ||
      images.some(child => child.tagName !== "IMG") ||
      paragraph.textContent?.trim()
    ) {
      return;
    }
    const align = paragraph.style.textAlign;
    images.forEach(image => {
      if (align && !(image as HTMLElement).style.textAlign) {
        (image as HTMLElement).style.textAlign = align;
      }
    });
    paragraph.replaceWith(...images);
  });
}

/**
 * Word sets the spacing of its paragraphs and tables in a stylesheet (`p.MsoNormal`...) that
 * stays behind on paste: its rules become inline styles, under the inline styles already there.
 * Only the properties the editor keeps are copied. Runs on the HTML as copied, before the Office
 * cleanup removes the classes.
 */
export function inlineOfficeClassStyles(html: string): string {
  if (!/<style/i.test(html) || typeof CSSStyleSheet === "undefined") {
    return html;
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const sheet = new CSSStyleSheet();
  try {
    sheet.replaceSync(
      Array.from(doc.querySelectorAll("style"))
        .map(style => style.textContent ?? "")
        .join("\n")
    );
  } catch {
    return html;
  }
  const inherited = new Map<HTMLElement, Map<string, string>>();
  Array.from(sheet.cssRules).forEach(rule => {
    if (!(rule instanceof CSSStyleRule)) {
      return;
    }
    let elements: HTMLElement[];
    try {
      elements = Array.from(doc.body.querySelectorAll<HTMLElement>(rule.selectorText));
    } catch {
      return;
    }
    elements.forEach(element => {
      const styles = inherited.get(element) ?? new Map<string, string>();
      sourceProperties(rule.style, ALL_SOURCE_STYLES).forEach(([property, value]) =>
        styles.set(property, value)
      );
      inherited.set(element, styles);
    });
  });
  if (!inherited.size) {
    return html;
  }
  inherited.forEach((styles, element) => {
    styles.forEach((value, property) => {
      if (!element.style.getPropertyValue(property)) {
        element.style.setProperty(property, value);
      }
    });
  });
  return doc.documentElement.outerHTML;
}

/**
 * Keeps the spacing, borders and backgrounds of paragraphs, headings, quotes, lists, tables and
 * cells, as a filtered `style` attribute (see `ATE_SOURCE_STYLES`): HTML from Google Docs, Word or
 * another editor keeps its layout, and `getHTML()` gives it back. Inline styles outweigh the
 * editor's content styles, so the content looks as in its source.
 */
export const AteSourceStyles = Extension.create({
  name: "ateSourceStyles",

  addGlobalAttributes() {
    return Object.entries(ATE_SOURCE_STYLES).map(([type, allowed]) => ({
      types: [type],
      attributes: {
        // Named `style`: the table node view applies `node.attrs.style` to the table
        style: {
          default: null,
          parseHTML: (element: HTMLElement) => pickSourceStyles(element.style, allowed),
          renderHTML: (attributes: Record<string, unknown>) =>
            attributes["style"] ? { style: attributes["style"] } : {},
        },
      },
    }));
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("ateSourceStyles"),
        props: {
          // A paste opens its first paragraph so that it joins the one at the cursor, which keeps
          // the attributes of the paragraph at the cursor. Into an empty paragraph, the pasted one
          // replaces it instead, with its own styles and alignment.
          transformPasted: (slice, view) => {
            const { $from, empty } = view.state.selection;
            const first = slice.content.firstChild;
            const styled = first?.isTextblock && (first.attrs["style"] || first.attrs["textAlign"]);
            if (!empty || !styled || slice.openStart === 0 || $from.parent.content.size > 0) {
              return slice;
            }
            return new Slice(slice.content, 0, slice.openEnd);
          },
        },
      }),
    ];
  },
});
