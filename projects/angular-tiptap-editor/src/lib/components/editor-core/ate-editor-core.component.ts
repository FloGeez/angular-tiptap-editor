import {
  Component,
  ElementRef,
  input,
  output,
  OnDestroy,
  effect,
  signal,
  computed,
  AfterViewInit,
  inject,
  Injector,
  ChangeDetectionStrategy,
  untracked,
} from "@angular/core";
import { Editor, EditorOptions, Extension, Node, Mark, JSONContent } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";

import { buildAteExtensions } from "../../extensions/ate-extension-builder";
import { AteEditorCommandsService } from "../../services/ate-editor-commands.service";
import { AteEditorRegistry } from "../../services/ate-editor-registry.service";
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
import { ATE_DEFAULT_CONFIG, ATE_DEFAULT_IMAGE_UPLOAD_CONFIG } from "../../config/ate-editor.config";
import { ATE_GLOBAL_CONFIG } from "../../config/ate-global-config.token";

/**
 * Bare Tiptap editor engine: builds and owns the `Editor` instance, its extensions,
 * paste/drop handling and reactive state wiring, with zero UI chrome.
 *
 * Attaches to an existing element via attribute selector (no wrapper element added
 * to the DOM), so it can either be composed by hand alongside `ate-toolbar` /
 * bubble menus / `ate-slash-commands`, or hosted internally by
 * `AngularTiptapEditorComponent`.
 *
 * Requires `ATE_EDITOR_PROVIDERS` to be declared on an ancestor component so it
 * shares `AteEditorCommandsService` (and friends) with any sibling UI components.
 */
@Component({
  selector: "[ateEditorCore]",
  exportAs: "ateEditorCore",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "ate-content",
    tabindex: "0",
    role: "application",
    "[attr.aria-label]": "ariaLabel()",
    "[class.drag-over]": "isDragOver()",
    "(dragover)": "onDragOver($event)",
    "(drop)": "onDrop($event)",
    "(click)": "onEditorClick($event)",
    "(keydown.enter)": "onEditorClick($event)",
    "(keydown.space)": "onEditorClick($event)",
  },
  template: "",
})
export class AteEditorCoreComponent implements AfterViewInit, OnDestroy {
  content = input<string>("");
  /**
   * Optional single-object configuration, mirroring `AngularTiptapEditorComponent`'s
   * `[config]` input but restricted to editor-mechanics fields. Priority: individual
   * input > `config` > app-wide `provideAteEditor()` config > library defaults.
   */
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
  /** Forwarded to the host's `aria-label`, for accessible labeling of the editable region. */
  ariaLabel = input<string | undefined>(undefined);

  /**
   * When true, an empty `content` value never overwrites the editor (mirrors the
   * guard `AngularTiptapEditorComponent` applies when bound to a Reactive Forms
   * `FormControl`, so it doesn't clear content before the control's real value
   * arrives). Consumers composing Core directly with `NgControl` should set this.
   */
  ignoreEmptyContentSync = input<boolean>(false);

  contentChange = output<string>();
  editorCreated = output<Editor>();
  editorUpdate = output<{ editor: Editor; transaction: unknown }>();
  editorFocus = output<{ editor: Editor; event: FocusEvent }>();
  editorBlur = output<{ editor: Editor; event: FocusEvent }>();
  imageUploaded = output<AteImageUploadResult>();

  private _editor = signal<Editor | null>(null);
  private _characterCount = signal<number>(0);
  private _wordCount = signal<number>(0);
  private _isDragOver = signal<boolean>(false);
  private _editorFullyInitialized = signal<boolean>(false);
  private _hoveredBlock = signal<{ node: PMNode; element: HTMLElement; pos: number } | null>(null);
  private _registeredId = signal<string | null>(null);

  // Anti-echo: track last emitted HTML to avoid overwriting the editor with its own output
  private lastEmittedHtml: string | null = null;

  readonly editor = this._editor.asReadonly();
  readonly characterCount = this._characterCount.asReadonly();
  readonly wordCount = this._wordCount.asReadonly();
  readonly isDragOver = this._isDragOver.asReadonly();
  readonly editorFullyInitialized = this._editorFullyInitialized.asReadonly();
  readonly hoveredBlock = this._hoveredBlock.asReadonly();
  readonly registeredId = this._registeredId.asReadonly();

