import {
  Component,
  input,
  output,
  viewChild,
  signal,
  computed,
  AfterViewInit,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
  booleanAttribute,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Editor, EditorOptions, Extension, Node, Mark, JSONContent } from "@tiptap/core";

import { AteEditorChassisComponent } from "../editor-chassis/ate-editor-chassis.component";
import { AteToolbarComponent } from "../toolbar/ate-toolbar.component";
import { AteBubbleMenuComponent } from "../bubble-menus/text/ate-bubble-menu.component";
import { AteImageBubbleMenuComponent } from "../bubble-menus/image/ate-image-bubble-menu.component";
import { AteTableBubbleMenuComponent } from "../bubble-menus/table/ate-table-bubble-menu.component";
import { AteCellBubbleMenuComponent } from "../bubble-menus/table/ate-cell-bubble-menu.component";
import { AteLinkBubbleMenuComponent } from "../bubble-menus/link/ate-link-bubble-menu.component";
import { AteColorBubbleMenuComponent } from "../bubble-menus/color/ate-color-bubble-menu.component";
import { AteSlashCommandsComponent } from "../slash-commands/ate-slash-commands.component";
import { AteBlockControlsComponent } from "./ate-block-controls.component";
import { AteCustomSlashCommands } from "../../models/ate-slash-command.model";
import { AteEditToggleComponent } from "../edit-toggle/ate-edit-toggle.component";
import { AteFooterComponent } from "../footer/ate-footer.component";
import { AteI18nService } from "../../services/ate-i18n.service";
import { AteEditorCommandsService } from "../../services/ate-editor-commands.service";
import { AteNoopValueAccessorDirective } from "../../directives/ate-noop-value-accessor.directive";
import { AteStateCalculator } from "../../models/ate-editor-state.model";
import { NgControl } from "@angular/forms";
import {
  filterSlashCommands,
  AteSlashCommandsConfig,
} from "../../config/ate-slash-commands.config";
import { ATE_GLOBAL_CONFIG } from "../../config/ate-global-config.token";

import { AteToolbarConfig } from "../../models/ate-toolbar.model";
import {
  AteBubbleMenuConfig,
  AteImageBubbleMenuConfig,
  AteTableBubbleMenuConfig,
  AteCellBubbleMenuConfig,
} from "../../models/ate-bubble-menu.model";
import {
  AteEditorConfig,
  AteEditorCoreConfig,
  AteBlockControlsMode,
  AteAutofocusMode,
} from "../../models/ate-editor-config.model";
import {
  ATE_DEFAULT_TOOLBAR_CONFIG,
  ATE_DEFAULT_BUBBLE_MENU_CONFIG,
  ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG,
  ATE_DEFAULT_IMAGE_UPLOAD_CONFIG,
  ATE_DEFAULT_TABLE_MENU_CONFIG,
  ATE_DEFAULT_CELL_MENU_CONFIG,
  ATE_DEFAULT_CONFIG,
} from "../../config/ate-editor.config";
import { concat, defer, Observable, of, tap } from "rxjs";
import {
  AteImageUploadHandler,
  AteImageUploadOptions,
  AteImageUploadResult,
} from "../../models/ate-image.model";
import { SupportedLocale } from "../../i18n/ateTranslationsModel";

// Slash commands configuration is handled dynamically via slashCommandsConfigComputed

/**
 * Coerces a boolean-attribute-style input value, but preserves `undefined`/`null`
 * as-is (unlike Angular's own `booleanAttribute`, which would coerce them to
 * `false`) so the `this.x() ?? this.effectiveConfig().x` fallback chains below
 * still see "not set" rather than a hard `false`.
 */
function transformBooleanInput(val: unknown): boolean | undefined {
  if (val === undefined || val === null) {
    return undefined;
  }
  return booleanAttribute(val);
}

/**
 * The main rich-text editor component for Angular.
 *
 * Powered by Tiptap and built with a native Signal-based architecture, it provides
 * a seamless, high-performance editing experience. Supports automatic registration
 * of Angular components as interactive nodes ('Angular Nodes'), full Reactive Forms
 * integration, and extensive customization via the AteEditorConfig.
 */
