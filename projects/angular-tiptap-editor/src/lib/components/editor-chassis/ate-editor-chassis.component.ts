import { Component, ChangeDetectionStrategy } from "@angular/core";

import { AteEditorCoreComponent } from "../editor-core/ate-editor-core.component";
import { AteEditorHostBase } from "./ate-editor-host-base";

/**
 * Public, zero-ceremony entry point for composing your own editor: a Root
 * compound component that hosts `AteEditorCoreComponent` internally (which
 * self-provides `ATE_EDITOR_PROVIDERS`) and auto-scopes any UI chrome
 * rendered inside it (`ate-toolbar`, `ate-bubble-menu`, `ate-slash-commands`,
 * ...) to THIS chassis's own editor — no `[editor]` input needed, and no risk
 * of it drifting to a different editor if another one becomes active
 * elsewhere on the page. The scoping follows the real DOM (see
 * `ATE_EDITOR_SCOPE_ATTR` in `ate-editor-ref-resolver.ts`), so it holds even
 * for chrome projected through another component that wraps this chassis.
 *
 * @example Bare editor, no chrome
 * ```html
 * <ate-editor-chassis [content]="content" (contentChange)="content = $event" />
 * ```
 *
 * @example With a toolbar and block controls
 * ```html
 * <ate-editor-chassis [content]="content">
 *   <ate-toolbar />
 *   <ate-block-controls />
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
 *
 * `[theme]="'dark'"` themes just this instance, independent of the rest of
 * the page (see the "per-instance" dark block in
 * styles/ate-variables.global.css for why that needs its own dedicated
 * rule instead of a plain page-wide `.dark` class).
 */
@Component({
  selector: "ate-editor-chassis",
  exportAs: "ateEditorChassis",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class.dark]": "theme() === 'dark'",
    "[attr.data-theme]": "theme()",
    "[attr.data-ate-editor-id]": "registeredId()",
  },
  imports: [AteEditorCoreComponent],
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
      }
      [ateHeader],
      [ateFooter] {
        display: contents;
      }
    `,
  ],
  template: `
    <ng-content select="[ateHeader], ate-toolbar, [header]"></ng-content>
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
      [theme]="theme()"
      (contentChange)="contentChange.emit($event)"
      (editorCreated)="editorCreated.emit($event)"
      (editorUpdate)="editorUpdate.emit($event)"
      (editorFocus)="editorFocus.emit($event)"
      (editorBlur)="editorBlur.emit($event)"
      (imageUploaded)="imageUploaded.emit($event)"></div>
    <!-- eslint-enable @angular-eslint/template/no-autofocus -->
    <ng-content select="[ateFooter], ate-footer, [footer]"></ng-content>
    <ng-content></ng-content>
  `,
})
export class AteEditorChassisComponent extends AteEditorHostBase {
  private static counter = 0;

  /** Stable per-instance fallback, used only when no explicit `[editorId]` is given. */
  protected readonly fallbackEditorId = `ate-chassis-${++AteEditorChassisComponent.counter}`;
}