  private elementRef = inject(ElementRef);
  private injector = inject(Injector);
  readonly editorCommandsService = inject(AteEditorCommandsService);
  private editorRegistry = inject(AteEditorRegistry);
  private globalConfig = inject(ATE_GLOBAL_CONFIG, { optional: true });

  /**
   * Merged configuration. Priority: `[config]` input > app-wide `provideAteEditor()`
   * config > library defaults (mirrors `AngularTiptapEditorComponent.effectiveConfig`).
   */
  readonly effectiveConfig = computed(() => ({
    ...ATE_DEFAULT_CONFIG,
    ...(this.globalConfig ?? {}),
    ...this.config(),
  }));

  readonly finalEditable = computed(() => this.editable() ?? this.effectiveConfig().editable ?? true);
  readonly finalPlaceholder = computed(
    () => this.placeholder() ?? this.effectiveConfig().placeholder ?? ""
  );
  readonly finalAutofocus = computed(() => this.autofocus() ?? this.effectiveConfig().autofocus);
  readonly finalSpellcheck = computed(
    () => this.spellcheck() ?? this.effectiveConfig().spellcheck ?? true
  );
  readonly finalEnableOfficePaste = computed(
    () => this.enableOfficePaste() ?? this.effectiveConfig().enableOfficePaste ?? true
  );
  readonly finalBlockControls = computed(
    () => this.blockControls() ?? this.effectiveConfig().blockControls ?? "none"
  );
  readonly finalShowCharacterCount = computed(
    () => this.showCharacterCount() ?? this.effectiveConfig().showCharacterCount ?? true
  );
  readonly finalShowWordCount = computed(
    () => this.showWordCount() ?? this.effectiveConfig().showWordCount ?? true
  );
  readonly finalMaxCharacters = computed(
    () => this.maxCharacters() ?? this.effectiveConfig().maxCharacters
  );
  readonly finalAngularNodes = computed(
    () => this.angularNodes() ?? this.effectiveConfig().angularNodes ?? []
  );
  readonly finalTiptapExtensions = computed(
    () => this.tiptapExtensions() ?? this.effectiveConfig().tiptapExtensions ?? []
  );
  readonly finalTiptapOptions = computed(
    () => this.tiptapOptions() ?? this.effectiveConfig().tiptapOptions ?? {}
  );
  readonly finalStateCalculators = computed(
    () => this.stateCalculators() ?? this.effectiveConfig().stateCalculators ?? []
  );
  readonly finalImageUploadHandler = computed(
    () => this.imageUploadHandler() ?? this.effectiveConfig().imageUpload?.handler
  );

  /**
   * Note the unit mismatch: the direct `imageUpload` input is bytes-based
   * (`AteImageUploadOptions`, used as-is), while `config.imageUpload`
   * (`AteImageUploadConfig`, from `[config]`/global config/defaults) is MB-based
   * and must be converted. Only the config/global/default path is converted.
   */
  private readonly finalImageUploadOptions = computed<AteImageUploadOptions>(() => {
    const fromInput = this.imageUpload();
    const fromConfig = this.effectiveConfig().imageUpload;
    const base = ATE_DEFAULT_IMAGE_UPLOAD_CONFIG;
    return {
      quality: fromInput?.quality ?? fromConfig?.quality ?? base.quality,
      maxWidth: fromInput?.maxWidth ?? fromConfig?.maxWidth ?? base.maxWidth,
      maxHeight: fromInput?.maxHeight ?? fromConfig?.maxHeight ?? base.maxHeight,
      maxSize: fromInput?.maxSize ?? (fromConfig?.maxSize ?? base.maxSize ?? 5) * 1024 * 1024,
      allowedTypes: fromInput?.allowedTypes ?? fromConfig?.allowedTypes ?? base.allowedTypes,
    };
  });

