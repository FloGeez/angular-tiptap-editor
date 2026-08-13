import { Directive, input, output, viewChild, computed } from "@angular/core";
import { Editor, EditorOptions, Extension, Node, Mark, JSONContent } from "@tiptap/core";

import { AteEditorCoreComponent } from "../editor-core/ate-editor-core.component";
import { AteStateCalculator } from "../../models/ate-editor-state.model";
import {
  AteBlockControlsMode,
  AteAngularNode,
  AteAutofocusMode,
  AteEditorCoreConfig,
} from "../../models/ate-editor-config.model";
import {
  AteImageUploadHandler,
  AteImageUploadOptions,
  AteImageUploadResult,
} from "../../models/ate-image.model";

/**
 * Shared surface between `AteEditorChassisComponent` and `AteEditorBrutComponent`:
 * every input/output `AteEditorCoreComponent` accepts, plus the computed signals
 * and public methods delegating to it. The two concrete components differ only
 * in their template (content projection or not) and providers (the chassis
 * auto-scoping token, or nothing).
 */
@Directive()
export abstract class AteEditorHostBase {
  content = input<string>("");
  config = input<AteEditorCoreConfig>({});
  editable = input<boolean | undefined>(undefined);
  placeholder = input<string | undefined>(undefined);
  autofocus = input<AteAutofocusMode | undefined>(undefined);
  spellcheck = input<boolean | undefined>(undefined);
  enableOfficePaste = input<boolean | undefined>(undefined);
  blockControls = input<AteBlockControlsMode | undefined>(undefined);
  showCharacterCount = input<boolean | undefined>(undefined);
  showWordCount = input<boolean | undefined>(undefined);
  maxCharacters = input<number | undefined>(undefined);
  angularNodes = input<AteAngularNode[] | undefined>(undefined);
  tiptapExtensions = input<(Extension | Node | Mark)[] | undefined>(undefined);
  tiptapOptions = input<Partial<EditorOptions> | undefined>(undefined);
  stateCalculators = input<AteStateCalculator[] | undefined>(undefined);
  imageUpload = input<AteImageUploadOptions | undefined>(undefined);
  imageUploadHandler = input<AteImageUploadHandler | undefined>(undefined);
  editorId = input<string | undefined>(undefined);
  ariaLabel = input<string | undefined>(undefined);
  ignoreEmptyContentSync = input<boolean>(false);

  contentChange = output<string>();
  editorCreated = output<Editor>();
  editorUpdate = output<{ editor: Editor; transaction: unknown }>();
  editorFocus = output<{ editor: Editor; event: FocusEvent }>();
  editorBlur = output<{ editor: Editor; event: FocusEvent }>();
  imageUploaded = output<AteImageUploadResult>();

  protected coreRef = viewChild.required(AteEditorCoreComponent);

  readonly editor = computed(() => this.coreRef().editor());
  readonly hoveredBlock = computed(() => this.coreRef().hoveredBlock());
  readonly characterCount = computed(() => this.coreRef().characterCount());
  readonly wordCount = computed(() => this.coreRef().wordCount());
  readonly editorFullyInitialized = computed(() => this.coreRef().editorFullyInitialized());
  readonly isDragOver = computed(() => this.coreRef().isDragOver());
  readonly editorState = computed(() => this.coreRef().editorCommandsService.editorState());

  /**
   * Advanced escape hatch: direct access to the underlying `AteEditorCommandsService`
   * instance shared with everything projected inside this chassis (same as
   * `AteEditorCoreComponent.editorCommandsService`).
   */
  readonly editorCommandsService = computed(() => this.coreRef().editorCommandsService);
  readonly registeredId = computed(() => this.coreRef().registeredId());

  getHTML(): string {
    return this.coreRef().getHTML();
  }

  getJSON(): JSONContent | undefined {
    return this.coreRef().getJSON();
  }

  getText(): string {
    return this.coreRef().getText();
  }

  setContent(content: string, emitUpdate = true) {
    this.coreRef().setContent(content, emitUpdate);
  }

  focus() {
    this.coreRef().focus();
  }

  blur() {
    this.coreRef().blur();
  }

  clearContent() {
    this.coreRef().clearContent();
  }

  getEditor(): Editor | null {
    return this.coreRef().getEditor();
  }
}