@Component({
  selector: "angular-tiptap-editor",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [AteNoopValueAccessorDirective],
  host: {
    "[class.fill-container]": "finalFillContainer()",
    "[class.floating-toolbar]": "finalFloatingToolbar()",
    "[class.is-readonly]": "!finalEditable() && !mergedDisabled()",
    "[class.is-disabled]": "mergedDisabled()",
    "[style.--ate-border-width]": "finalSeamless() || mergedDisabled() ? '0' : null",
    "[style.--ate-background]":
      "finalSeamless() ? 'transparent' : (mergedDisabled() ? 'var(--ate-surface-tertiary)' : null)",
    "[style.--ate-toolbar-border-color]": "finalSeamless() ? 'transparent' : null",
    "[style.--ate-counter-background]": "finalSeamless() ? 'transparent' : null",
    "[style.--ate-counter-border-color]": "finalSeamless() ? 'transparent' : null",
    "[class.dark]": "config().theme === 'dark'",
    "[class.ate-blocks-inside]": "finalBlockControls() === 'inside'",
    "[class.ate-blocks-outside]": "finalBlockControls() === 'outside'",
    "[attr.data-theme]": "config().theme",
    "[attr.data-ate-editor-id]": "registeredId()",
  },
  imports: [
    AteEditorChassisComponent,
    AteToolbarComponent,
    AteBubbleMenuComponent,
    AteImageBubbleMenuComponent,
    AteTableBubbleMenuComponent,
    AteCellBubbleMenuComponent,
    AteSlashCommandsComponent,
    AteLinkBubbleMenuComponent,
    AteColorBubbleMenuComponent,
    AteEditToggleComponent,
    AteBlockControlsComponent,
    AteFooterComponent,
  ],
  template: `
    <div class="ate-editor">
      @if (finalShowEditToggle() && !mergedDisabled()) {
        <ate-edit-toggle
          [editable]="finalEditable()"
          [locale]="finalLocale()"
          (editToggle)="toggleEditMode($event)" />
      }

      <!-- Editor: hosts AteEditorCoreComponent + all chrome that needs the
           shared ATE_EDITOR_PROVIDERS instance -->
      <ate-editor-chassis
        #chassis="ateEditorChassis"
        [content]="content()"
        [config]="resolvedCoreConfig()"
        [imageUpload]="finalImageUploadConfig()"
        [imageUploadHandler]="finalImageUploadHandler()"
        [editorId]="editorId()"
        [ariaLabel]="currentTranslations().editor.placeholder"
        [ignoreEmptyContentSync]="hasFormControl()"
        [theme]="config().theme"
        [style.--editor-min-height]="finalMinHeight() ?? 'auto'"
        [style.--editor-height]="finalHeight() ?? 'auto'"
        [style.--editor-max-height]="finalMaxHeight() ?? 'none'"
        [style.--editor-overflow]="finalNeedsScroll() ? 'auto' : 'visible'"
        (contentChange)="onCoreContentChange($event)"
        (editorCreated)="editorCreated.emit($event)"
        (editorUpdate)="editorUpdate.emit($event)"
        (editorFocus)="editorFocus.emit($event)"
        (editorBlur)="onCoreBlur($event)"
        (imageUploaded)="imageUploaded.emit($event)">
        <!-- Toolbar Slot (auto-routed to [ateHeader] slot in ate-editor-chassis) -->
        <div ateHeader>
          @if (finalEditable() && !mergedDisabled() && finalShowToolbar() && editor()) {
            <ate-toolbar
              [config]="finalToolbarConfig()"
              [imageUpload]="finalImageUploadConfig()"
              [floating]="finalFloatingToolbar()" />
          }
        </div>

        <!-- Block Controls (Plus + Drag) -->
        @if (finalEditable() && !mergedDisabled() && editor() && finalBlockControls() !== "none") {
          <ate-block-controls
            [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-block-controls>
        }

        <!-- Text Bubble Menu -->
        @if (finalEditable() && finalShowBubbleMenu() && editor()) {
          <ate-bubble-menu
            [config]="finalBubbleMenuConfig()"
            [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-bubble-menu>
        }

        <!-- Image Bubble Menu -->
        @if (finalShowImageBubbleMenu() && editor()) {
          <ate-image-bubble-menu
            [config]="finalImageBubbleMenuConfig()"
            [imageUpload]="finalImageUploadConfig()"
            [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-image-bubble-menu>
        }

        <!-- Link Bubble Menu -->
        @if (finalEditable() && editor()) {
          <ate-link-bubble-menu
            [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-link-bubble-menu>
        }

        <!-- Color Bubble Menu -->
        @if (finalEditable() && editor()) {
          <ate-color-bubble-menu
            [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-color-bubble-menu>
        }

        <!-- Slash Commands -->
        @if (finalEditable() && finalEnableSlashCommands() && editor()) {
          <ate-slash-commands
            [config]="finalSlashCommandsConfig()"
            [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-slash-commands>
        }

        <!-- Table Menu -->
        @if (finalEditable() && finalShowTableBubbleMenu() && editor()) {
          <ate-table-bubble-menu
            [config]="finalTableBubbleMenuConfig()"
            [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-table-bubble-menu>
        }

        <!-- Cell Menu -->
        @if (finalEditable() && finalShowCellBubbleMenu() && editor()) {
          <ate-cell-bubble-menu
            [config]="finalCellBubbleMenuConfig()"
            [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-cell-bubble-menu>
        }

        <!-- Footer / Counters Slot (auto-routed to [ateFooter] slot in ate-editor-chassis) -->
        <div ateFooter>
          @if (
            finalEditable() &&
            !mergedDisabled() &&
            finalShowFooter() &&
            (finalShowCharacterCount() || finalShowWordCount())
          ) {
            <ate-footer
              [showCharacterCount]="finalShowCharacterCount()"
              [showWordCount]="finalShowWordCount()"
              [maxCharacters]="finalMaxCharacters()"
              [locale]="finalLocale()" />
          }
        </div>
      </ate-editor-chassis>
    </div>
  `,

  styles: [
    `
      /* Design tokens (light, page-wide dark, AND per-instance dark) live
         entirely in the required global stylesheet
         (styles/ate-variables.global.css, imported via styles/index.css) —
         not duplicated here, so Full/Chassis/Brut all read from the exact
         same single source of truth, including for
         [class.dark]/[attr.data-theme] below (see that file's "per-instance"
         dark block for why it needs its own dedicated rule instead of
         reusing the page-wide .dark block). */

      /* Host styles for fillContainer */
      :host(.fill-container) {
        display: block;
        height: 100%;
      }

      /* Main editor container */
      .ate-editor {
        border: var(--ate-border-width) solid var(--ate-border-color);
        border-radius: var(--ate-border-radius);
        background: var(--ate-background);
        overflow: visible;
        transition: border-color 0.2s ease;
        position: relative;
      }

      /* Floating Toolbar Mode */
      :host(.floating-toolbar) .ate-editor {
        overflow: visible;
      }

      /* Fill container mode - editor fills its parent */
      :host(.fill-container) .ate-editor {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      :host(.fill-container) .ate-content-wrapper {
        flex: 1;
        min-height: 0;
      }

      :host(.fill-container) .ate-content {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
      }

      .ate-editor:focus-within {
        border-color: var(--ate-focus-color);
      }

      /* Editor content area: base .ate-content / .ProseMirror typography lives in
         the global stylesheet (styles/ate-editor-content.global.css) so it's shared
         with AteEditorChassisComponent and any hand-rolled [ateEditorCore] usage.
         Only rules that depend on this component's own host state stay here. */
      :host(.is-disabled) .ate-content {
        cursor: not-allowed;
        opacity: 0.7;
        user-select: none;
        pointer-events: none;
        background-color: var(--ate-surface-tertiary);
      }

      :host(.is-readonly) .ate-content {
        cursor: default;
        user-select: text;
      }

      :host(.is-readonly) .ate-content ::ng-deep .ate-link {
        cursor: pointer;
        pointer-events: auto;
      }

      .ate-content-wrapper {
        position: relative;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .ate-content-wrapper .ate-content {
        flex: 1;
      }

      :host.ate-blocks-inside {
        --ate-content-gutter: 54px;
      }

      @media (max-width: 768px) {
        :host.ate-blocks-inside {
          --ate-content-gutter: 0px;
        }

        ate-block-controls {
          display: none !important;
        }
      }

      /* Styles for the slash commands component */
      ::ng-deep .ate-slash-decoration {
        background: var(
          --ate-primary-light,
          color-mix(in srgb, var(--ate-primary, #2563eb), transparent 90%)
        );
        padding: 4px 8px;
        border-radius: var(--ate-sub-border-radius, 8px);
      }

      ::ng-deep .ate-slash-decoration.is-empty::after {
        content: attr(data-decoration-content);
        color: var(--ate-text-secondary);
        font-weight: 400;
        opacity: 0.7;
      }

      /* Show resize handles on hover (even when not selected) — editable mode only */
      :host:not(.is-readonly):not(.is-disabled)
        ::ng-deep
        .resizable-image-container:hover
        .resize-controls,
      :host:not(.is-readonly):not(.is-disabled) ::ng-deep body.resizing .resize-controls {
        opacity: 1;
      }
    `,
  ],
})
export class AngularTiptapEditorComponent implements AfterViewInit {
  /** Global editor configuration. */
  config = input<AteEditorConfig>({});

