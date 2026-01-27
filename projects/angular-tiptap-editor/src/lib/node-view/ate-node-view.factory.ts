import { Injector, Type } from "@angular/core";
import { Node, mergeAttributes } from "@tiptap/core";
import { AteAngularNodeView } from "./ate-angular-node-view";
import { RegisterAngularComponentOptions } from "./ate-node-view.models";
import { AteNodeViewRenderer } from "./ate-node-view.renderer";

const RESERVED_NAMES = [
  "doc",
  "paragraph",
  "text",
  "hardBreak",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "heading",
  "horizontalRule",
];

/**
 * Derives the TipTap node name and HTML tag from a component class.
 */
function deriveMetadata(component: Type<unknown>, customName?: string) {
  let nodeName = customName;

  if (!nodeName) {
    nodeName = component.name
      .replace(/Component$/, "")
      .replace(/Node$/, "")
      .replace(/^([A-Z])/, m => m.toLowerCase());

    console.warn(
      `[ATE] Auto-deriving node name '${nodeName}' for component ${component.name}. ` +
        `Provide an explicit 'name' in options to avoid potential naming collisions.`
    );
  }

  if (RESERVED_NAMES.includes(nodeName)) {
    throw new Error(
      `[ATE] The name '${nodeName}' is a reserved TipTap node name. ` +
        `Please provide a unique name for your custom component.`
    );
  }

  const tag = nodeName.toLowerCase().replace(/([A-Z])/g, "-$1");
  return { nodeName, tag };
}

/**
 * Creates TipTap attributes from component inputs (Standard Mode).
 */
function createStandardAttributes(defaultInputs: Record<string, unknown> = {}) {
  const tiptapAttributes: Record<string, unknown> = {};

  Object.entries(defaultInputs).forEach(([key, defaultValue]) => {
    tiptapAttributes[key] = {
      default: defaultValue,
      parseHTML: (element: HTMLElement) => {
        const attr = element.getAttribute(`data-${key}`);
        if (attr === null) {
          return defaultValue;
        }
        try {
          return JSON.parse(attr);
        } catch {
          return attr;
        }
      },
      renderHTML: (attrs: Record<string, unknown>) => {
        const value = attrs[key];
        if (value === undefined || value === null) {
          return {};
        }
        const serialized = typeof value === "object" ? JSON.stringify(value) : String(value);
        return { [`data-${key}`]: serialized };
      },
    };
  });

  return tiptapAttributes;
}

/**
 * Factory to transform an Angular component into a TipTap Node extension.
 * Supports both "TipTap-Aware" and "Standard" modes.
 *
 * @internal
 */
export function createAngularComponentExtension<T = unknown>(
  injector: Injector,
  options: RegisterAngularComponentOptions<T>
): Node {
  const {
    component,
    name: customName,
    attributes,
    defaultInputs,
    contentSelector,
    contentMode = "block",
    editableContent = false,
    group = "block",
    draggable = true,
    ignoreMutation = true,
    onOutput,
    HTMLAttributes = {},
    parseHTML: customParseHTML,
    renderHTML: customRenderHTML,
  } = options;

  const { nodeName, tag } = deriveMetadata(component, customName);
  const isTipTapAware = Object.prototype.isPrototypeOf.call(AteAngularNodeView, component);
  const atom = !editableContent;

  // 1. Prepare Attributes
  const tiptapAttributes = isTipTapAware
    ? attributes || {}
    : createStandardAttributes(defaultInputs);

  // 2. Create Node Extension
  return Node.create({
    name: nodeName,
    group,
    inline: group === "inline",
    atom,
    draggable,
    content: editableContent ? (contentMode === "inline" ? "inline*" : "block*") : undefined,

    addAttributes() {
      return tiptapAttributes;
    },

    parseHTML() {
      if (customParseHTML) {
        return customParseHTML.call(this);
      }
      return [{ tag }, { tag: `div[data-component="${nodeName}"]` }];
    },

    renderHTML({ node, HTMLAttributes: attrs }) {
      if (customRenderHTML) {
        return customRenderHTML.call(this, { node, HTMLAttributes: attrs });
      }
      return [tag, mergeAttributes(HTMLAttributes, attrs, { "data-component": nodeName })];
    },

    addNodeView() {
      return AteNodeViewRenderer(component, {
        injector,
        inputs: defaultInputs,
        wrapperTag: group === "inline" ? "span" : "div",
        wrapperClass: isTipTapAware
          ? `ate-node-${nodeName}`
          : `embedded-component embedded-${nodeName}`,
        atom,
        editableContent,
        contentSelector,
        contentMode,
        onOutput,
        ignoreMutation,
      });
    },
  });
}
