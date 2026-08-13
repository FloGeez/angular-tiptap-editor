import { Component, inject, signal, WritableSignal, ChangeDetectionStrategy } from "@angular/core";

import { AteEditorCoreComponent } from "../editor-core/ate-editor-core.component";
import { AteEditorHostBase } from "./ate-editor-host-base";
import { ATE_DEFAULT_EDITOR_ID } from "../../config/ate-default-editor-id.token";

/**
 * Public, zero-ceremony entry point for composing your own editor: a Root
 * compound component that hosts `AteEditorCoreComponent` internally (which
 * self-provides `ATE_EDITOR_PROVIDERS`) and auto-scopes any UI chrome
 * projected inside it (`ate-toolbar`, `ate-bubble-menu`, `ate-slash-commands`,
 * ...) to THIS chassis's own editor — no `[editor]` input needed, and no risk
 * of it drifting to a different editor if another one becomes active
 * elsewhere on the page.
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
 * For chrome that must live outside this chassis (referencing the editor
 * explicitly by ID), see `AteEditorBrutComponent` — the same host, without the
 * auto-scoping magic. For full control over the DOM element hosting the
 * editor, use `AteEditorCoreComponent` (`[ateEditorCore]`) directly instead.
 */
@Component({
  selector: "ate-editor-chassis",
  exportAs: "ateEditorChassis",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ATE_DEFAULT_EDITOR_ID,
      useFactory: () => signal<string | undefined>(undefined),
    },
  ],
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
      [editorId]="editorId() ?? fallbackEditorId"
      [ariaLabel]="ariaLabel()"
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
export class AteEditorChassisComponent extends AteEditorHostBase {
  private static counter = 0;

  /** Stable per-instance fallback, used only when no explicit `[editorId]` is given. */
  protected readonly fallbackEditorId = `ate-chassis-${++AteEditorChassisComponent.counter}`;

  private readonly defaultEditorIdSignal = inject(ATE_DEFAULT_EDITOR_ID) as WritableSignal<
    string | undefined
  >;

  constructor() {
    super();
    // Set synchronously (not in an effect(), which is flushed AFTER this
    // synchronous tree-creation pass) so content projected into this chassis
    // never observes a transient "no default editor" state on first read.
    this.defaultEditorIdSignal.set(this.editorId() ?? this.fallbackEditorId);
  }
}