  content = input<string>("");
  placeholder = input<string | undefined>(undefined);
  editable = input<boolean | undefined, unknown>(undefined, { transform: transformBooleanInput });
  disabled = input<boolean | undefined, unknown>(undefined, { transform: transformBooleanInput });
  minHeight = input<number | string | undefined>(undefined);
  height = input<number | string | undefined>(undefined);
  maxHeight = input<number | string | undefined>(undefined);
  fillContainer = input<boolean | undefined, unknown>(undefined, {
    transform: transformBooleanInput,
  });
  showToolbar = input<boolean | undefined, unknown>(undefined, {
    transform: transformBooleanInput,
  });
  showFooter = input<boolean | undefined, unknown>(undefined, { transform: transformBooleanInput });
  showCharacterCount = input<boolean | undefined, unknown>(undefined, {
    transform: transformBooleanInput,
  });
  showWordCount = input<boolean | undefined, unknown>(undefined, {
    transform: transformBooleanInput,
  });
  maxCharacters = input<number | undefined>(undefined);
  enableOfficePaste = input<boolean | undefined, unknown>(undefined, {
    transform: transformBooleanInput,
  });
  enableSlashCommands = input<boolean | undefined, unknown>(undefined, {
    transform: transformBooleanInput,
  });
  slashCommands = input<AteSlashCommandsConfig | undefined>(undefined);
  customSlashCommands = input<AteCustomSlashCommands | undefined>(undefined);
  blockControls = input<AteBlockControlsMode | undefined>(undefined);
  locale = input<SupportedLocale | undefined>(undefined);
  autofocus = input<AteAutofocusMode | undefined>(undefined);
  mode = input<"classic" | "seamless" | undefined>(undefined);
  seamless = input<boolean | undefined, unknown>(undefined, { transform: transformBooleanInput });
  floatingToolbar = input<boolean | undefined, unknown>(undefined, {
    transform: transformBooleanInput,
  });
  showEditToggle = input<boolean | undefined, unknown>(undefined, {
    transform: transformBooleanInput,
  });
  spellcheck = input<boolean | undefined, unknown>(undefined, { transform: transformBooleanInput });

