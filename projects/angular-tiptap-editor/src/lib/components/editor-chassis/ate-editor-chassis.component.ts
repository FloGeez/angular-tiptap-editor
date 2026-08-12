import { Component, input, output, viewChild, computed, ChangeDetectionStrategy } from "@angular/core";
import { Editor, EditorOptions, Extension, Node, Mark, JSONContent } from "@tiptap/core";

import { AteEditorCoreComponent } from "../editor-core/ate-editor-core.component";
import { ATE_EDITOR_PROVIDERS } from "../../config/ate-editor-providers.config";
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
 * Public, zero-ceremony entry point for composing your own editor: a Root
 * compound component that provides `ATE_EDITOR_PROVIDERS` itself and hosts
 * `AteEditorCoreComponent` internally, so any UI chrome you project inside
 * (`ate-toolbar`, `ate-bubble-menu`, `ate-block-controls`, ...) shares the
 * same editor state without any manual DI wiring.
 *
 * @example Bare editor, no chrome
 * ```html
 * <ate-editor-chassis [content]="content" (contentChange)="content = $event" />
 * ```
 *
 * @example With a toolbar
 * ```html
 * <ate-editor-chassis #chassis="ateEditorChassis" [content]="content">
 *   <ate-toolbar />
 *   <ate-block-controls [editor]="chassis.editor()!" [hoveredData]="chassis.hoveredBlock()" />
 * </ate-editor-chassis>
 * ```
 *
 * `<ate-toolbar>` is always projected before the editable content, no matter
 * where it's written; everything else (bubble menus, slash commands, block
 * controls, custom content) is projected after it.
 *
 * For full control over providers/composition, use `AteEditorCoreComponent`
 * (`[ateEditorCore]`) directly instead.
 */
@Component({
  selector: "ate-editor-chassis",
  exportAs: "ateEditorChassis",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: ATE_EDITOR_PROVIDERS,
  imports: [AteEditorCoreComponent],
  template: `
    <ng-content select="ate-toolbar"></ng-content>
    <!-- eslint-disable @angular-eslint/template/no-autofocus -- [autofocus] binds AteEditorCoreComponent's typed input, not the native HTML attribute -->
    <div
      ateEditorCore
      [content]="content()"
      [config]="config()"
      [editable]="editable()"
      [placeholder]="placeholder()"
      [autofocus]="autofocus()"
      [spellcheck]="spellcheck()"
      [enableOfficePaste]="enableOfficePaste()"
      [blockControls]="blockControls()"
      [showCharacterCount]="showCharacterCount()"
      [showWordCount]="showWordCount()"
      [maxCharacters]="maxCharacters()"
      [angularNodes]="angularNodes()"
      [tiptapExtensions]="tiptapExtensions()"
      [tiptapOptions]="tiptapOptions()"
      [stateCalculators]="stateCalculators()"
      [imageUpload]="imageUpload()"
      [imageUploadHandler]="imageUploadHandler()"
      [editorId]="editorId()"
      [ignoreEmptyContentSync]="ignoreEmptyContentSync()"
      (contentChange)="contentChange.emit($event)"
      (editorCreated)="editorCreated.emit($event)"
      (editorUpdate)="editorUpdate.emit($event)"
      (editorFocus)="editorFocus.emit($event)"
      (editorBlur)="editorBlur.emit($event)"
      (imageUploaded)="imageUploaded.emit($event)"></div>
    <!-- eslint-enable @angular-eslint/template/no-autofocus -->
    <ng-content></ng-content>
  `,
})
export class AteEditorChassisComponent {
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
  ignoreEmptyContentSync = input<boolean>(false);

  contentChange = output<string>();
  editorCreated = output<Editor>();
  editorUpdate = output<{ editor: Editor; transaction: unknown }>();
  editorFocus = output<{ editor: Editor; event: FocusEvent }>();
  editorBlur = output<{ editor: Editor; event: FocusEvent }>();
  imageUploaded = output<AteImageUploadResult>();

  private coreRef = viewChild.required(AteEditorCoreComponent);

  readonly editor = computed(() => this.coreRef().editor());
  readonly hoveredBlock = computed(() => this.coreRef().hoveredBlock());
  readonly characterCount = computed(() => this.coreRef().characterCount());
  readonly wordCount = computed(() => this.coreRef().wordCount());
  readonly editorFullyInitialized = computed(() => this.coreRef().editorFullyInitialized());
  readonly isDragOver = computed(() => this.coreRef().isDragOver());

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
