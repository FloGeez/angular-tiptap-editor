import { Injector, Type } from "@angular/core";
import { Extension, Node, Mark } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { Placeholder, CharacterCount } from "@tiptap/extensions";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import StarterKit from "@tiptap/starter-kit";
import OfficePaste from "@intevation/tiptap-extension-office-paste";

import { AteResizableImage } from "./ate-resizable-image.extension";
import { AteUploadProgress } from "./ate-upload-progress.extension";
import { AteTableExtension } from "./ate-table.extension";
import { AteTiptapStateExtension } from "./ate-tiptap-state.extension";
import { AteLinkClickBehavior } from "./ate-link-click-behavior.extension";
import { AteBlockControlsExtension } from "./ate-block-controls.extension";
import { AteSelectionCalculator } from "./calculators/ate-selection.calculator";
import { AteMarksCalculator } from "./calculators/ate-marks.calculator";
import { AteTableCalculator } from "./calculators/ate-table.calculator";
import { AteImageCalculator } from "./calculators/ate-image.calculator";
import { AteStructureCalculator } from "./calculators/ate-structure.calculator";
import { AteDiscoveryCalculator } from "./calculators/ate-discovery.calculator";

import { AteTocNodeOptions } from "../components/table-of-contents/ate-toc-node.component";
import { registerAngularComponent } from "../node-view/ate-register-angular-component";
import { RegisterAngularComponentOptions } from "../node-view/ate-node-view.models";
import { AteBlockControlsMode, AteAngularNode } from "../models/ate-editor-config.model";
import { AteStateCalculator, AteEditorStateSnapshot } from "../models/ate-editor-state.model";

/**
 * Configuration values needed to build the standard ATE extension set.
 * Mirrors the `final*` computed properties previously read inline by
 * `AngularTiptapEditorComponent.initEditor()`.
 */
export interface AteExtensionBuilderConfig {
  placeholder: string;
  blockControls: AteBlockControlsMode;
  enableOfficePaste: boolean;
  showCharacterCount: boolean;
  showWordCount: boolean;
  maxCharacters: number | undefined;
  angularNodes: AteAngularNode[];
  tiptapExtensions: (Extension | Node | Mark)[];
  stateCalculators: AteStateCalculator[];
}

/** External hooks/services the built extensions need to report back to. */
export interface AteExtensionBuilderDeps {
  injector: Injector;
  isUploading: () => boolean;
  uploadProgress: () => number;
  uploadMessage: () => string;
  onStateUpdate: (state: AteEditorStateSnapshot) => void;
  onBlockHover?: (data: { node: PMNode; element: HTMLElement; pos: number } | null) => void;
}

/**
 * Builds the full ATE Tiptap extension set (StarterKit, marks, image, table,
 * state tracking, optional block controls / office paste / character count,
 * auto-registered Angular node views, and user-provided custom extensions).
 *
 * Shared by `AngularTiptapEditorComponent` and `AteEditorCoreComponent` so
 * both consume the exact same extension-building logic.
 */
export function buildAteExtensions(
  config: AteExtensionBuilderConfig,
  deps: AteExtensionBuilderDeps
): (Extension | Node | Mark)[] {
  const extensions: (Extension | Node | Mark)[] = [
    StarterKit.configure({
      link: {
        openOnClick: false,
        HTMLAttributes: {
          class: "ate-link",
        },
      },
    }),
    TextStyle,
    Color.configure({
      types: ["textStyle"],
    }),
    Placeholder.configure({
      placeholder: config.placeholder,
    }),
    Superscript,
    Subscript,
    TextAlign.configure({
      types: ["heading", "paragraph", "resizableImage"],
    }),
    AteLinkClickBehavior,
    Highlight.configure({
      multicolor: true,
      HTMLAttributes: {
        class: "ate-highlight",
      },
    }),
    AteResizableImage.configure({
      inline: false,
      allowBase64: true,
      HTMLAttributes: {
        class: "ate-image",
      },
    }),
    AteUploadProgress.configure({
      isUploading: () => deps.isUploading(),
      uploadProgress: () => deps.uploadProgress(),
      uploadMessage: () => deps.uploadMessage(),
    }),
    AteTableExtension,
    registerAngularComponent(deps.injector, AteTocNodeOptions),
    AteTiptapStateExtension.configure({
      onUpdate: state => deps.onStateUpdate(state),
      calculators: [
        AteSelectionCalculator,
        AteMarksCalculator,
        AteTableCalculator,
        AteImageCalculator,
        AteStructureCalculator,
        AteDiscoveryCalculator,
        ...config.stateCalculators,
      ],
    }),
  ];

  if (config.blockControls !== "none") {
    extensions.push(
      AteBlockControlsExtension.configure({
        onHover: data => deps.onBlockHover?.(data),
      })
    );
  }

  if (config.enableOfficePaste) {
    extensions.push(
      OfficePaste.configure({
        transformPastedHTML: true,
        transformPastedText: true,
      })
    );
  }

  if (config.showCharacterCount || config.showWordCount) {
    extensions.push(
      CharacterCount.configure({
        limit: config.maxCharacters,
      })
    );
  }

  config.angularNodes.forEach((reg: AteAngularNode) => {
    const options =
      typeof reg === "function"
        ? { component: reg as Type<unknown> }
        : (reg as RegisterAngularComponentOptions<unknown>);

    try {
      const extension = registerAngularComponent(deps.injector, options);
      extensions.push(extension);
    } catch (e) {
      console.error("[ATE] Failed to auto-register node view:", e);
    }
  });

  if (config.tiptapExtensions.length > 0) {
    const existingNames = new Set(
      extensions
        .map((ext: Extension | Node | Mark) => (ext as { name?: string })?.name)
        .filter((name): name is string => !!name)
    );

    const toAdd = config.tiptapExtensions.filter((ext: Extension | Node | Mark) => {
      const name = (ext as { name?: string })?.name;
      return !name || !existingNames.has(name);
    });

    extensions.push(...toAdd);
  }

  return extensions;
}