  tiptapExtensions = input<(Extension | Node | Mark)[] | undefined>(undefined);
  tiptapOptions = input<Partial<EditorOptions> | undefined>(undefined);

  showBubbleMenu = input<boolean | undefined, unknown>(undefined, {
    transform: transformBooleanInput,
  });
  bubbleMenu = input<Partial<AteBubbleMenuConfig> | undefined>(undefined);
  showImageBubbleMenu = input<boolean | undefined, unknown>(undefined, {
    transform: transformBooleanInput,
  });
  imageBubbleMenu = input<Partial<AteImageBubbleMenuConfig> | undefined>(undefined);

  toolbar = input<Partial<AteToolbarConfig> | undefined>(undefined);

  showTableBubbleMenu = input<boolean | undefined, unknown>(undefined, {
    transform: transformBooleanInput,
  });
  tableBubbleMenu = input<Partial<AteTableBubbleMenuConfig> | undefined>(undefined);
  showCellBubbleMenu = input<boolean | undefined, unknown>(undefined, {
    transform: transformBooleanInput,
  });
  cellBubbleMenu = input<Partial<AteCellBubbleMenuConfig> | undefined>(undefined);

  /**
   * Additional state calculators to extend the reactive editor state.
   */
  stateCalculators = input<AteStateCalculator[] | undefined>(undefined);

