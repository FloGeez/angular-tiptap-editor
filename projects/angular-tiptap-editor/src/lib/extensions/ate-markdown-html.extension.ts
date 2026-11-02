import { JSONContent } from "@tiptap/core";
import { Heading, HeadingOptions } from "@tiptap/extension-heading";
import { Paragraph, ParagraphOptions } from "@tiptap/extension-paragraph";
import { DOMSerializer, Schema } from "@tiptap/pm/model";

/**
 * Markdown has no syntax for alignment, superscript, subscript, text colors or colored highlights.
 * A paragraph or heading using any of them is written as HTML, which `@tiptap/markdown` reads back
 * through the `parseHTML` rules and other Markdown renderers display. The whole block is written as
 * HTML because Markdown inside an HTML tag is not parsed: `<sup>**x**</sup>` would lose its bold.
 */
export interface AteMarkdownHtmlOptions {
  /** Schema of the editor, to serialize a block as HTML. Without it, blocks stay plain Markdown */
  schema: () => Schema | null | undefined;
}

const MARKS_WITHOUT_SYNTAX = new Set(["superscript", "subscript"]);
/** Marks with a Markdown syntax for themselves but not for their attributes (a highlight color) */
const MARKS_WITHOUT_SYNTAX_FOR_ATTRS = new Set(["highlight", "textStyle"]);

const hasValue = (value: unknown) => value !== null && value !== undefined && value !== "";

function hasMarkWithoutSyntax(node: JSONContent): boolean {
  const marks = node.marks ?? [];
  return (
    marks.some(
      mark =>
        MARKS_WITHOUT_SYNTAX.has(mark.type) ||
        (MARKS_WITHOUT_SYNTAX_FOR_ATTRS.has(mark.type) &&
          Object.values(mark.attrs ?? {}).some(hasValue))
    ) || (node.content ?? []).some(hasMarkWithoutSyntax)
  );
}

export function ateNeedsMarkdownHtml(node: JSONContent): boolean {
  return hasValue(node.attrs?.["textAlign"]) || hasMarkWithoutSyntax(node);
}

export function ateNodeToHtml(schema: Schema, node: JSONContent): string {
  const container = document.createElement("div");
  container.appendChild(DOMSerializer.fromSchema(schema).serializeNode(schema.nodeFromJSON(node)));
  return container.innerHTML;
}

export const AteParagraph = Paragraph.extend<ParagraphOptions & AteMarkdownHtmlOptions>({
  addOptions() {
    return {
      ...this.parent!(),
      schema: () => null,
    };
  },

  renderMarkdown(node, helpers, ctx) {
    const schema = this.options.schema();
    if (schema && ateNeedsMarkdownHtml(node)) {
      return ateNodeToHtml(schema, node);
    }
    return this.parent?.(node, helpers, ctx) ?? "";
  },
});

export const AteHeading = Heading.extend<HeadingOptions & AteMarkdownHtmlOptions>({
  addOptions() {
    return {
      ...this.parent!(),
      schema: () => null,
    };
  },

  renderMarkdown(node, helpers, ctx) {
    const schema = this.options.schema();
    if (schema && ateNeedsMarkdownHtml(node)) {
      return ateNodeToHtml(schema, node);
    }
    return this.parent?.(node, helpers, ctx) ?? "";
  },
});