  constructor() {
    // Content sync (with anti-echo)
    effect(
      () => {
        const content = this.content();

        untracked(() => {
          const editor = this.editor();
          if (!editor || content === undefined) {
            return;
          }
          if (content === this.lastEmittedHtml) {
            return;
          }
          if (content === editor.getHTML()) {
            return;
          }
          if (this.ignoreEmptyContentSync() && !content) {
            return;
          }
          editor.commands.setContent(content, { emitUpdate: false });
        });
      },
      { allowSignalWrites: true }
    );

    // Editability sync
    effect(
      () => {
        const currentEditor = this.editor();
        const isEditable = this.finalEditable();
        if (currentEditor) {
          this.editorCommandsService.setEditable(currentEditor, isEditable);
        }
      },
      { allowSignalWrites: true }
    );

    // Image upload handler sync
    effect(
      () => {
        const handler = this.finalImageUploadHandler();
        this.editorCommandsService.uploadHandler = handler || null;
      },
      { allowSignalWrites: true }
    );

    // Character count limit sync
    effect(
      () => {
        const editor = this.editor();
        const limit = this.finalMaxCharacters();

        if (editor && editor.extensionManager) {
          const characterCountExtension = editor.extensionManager.extensions.find(
            ext => ext.name === "characterCount"
          );
          if (characterCountExtension) {
            characterCountExtension.options.limit = limit;
          }
        }
      },
      { allowSignalWrites: true }
    );

    // Re-initialize the editor when technical configuration changes
    effect(
      () => {
        this.finalTiptapExtensions();
        this.finalTiptapOptions();
        this.finalAngularNodes();
        this.finalBlockControls();

        untracked(() => {
          if (this.editorFullyInitialized()) {
            const currentEditor = this.editor();
            if (currentEditor) {
              currentEditor.destroy();
              this._editorFullyInitialized.set(false);
              this.initEditor();
            }
          }
        });
      },
      { allowSignalWrites: true }
    );

    this.editorCommandsService.onImageUploaded = result => {
      this.imageUploaded.emit(result);
    };
  }

  ngAfterViewInit() {
    this.initEditor();
  }

  ngOnDestroy() {
    const currentEditor = this.editor();
    if (currentEditor) {
      currentEditor.destroy();
    }
    this._editorFullyInitialized.set(false);

    const id = this.registeredId();
    if (id) {
      this.editorRegistry.unregister(id);
    }
  }

  private initEditor() {
    const extensions = buildAteExtensions(
      {
        placeholder: this.finalPlaceholder(),
        blockControls: this.finalBlockControls(),
        enableOfficePaste: this.finalEnableOfficePaste(),
        showCharacterCount: this.finalShowCharacterCount(),
        showWordCount: this.finalShowWordCount(),
        maxCharacters: this.finalMaxCharacters(),
        angularNodes: this.finalAngularNodes(),
        tiptapExtensions: this.finalTiptapExtensions(),
        stateCalculators: this.finalStateCalculators(),
      },
      {
        injector: this.injector,
        isUploading: () => this.editorCommandsService.isUploading(),
        uploadProgress: () => this.editorCommandsService.uploadProgress(),
        uploadMessage: () => this.editorCommandsService.uploadMessage(),
        onStateUpdate: state => this.editorCommandsService.updateState(state),
        onBlockHover: data => this._hoveredBlock.set(data),
      }
    );

    const userOptions = this.finalTiptapOptions();
    const userEditorProps = userOptions.editorProps;
    const userHandlePaste = userEditorProps?.handlePaste;
    const userHandleDOMPaste = userEditorProps?.handleDOMEvents?.paste;

    type EditorHandlePaste = NonNullable<NonNullable<EditorOptions["editorProps"]>["handlePaste"]>;
    type EditorDOMPasteHandler = NonNullable<
      NonNullable<NonNullable<EditorOptions["editorProps"]>["handleDOMEvents"]>["paste"]
    >;

    const handleDOMPaste: EditorDOMPasteHandler = (view, event) => {
      const currentEditor = this.editor();
      if (
        currentEditor &&
        this.editorCommandsService.handleImagePaste(
          currentEditor,
          event,
          this.finalImageUploadOptions()
        )
      ) {
        return true;
      }

      if (!userHandleDOMPaste) {
        return false;
      }

      const userResult = userHandleDOMPaste(view, event);
      return userResult === true;
    };

    const handlePaste: EditorHandlePaste = (view, event, slice) => {
      const currentEditor = this.editor();
      if (
        currentEditor &&
        this.editorCommandsService.handleImagePaste(
          currentEditor,
          event,
          this.finalImageUploadOptions()
        )
      ) {
        return true;
      }

      if (!userHandlePaste) {
        return false;
      }

      const userResult = userHandlePaste(view, event, slice);
      return userResult === true;
    };

    const newEditor = new Editor({
      ...userOptions,
      element: this.elementRef.nativeElement,
      extensions,
      content: this.content(),
      editable: this.finalEditable(),
      autofocus: this.finalAutofocus(),
      editorProps: {
        ...userEditorProps,
        attributes: {
          ...userEditorProps?.attributes,
          spellcheck: this.finalSpellcheck().toString(),
        },
        handleDOMEvents: {
          ...userEditorProps?.handleDOMEvents,
          paste: handleDOMPaste,
        },
        handlePaste,
      },
      onUpdate: ({ editor, transaction }) => {
        const html = editor.getHTML();

        this.lastEmittedHtml = html;
        this.contentChange.emit(html);
        this.editorUpdate.emit({ editor, transaction });
        this.updateCharacterCount(editor);
      },
      onCreate: ({ editor }) => {
        this.editorCreated.emit(editor);
        this.updateCharacterCount(editor);

        // Marked as fully initialized after a short delay, once all
        // extensions/plugins have settled.
        setTimeout(() => {
          this._editorFullyInitialized.set(true);
        }, 100);
      },
      onFocus: ({ editor, event }) => {
        const id = this.registeredId();
        if (id) {
          this.editorRegistry.setActive(id);
        }
        this.editorFocus.emit({ editor, event });
      },
      onBlur: ({ editor, event }) => {
        this.editorBlur.emit({ editor, event });
      },
    });

    this._editor.set(newEditor);

    const registeredId = this.editorRegistry.register(
      this.editorId(),
      () => this.editor(),
      this.editorCommandsService
    );
    this._registeredId.set(registeredId);
  }