  imageUpload = input<Partial<AteImageUploadOptions> | undefined>(undefined);

  /**
   * Custom handler for image uploads.
   * When provided, images will be processed through this handler instead of being converted to base64.
   * This allows you to upload images to your own server/storage and use the returned URL.
   *
   * @example
   * ```typescript
   * myUploadHandler: ImageUploadHandler = async (context) => {
   *   const formData = new FormData();
   *   formData.append('image', context.file);
   *   const response = await fetch('/api/upload', { method: 'POST', body: formData });
   *   const data = await response.json();
   *   return { src: data.imageUrl };
   * };
   *
   * // In template:
   * // <angular-tiptap-editor [imageUploadHandler]="myUploadHandler" />
   * ```
   */
  imageUploadHandler = input<AteImageUploadHandler | undefined>(undefined);

  /**
   * Optional unique identifier for the editor instance in the registry.
   * If not specified, a unique ID is automatically generated.
   */
  editorId = input<string | undefined>(undefined);

  contentChange = output<string>();
  editorCreated = output<Editor>();
  editorUpdate = output<{ editor: Editor; transaction: unknown }>();
  editorFocus = output<{ editor: Editor; event: FocusEvent }>();
  editorBlur = output<{ editor: Editor; event: FocusEvent }>();
  editableChange = output<boolean>();
  imageUploaded = output<AteImageUploadResult>();

  // ViewChild with signal
  chassisRef = viewChild.required(AteEditorChassisComponent);

  /**
   * The `AteEditorCommandsService` instance shared with everything hosted inside
   * the chassis. A getter (not `inject()`) because this component no longer
   * declares `ATE_EDITOR_PROVIDERS` itself — `ate-editor-chassis` does.
   */
  get editorCommandsService(): AteEditorCommandsService {
    return this.chassisRef().editorCommandsService();
  }

  // ============================================
  // Toolbar / Bubble Menu Coordination
  // ============================================
  /** @deprecated ate-toolbar now manages this itself via host mouseenter/mouseleave bindings. */
  hideBubbleMenus(): void {
    this.editorCommandsService.setToolbarInteracting(true);
  }

  /** @deprecated ate-toolbar now manages this itself via host mouseenter/mouseleave bindings. */
  showBubbleMenus(): void {
    this.editorCommandsService.setToolbarInteracting(false);
  }

  // Editor state, delegated to AteEditorChassisComponent (single source of truth)
  readonly editor = computed(() => this.chassisRef().editor());
  readonly characterCount = computed(() => this.chassisRef().characterCount());
  readonly wordCount = computed(() => this.chassisRef().wordCount());
  readonly isDragOver = computed(() => this.chassisRef().isDragOver());
  readonly editorFullyInitialized = computed(() => this.chassisRef().editorFullyInitialized());
  readonly hoveredBlock = computed(() => this.chassisRef().hoveredBlock());
  readonly registeredId = computed(() => this.chassisRef().registeredId());

  private _isFormControlDisabled = signal<boolean>(false);
  readonly isFormControlDisabled = this._isFormControlDisabled.asReadonly();

