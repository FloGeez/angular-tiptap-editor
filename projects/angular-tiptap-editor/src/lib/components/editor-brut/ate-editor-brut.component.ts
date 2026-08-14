import { Component, ChangeDetectionStrategy } from "@angular/core";

import { AteEditorCoreComponent } from "../editor-core/ate-editor-core.component";
import { AteEditorHostBase } from "../editor-chassis/ate-editor-host-base";

/**
 * The same host as `AteEditorChassisComponent`, minus the magic: no content
 * projection, no auto-scoping. A real, publicly-usable element tag (unlike
 * `AteEditorCoreComponent`'s attribute selector), for when you want the
 * batteries-included registration/lifecycle wiring but will place chrome
 * elsewhere — referencing this editor explicitly by ID or ref, the same
 * pattern documented under "Standalone Chrome Components".
 *
 * @example
 * ```html
 * <ate-toolbar [editor]="'my-doc'" />
 * <ate-editor-brut [editorId]="'my-doc'" [content]="content" />
 * ```
 *
 * Needs no `providers` of its own — `AteEditorCoreComponent` self-provides
 * `ATE_EDITOR_PROVIDERS`. Still stamps its own `registeredId()` as a DOM
 * attribute like Chassis does (see `ATE_EDITOR_SCOPE_ATTR` in
 * `ate-editor-ref-resolver.ts`) — inert today since this component has no
 * content-projection slot of its own, but keeps the invariant intact if one
 * is ever added.
 *
 * `[theme]="'dark'"` themes just this instance, independent of the rest of
 * the page (see the "per-instance" dark block in
 * styles/ate-variables.global.css for why that needs its own dedicated
 * rule instead of a plain page-wide `.dark` class).
 */
@Component({
  selector: "ate-editor-brut",
  exportAs: "ateEditorBrut",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    "[class.dark]": "theme() === 'dark'",
    "[attr.data-theme]": "theme()",
    "[attr.data-ate-editor-id]": "registeredId()",
  },
  imports: [AteEditorCoreComponent],
  template: `
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
  `,
})
export class AteEditorBrutComponent extends AteEditorHostBase {}