  private updateCharacterCount(editor: Editor) {
    if (
      (this.finalShowCharacterCount() || this.finalShowWordCount()) &&
      editor.storage["characterCount"]
    ) {
      const storage = editor.storage["characterCount"];
      this._characterCount.set(storage.characters());
      this._wordCount.set(storage.words());
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this._isDragOver.set(true);
  }

  onDrop(event: DragEvent) {
    const editor = this.editor();
    if (editor) {
      this.editorCommandsService.handleImageDrop(editor, event, this.finalImageUploadOptions());
      this._isDragOver.set(false);
    }
  }

  onEditorClick(event: Event) {
    const editor = this.editor();
    if (!editor) {
      return;
    }

    const target = event.target as HTMLElement;
    const hostElement = this.elementRef.nativeElement as HTMLElement;

    // In read-only mode, clear node selection so bubble menus hide
    if (!this.finalEditable()) {
      if (target === hostElement) {
        editor.commands.setTextSelection(0);
      }
      return;
    }

    if (target === hostElement) {
      // Interaction in the empty space: position the cursor at the end
      setTimeout(() => {
        const { doc } = editor.state;
        const endPos = doc.content.size;
        editor.commands.setTextSelection(endPos);
        editor.commands.focus();
      }, 0);
    }
  }

  // Public API

  getHTML(): string {
    return this.editor()?.getHTML() || "";
  }

  getJSON(): JSONContent | undefined {
    return this.editor()?.getJSON();
  }

  getText(): string {
    return this.editor()?.getText() || "";
  }

  setContent(content: string, emitUpdate = true) {
    const editor = this.editor();
    if (editor) {
      this.editorCommandsService.setContent(editor, content, emitUpdate);
    }
  }

  focus() {
    const editor = this.editor();
    if (editor) {
      this.editorCommandsService.focus(editor);
    }
  }

  blur() {
    const editor = this.editor();
    if (editor) {
      this.editorCommandsService.blur(editor);
    }
  }

  clearContent() {
    const editor = this.editor();
    if (editor) {
      this.editorCommandsService.clearContent(editor);
    }
  }

  getEditor(): Editor | null {
    return this.editor();
  }
}