  // Combined disabled state (Input + FormControl)
  readonly mergedDisabled = computed(
    () => (this.disabled() ?? this.effectiveConfig().disabled) || this.isFormControlDisabled()
  );

  // Computed for editor states
  readonly isEditorReady = computed(() => this.editor() !== null);

  // ============================================
  // UNIFIED CONFIGURATION COMPUTED PROPERTIES
  // ============================================

  // Appearance & Fundamentals
  readonly finalSeamless = computed(() => {
    const inputVal = this.seamless();
    if (inputVal !== undefined) {
      return inputVal;
    }

    const modeVal = this.mode();
    if (modeVal !== undefined) {
      return modeVal === "seamless";
    }

    const fromConfig = this.effectiveConfig().mode;
    return fromConfig === "seamless";
  });

  readonly finalEditable = computed(
    () => this.editable() ?? this.effectiveConfig().editable ?? true
  );
  readonly finalPlaceholder = computed(
    () =>
      this.placeholder() ??
      this.effectiveConfig().placeholder ??
      this.currentTranslations().editor.placeholder
  );
  readonly finalFillContainer = computed(
    () => this.fillContainer() ?? this.effectiveConfig().fillContainer
  );
  readonly finalShowFooter = computed(
    () => this.showFooter() ?? this.effectiveConfig().showFooter ?? true
  );
  readonly finalShowEditToggle = computed(
    () => this.showEditToggle() ?? this.effectiveConfig().showEditToggle ?? false
  );

  readonly finalHeight = computed(() => {
    const h = this.height() ?? this.effectiveConfig().height;
    return typeof h === "number" ? `${h}px` : h;
  });
  readonly finalMinHeight = computed(() => {
    const mh = this.minHeight() ?? this.effectiveConfig().minHeight;
    return typeof mh === "number" ? `${mh}px` : mh;
  });
  readonly finalMaxHeight = computed(() => {
    const mh = this.maxHeight() ?? this.effectiveConfig().maxHeight;
    return typeof mh === "number" ? `${mh}px` : mh;
  });
  readonly finalNeedsScroll = computed(
    () => this.finalHeight() !== undefined || this.finalMaxHeight() !== undefined
  );

  readonly finalSpellcheck = computed(
    () => this.spellcheck() ?? this.effectiveConfig().spellcheck ?? true
  );
  readonly finalEnableOfficePaste = computed(
    () => this.enableOfficePaste() ?? this.effectiveConfig().enableOfficePaste ?? true
  );

  // Features
  readonly finalShowToolbar = computed(
    () => this.showToolbar() ?? this.effectiveConfig().showToolbar ?? true
  );

