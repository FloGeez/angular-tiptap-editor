import { Editor, Extension } from "@tiptap/core";
import { Fragment, Node as ProseMirrorNode, Slice } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { AteImageValidationError, AtePastedImageRejection } from "../models/ate-image.model";

const IMAGE_NODE_NAMES = new Set(["resizableImage", "image"]);
const REMOTE_SRC = /^(https?:)?\/\//i;
const INLINE_SRC = /^data:(image\/[\w.+-]+);base64,(.*)$/is;
const PASTED_IMAGE_BASENAME = "pasted-image";

export type AtePastedImageSource = "remote" | "inline" | "unreachable";

export interface AtePastedImageOptions {
  /** Whether pasted base64 images should be sent to the upload handler */
  shouldRehost: () => boolean;
  /** Uploads a pasted base64 image and resolves to its hosted URL */
  rehost: (file: File) => Promise<string>;
  /** Called for every pasted image that could not be kept */
  onRejected: (rejection: AtePastedImageRejection) => void;
}

/**
 * Classifies the `src` of an image found in pasted HTML.
 * `unreachable` sources (e.g. `attachment:`, `file:`, `cid:`, foreign `blob:`) cannot be fetched by the page.
 */
export function classifyPastedImageSrc(
  src: string | null | undefined,
  origin: string = typeof location !== "undefined" ? location.origin : ""
): AtePastedImageSource {
  if (!src) {
    return "unreachable";
  }
  if (REMOTE_SRC.test(src) || (src.startsWith("/") && !src.startsWith("//"))) {
    return "remote";
  }
  if (origin && src.startsWith(`blob:${origin}/`)) {
    return "remote";
  }
  return INLINE_SRC.test(src) ? "inline" : "unreachable";
}

/** Decodes a base64 image data URI into a `File`, or returns `null` when it is malformed */
export function dataUriToFile(src: string): File | null {
  const match = INLINE_SRC.exec(src);
  if (!match) {
    return null;
  }
  const mimeType = match[1].toLowerCase();
  try {
    const binary = atob(match[2].replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, char => char.codePointAt(0) ?? 0);
    const extension = mimeType.split("/")[1].split("+")[0];
    return new File([bytes], `${PASTED_IMAGE_BASENAME}.${extension}`, { type: mimeType });
  } catch {
    return null;
  }
}

function isImageNode(node: ProseMirrorNode): boolean {
  return IMAGE_NODE_NAMES.has(node.type.name);
}

/** Removes unreachable images from a pasted slice and lists the base64 sources it keeps */
export function sanitizePastedImages(slice: Slice): {
  slice: Slice;
  inlineSources: string[];
  droppedSources: string[];
} {
  const inlineSources = new Set<string>();
  const droppedSources: string[] = [];

  const sanitize = (fragment: Fragment): Fragment => {
    const kept: ProseMirrorNode[] = [];
    fragment.forEach(child => {
      if (isImageNode(child)) {
        const src = child.attrs["src"] as string | null;
        const source = classifyPastedImageSrc(src);
        if (source === "unreachable") {
          droppedSources.push(src ?? "");
          return;
        }
        if (source === "inline" && src) {
          inlineSources.add(src);
        }
        kept.push(child);
        return;
      }
      kept.push(child.isLeaf ? child : child.copy(sanitize(child.content)));
    });
    return Fragment.fromArray(kept);
  };

  const content = sanitize(slice.content);
  if (!droppedSources.length) {
    return { slice, inlineSources: [...inlineSources], droppedSources };
  }
  const openStart = content.firstChild === slice.content.firstChild ? slice.openStart : 0;
  const openEnd = content.lastChild === slice.content.lastChild ? slice.openEnd : 0;
  return {
    slice: new Slice(content, openStart, openEnd),
    inlineSources: [...inlineSources],
    droppedSources,
  };
}

function replaceImageSrc(editor: Editor, previousSrc: string, nextSrc: string | null): void {
  if (editor.isDestroyed) {
    return;
  }
  const { state } = editor;
  const matches: { pos: number; node: ProseMirrorNode }[] = [];
  state.doc.descendants((node, pos) => {
    if (isImageNode(node) && node.attrs["src"] === previousSrc) {
      matches.push({ pos, node });
    }
  });
  if (!matches.length) {
    return;
  }
  const tr = state.tr;
  for (const { pos, node } of [...matches].reverse()) {
    if (nextSrc) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, src: nextSrc });
    } else {
      tr.delete(pos, pos + node.nodeSize);
    }
  }
  editor.view.dispatch(tr);
}

/**
 * Cleans images coming from pasted HTML (e.g. Notion, Google Docs, Office):
 * - drops images whose source the page cannot load, instead of inserting broken images;
 * - sends base64 images through the upload handler (when one is configured) and swaps in the hosted URL.
 *
 * File-based clipboard images keep going through the regular paste upload flow.
 */
export const AtePastedImage = Extension.create<AtePastedImageOptions>({
  name: "atePastedImage",

  addOptions() {
    return {
      shouldRehost: () => false,
      rehost: () => Promise.reject(new Error("No upload handler configured")),
      onRejected: () => undefined,
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;
    const options = this.options;

    const rehost = (src: string): void => {
      const file = dataUriToFile(src);
      if (!file) {
        replaceImageSrc(editor, src, null);
        options.onRejected({ reason: "unreachable", src });
        return;
      }
      options
        .rehost(file)
        .then(url => replaceImageSrc(editor, src, url))
        .catch((error: unknown) => {
          replaceImageSrc(editor, src, null);
          options.onRejected({
            reason: error instanceof AteImageValidationError ? error.reason : "upload-failed",
            src,
          });
        });
    };

    return [
      new Plugin({
        key: new PluginKey("atePastedImage"),
        props: {
          transformPasted: slice => {
            const { slice: sanitized, inlineSources, droppedSources } = sanitizePastedImages(slice);
            droppedSources.forEach(src => options.onRejected({ reason: "unreachable", src }));
            if (inlineSources.length && options.shouldRehost()) {
              queueMicrotask(() => inlineSources.forEach(rehost));
            }
            return sanitized;
          },
        },
      }),
    ];
  },
});