  readonly finalToolbarConfig = computed(() => {
    const fromInput = this.toolbar();
    const fromConfig = this.effectiveConfig().toolbar;
    const base = ATE_DEFAULT_TOOLBAR_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalFloatingToolbar = computed(
    () => this.floatingToolbar() ?? this.effectiveConfig().floatingToolbar ?? false
  );

  readonly finalShowBubbleMenu = computed(
    () => this.showBubbleMenu() ?? this.effectiveConfig().showBubbleMenu ?? true
  );

  readonly finalBubbleMenuConfig = computed(() => {
    const fromInput = this.bubbleMenu();
    const fromConfig = this.effectiveConfig().bubbleMenu;
    const base = ATE_DEFAULT_BUBBLE_MENU_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalShowImageBubbleMenu = computed(
    () => this.showImageBubbleMenu() ?? this.effectiveConfig().showImageBubbleMenu ?? true
  );

  readonly finalImageBubbleMenuConfig = computed(() => {
    const fromInput = this.imageBubbleMenu();
    const fromConfig = this.effectiveConfig().imageBubbleMenu;
    const base = ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalShowTableBubbleMenu = computed(
    () => this.showTableBubbleMenu() ?? this.effectiveConfig().showTableMenu ?? true
  );

  readonly finalTableBubbleMenuConfig = computed(() => {
    const fromInput = this.tableBubbleMenu();
    const fromConfig = this.effectiveConfig().tableBubbleMenu;
    const base = ATE_DEFAULT_TABLE_MENU_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalShowCellBubbleMenu = computed(
    () => this.showCellBubbleMenu() ?? this.effectiveConfig().showCellMenu ?? true
  );

  readonly finalCellBubbleMenuConfig = computed(() => {
    const fromInput = this.cellBubbleMenu();
    const fromConfig = this.effectiveConfig().cellBubbleMenu;
    const base = ATE_DEFAULT_CELL_MENU_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalEnableSlashCommands = computed(
    () => this.enableSlashCommands() ?? this.effectiveConfig().enableSlashCommands ?? true
  );

  readonly finalSlashCommandsConfig = computed(() => {
    const fromInputComponent = this.customSlashCommands();
    const fromConfigComponent = this.effectiveConfig().customSlashCommands;
    const customConfig = fromInputComponent ?? fromConfigComponent;

    if (customConfig) {
      return customConfig;
    }

    const fromInputOptions = this.slashCommands();
    const fromConfigOptions = this.effectiveConfig().slashCommands;
    const baseConfig =
      fromInputOptions && Object.keys(fromInputOptions).length > 0
        ? fromInputOptions
        : fromConfigOptions;

    return {
      commands: filterSlashCommands(
        baseConfig || {},
        this.i18nService,
        this.editorCommandsService,
        this.finalImageUploadConfig()
      ),
    };
  });

  // Behavior
  readonly finalAutofocus = computed(() => this.autofocus() ?? this.effectiveConfig().autofocus);
  readonly finalMaxCharacters = computed(
    () => this.maxCharacters() ?? this.effectiveConfig().maxCharacters
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
  readonly finalLocale = computed(
    () => (this.locale() as SupportedLocale) ?? (this.effectiveConfig().locale as SupportedLocale)
  );

  // Extensions & Options
  readonly finalTiptapExtensions = computed(
    () => this.tiptapExtensions() ?? this.effectiveConfig().tiptapExtensions ?? []
  );

  readonly finalTiptapOptions = computed(
    () => this.tiptapOptions() ?? this.effectiveConfig().tiptapOptions ?? {}
  );

  readonly finalStateCalculators = computed(
    () => this.stateCalculators() ?? this.effectiveConfig().stateCalculators ?? []
  );

  readonly finalAngularNodesConfig = computed(() => this.effectiveConfig().angularNodes ?? []);

  // Image Upload
  readonly finalImageUploadConfig = computed(() => {
    const fromInput = this.imageUpload();
    const fromConfig = this.effectiveConfig().imageUpload;
    const base = ATE_DEFAULT_IMAGE_UPLOAD_CONFIG;

    const merged = {
      ...base,
      ...fromConfig,
      ...fromInput,
    };

    return {
      ...merged,
      maxSize: (merged.maxSize ?? 5) * 1024 * 1024, // Convert MB to bytes for internal service
    };
  });

  readonly finalImageUploadHandler = computed(
    () => this.imageUploadHandler() ?? this.effectiveConfig().imageUpload?.handler
  );

  /**
   * Bundles the already-resolved mechanics-related `final*` values into a single
   * object for `AteEditorCoreComponent`'s `[config]` input. `imageUpload` is
   * deliberately excluded: `finalImageUploadConfig()` is already MB→bytes
   * converted, and routing it through `[config]` would make Core convert it a
   * second time (Core's own `config.imageUpload` merge path assumes MB input).
   * It stays a direct `[imageUpload]` binding instead, which also takes
   * precedence over `[config]` in Core's own resolution.
   */
  readonly resolvedCoreConfig = computed<AteEditorCoreConfig>(() => ({
    editable: this.finalEditable() && !this.mergedDisabled(),
    placeholder: this.finalPlaceholder(),
    autofocus: this.finalAutofocus(),
    spellcheck: this.finalSpellcheck(),
    enableOfficePaste: this.finalEnableOfficePaste(),
    blockControls: this.finalBlockControls(),
    showCharacterCount: this.finalShowCharacterCount(),
    showWordCount: this.finalShowWordCount(),
    maxCharacters: this.finalMaxCharacters(),
    angularNodes: this.finalAngularNodesConfig(),
    tiptapExtensions: this.finalTiptapExtensions(),
    tiptapOptions: this.finalTiptapOptions(),
    stateCalculators: this.finalStateCalculators(),
  }));

  // Computed for current translations (allows per-instance override via config or input)
  readonly currentTranslations = computed(() => {
    const localeOverride = this.finalLocale();
    if (localeOverride) {
      const allTranslations = this.i18nService.allTranslations();
      return allTranslations[localeOverride] || this.i18nService.translations();
    }
    return this.i18nService.translations();
  });

  private _destroyRef = inject(DestroyRef);
  // NgControl for management of FormControls
  private ngControl = inject(NgControl, { self: true, optional: true });

  readonly i18nService = inject(AteI18nService);
  // Access editor state via the service shared with the chassis (not injected
  // directly here: this component no longer provides ATE_EDITOR_PROVIDERS
  // itself, ate-editor-chassis does).
  readonly editorState = computed(() => this.chassisRef().editorState());

  private globalConfig = inject(ATE_GLOBAL_CONFIG, { optional: true });

  /**
   * Final merged configuration.
   * Priority: Input [config] > Global config via provideAteEditor()
   */
  readonly effectiveConfig = computed(() => {
    const fromInput = this.config();
    const fromGlobal = this.globalConfig || {};
    return { ...ATE_DEFAULT_CONFIG, ...fromGlobal, ...fromInput };
  });

  ngAfterViewInit() {
    this.setupFormControlSubscription();
  }

  toggleEditMode(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const newEditable = !this.finalEditable();
    this.editableChange.emit(newEditable);
  }

  hasFormControl(): boolean {
    return !!(this.ngControl as { control?: unknown })?.control;
  }

  onCoreContentChange(html: string): void {
    this.contentChange.emit(html);

    const control = (
      this.ngControl as {
        control?: { setValue: (value: string, options: { emitEvent: boolean }) => void };
      }
    )?.control;
    if (control) {
      control.setValue(html, { emitEvent: false });
    }
  }

  onCoreBlur(event: { editor: Editor; event: FocusEvent }): void {
    const control = (this.ngControl as { control?: { markAsTouched: () => void } })?.control;
    if (control) {
      control.markAsTouched();
    }
    this.editorBlur.emit(event);
  }

  // Public methods
  getHTML(): string {
    return this.chassisRef().getHTML();
  }

  getJSON(): JSONContent | undefined {
    return this.chassisRef().getJSON();
  }

  getText(): string {
    return this.chassisRef().getText();
  }

  setContent(content: string, emitUpdate = true) {
    this.chassisRef().setContent(content, emitUpdate);
  }

  focus() {
    this.chassisRef().focus();
  }

  blur() {
    this.chassisRef().blur();
  }

  clearContent() {
    this.chassisRef().clearContent();
  }

  getEditor(): Editor | null {
    return this.chassisRef().getEditor();
  }

  private setupFormControlSubscription(): void {
    const control = (
      this.ngControl as {
        control?: {
          value: string;
          valueChanges: Observable<string>;
          status: string;
          statusChanges: Observable<string>;
        };
      }
    )?.control;
    if (control) {
      // Synchronize form control value with editor content
      const formValue$: Observable<string> = concat(
        defer(() => of(control.value)),
        control.valueChanges
      );

      formValue$
        .pipe(
          tap((value: string) => {
            this.setContent(value, false);
          }),
          takeUntilDestroyed(this._destroyRef)
        )
        .subscribe();

      // Synchronize form control status with editor disabled state
      const formStatus$: Observable<string> = concat(
        defer(() => of(control.status)),
        control.statusChanges
      );

      formStatus$
        .pipe(
          tap((status: string) => {
            this._isFormControlDisabled.set(status === "DISABLED");
          }),
          takeUntilDestroyed(this._destroyRef)
        )
        .subscribe();
    }
  }
}
