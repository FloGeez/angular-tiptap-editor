import { Component, input, inject, ChangeDetectionStrategy } from "@angular/core";
import { Editor } from "@tiptap/core";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapSeparatorComponent } from "./tiptap-separator.component";
import { EditorCommandsService } from "./services/editor-commands.service";
import { TiptapI18nService } from "./services/i18n.service";
import { TiptapColorPickerComponent } from "./components/tiptap-color-picker.component";

import { ToolbarConfig } from "./models/toolbar.model";

@Component({
  selector: "tiptap-toolbar",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TiptapButtonComponent, TiptapSeparatorComponent, TiptapColorPickerComponent],
  template: `
    <div class="tiptap-toolbar" [class.floating]="floating()">
      @if (config().bold) {
        <tiptap-button
          icon="format_bold"
          [title]="t().bold"
          [active]="state().marks.bold"
          [disabled]="!state().can.toggleBold"
          (buttonClick)="onCommand('toggleBold')" />
      }
      @if (config().italic) {
        <tiptap-button
          icon="format_italic"
          [title]="t().italic"
          [active]="state().marks.italic"
          [disabled]="!state().can.toggleItalic"
          (buttonClick)="onCommand('toggleItalic')" />
      }
      @if (config().underline) {
        <tiptap-button
          icon="format_underlined"
          [title]="t().underline"
          [active]="state().marks.underline"
          [disabled]="!state().can.toggleUnderline"
          (buttonClick)="onCommand('toggleUnderline')" />
      }
      @if (config().strike) {
        <tiptap-button
          icon="strikethrough_s"
          [title]="t().strike"
          [active]="state().marks.strike"
          [disabled]="!state().can.toggleStrike"
          (buttonClick)="onCommand('toggleStrike')" />
      }
      @if (config().code) {
        <tiptap-button
          icon="code"
          [title]="t().code"
          [active]="state().marks.code"
          [disabled]="!state().can.toggleCode"
          (buttonClick)="onCommand('toggleCode')" />
      }
      @if (config().codeBlock) {
        <tiptap-button
          icon="terminal"
          [title]="t().codeBlock"
          [active]="state().nodes.isCodeBlock"
          [disabled]="!state().can.toggleCodeBlock"
          (buttonClick)="onCommand('toggleCodeBlock')" />
      }
      @if (config().superscript) {
        <tiptap-button
          icon="superscript"
          [title]="t().superscript"
          [active]="state().marks.superscript"
          [disabled]="!state().can.toggleSuperscript"
          (buttonClick)="onCommand('toggleSuperscript')" />
      }
      @if (config().subscript) {
        <tiptap-button
          icon="subscript"
          [title]="t().subscript"
          [active]="state().marks.subscript"
          [disabled]="!state().can.toggleSubscript"
          (buttonClick)="onCommand('toggleSubscript')" />
      }
      @if (config().highlight) {
        <tiptap-button
          icon="highlight"
          [title]="t().highlight"
          [active]="state().marks.highlight"
          [disabled]="!state().can.toggleHighlight"
          (buttonClick)="onCommand('toggleHighlight')" />
      }
      @if (config().highlightPicker) {
        <tiptap-color-picker mode="highlight" [editor]="editor()" [disabled]="!state().can.setHighlight" />
      }
      @if (config().textColor) {
        <tiptap-color-picker mode="text" [editor]="editor()" [disabled]="!state().can.setColor" />
      }

      @if (config().separator && (config().heading1 || config().heading2 || config().heading3)) {
        <tiptap-separator />
      }
      @if (config().heading1) {
        <tiptap-button
          icon="format_h1"
          [title]="t().heading1"
          [active]="state().nodes.h1"
          [disabled]="!state().can.toggleHeading1"
          (buttonClick)="onCommand('toggleHeading', 1)" />
      }
      @if (config().heading2) {
        <tiptap-button
          icon="format_h2"
          [title]="t().heading2"
          [active]="state().nodes.h2"
          [disabled]="!state().can.toggleHeading2"
          (buttonClick)="onCommand('toggleHeading', 2)" />
      }
      @if (config().heading3) {
        <tiptap-button
          icon="format_h3"
          [title]="t().heading3"
          [active]="state().nodes.h3"
          [disabled]="!state().can.toggleHeading3"
          (buttonClick)="onCommand('toggleHeading', 3)" />
      }
      @if (config().separator && (config().bulletList || config().orderedList || config().blockquote)) {
        <tiptap-separator />
      }
      @if (config().bulletList) {
        <tiptap-button
          icon="format_list_bulleted"
          [title]="t().bulletList"
          [active]="state().nodes.isBulletList"
          [disabled]="!state().can.toggleBulletList"
          (buttonClick)="onCommand('toggleBulletList')" />
      }
      @if (config().orderedList) {
        <tiptap-button
          icon="format_list_numbered"
          [title]="t().orderedList"
          [active]="state().nodes.isOrderedList"
          [disabled]="!state().can.toggleOrderedList"
          (buttonClick)="onCommand('toggleOrderedList')" />
      }
      @if (config().blockquote) {
        <tiptap-button
          icon="format_quote"
          [title]="t().blockquote"
          [active]="state().nodes.isBlockquote"
          [disabled]="!state().can.toggleBlockquote"
          (buttonClick)="onCommand('toggleBlockquote')" />
      }
      @if (
        config().separator &&
        (config().alignLeft || config().alignCenter || config().alignRight || config().alignJustify)
      ) {
        <tiptap-separator />
      }
      @if (config().alignLeft) {
        <tiptap-button
          icon="format_align_left"
          [title]="t().alignLeft"
          [active]="state().nodes.alignLeft"
          [disabled]="!state().can.setTextAlignLeft"
          (buttonClick)="onCommand('setTextAlign', 'left')" />
      }
      @if (config().alignCenter) {
        <tiptap-button
          icon="format_align_center"
          [title]="t().alignCenter"
          [active]="state().nodes.alignCenter"
          [disabled]="!state().can.setTextAlignCenter"
          (buttonClick)="onCommand('setTextAlign', 'center')" />
      }
      @if (config().alignRight) {
        <tiptap-button
          icon="format_align_right"
          [title]="t().alignRight"
          [active]="state().nodes.alignRight"
          [disabled]="!state().can.setTextAlignRight"
          (buttonClick)="onCommand('setTextAlign', 'right')" />
      }
      @if (config().alignJustify) {
        <tiptap-button
          icon="format_align_justify"
          [title]="t().alignJustify"
          [active]="state().nodes.alignJustify"
          [disabled]="!state().can.setTextAlignJustify"
          (buttonClick)="onCommand('setTextAlign', 'justify')" />
      }
      @if (config().separator && (config().link || config().horizontalRule)) {
        <tiptap-separator />
      }
      @if (config().link) {
        <tiptap-button
          icon="link"
          [title]="t().link"
          [active]="state().marks.link"
          [disabled]="!state().can.toggleLink"
          (buttonClick)="onCommand('toggleLink', $event)" />
      }
      @if (config().horizontalRule) {
        <tiptap-button
          icon="horizontal_rule"
          [title]="t().horizontalRule"
          [disabled]="!state().can.insertHorizontalRule"
          (buttonClick)="onCommand('insertHorizontalRule')" />
      }
      @if (config().table) {
        <tiptap-button
          icon="table_view"
          [title]="t().table"
          [disabled]="!state().can.insertTable"
          (buttonClick)="onCommand('insertTable')" />
      }
      @if (config().separator && config().image) {
        <tiptap-separator />
      }
      @if (config().image) {
        <tiptap-button
          icon="image"
          [title]="t().image"
          [disabled]="!state().can.insertImage"
          (buttonClick)="onCommand('insertImage', imageUpload())" />
      }
      @if (config().separator && (config().undo || config().redo)) {
        <tiptap-separator />
      }
      @if (config().undo) {
        <tiptap-button
          icon="undo"
          [title]="t().undo"
          [disabled]="!state().can.undo"
          (buttonClick)="onCommand('undo')" />
      }
      @if (config().redo) {
        <tiptap-button
          icon="redo"
          [title]="t().redo"
          [disabled]="!state().can.redo"
          (buttonClick)="onCommand('redo')" />
      }
      @if (config().separator && config().clear) {
        <tiptap-separator />
      }
      @if (config().clear) {
        <tiptap-button
          icon="delete"
          [title]="t().clear"
          [disabled]="!state().isEditable"
          (buttonClick)="onCommand('clearContent')" />
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        transition: opacity 0.3s ease;
      }

      :host-context(.floating-toolbar) {
        position: sticky;
        top: 3rem;
        left: 0;
        right: 0;
        z-index: 100;
        display: flex;
        height: 0;
        overflow: visible;
        pointer-events: none; /* Let clicks pass through to content if not on toolbar */
        opacity: 0;
      }

      :host-context(.floating-toolbar:focus-within),
      :host-context(.floating-toolbar:hover) {
        opacity: 1;
      }

      .tiptap-toolbar {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: var(--ate-toolbar-padding);
        background: var(--ate-toolbar-background);
        border-bottom: 1px solid var(--ate-toolbar-border-color);
        flex-wrap: wrap;
        min-height: 32px;
        position: relative;
        z-index: 50;
        border-top-left-radius: calc(var(--ate-menu-border-radius, 12px) - var(--ate-border-width, 2px));
        border-top-right-radius: calc(var(--ate-menu-border-radius, 12px) - var(--ate-border-width, 2px));
      }

      /* Floating Toolbar Mode */
      .tiptap-toolbar.floating {
        pointer-events: auto;
        border-radius: var(--ate-menu-border-radius, 12px);
        border: 1px solid var(--ate-menu-border) !important;
        box-shadow: var(--ate-menu-shadow) !important;
        background: var(--ate-menu-bg) !important;
        padding: var(--ate-menu-padding) !important;
        flex-wrap: nowrap;
        overflow-x: auto;
        max-width: 95vw;
        scrollbar-width: none;

        transform: translateY(0);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .tiptap-toolbar.floating::-webkit-scrollbar {
        display: none;
      }

      :host-context(.floating-toolbar:focus-within) .tiptap-toolbar.floating,
      :host-context(.floating-toolbar:hover) .tiptap-toolbar.floating {
        transform: translateY(-2rem);
      }

      @media (max-width: 768px) {
        .tiptap-toolbar {
          padding: 6px 8px;
          gap: 2px;
        }
      }

      @keyframes toolbarSlideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .tiptap-toolbar {
        animation: toolbarSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
    `,
  ],
})
export class TiptapToolbarComponent {
  editor = input.required<Editor>();
  config = input.required<ToolbarConfig>();
  imageUpload = input<Record<string, unknown>>({});
  floating = input<boolean>(false);

  private i18nService = inject(TiptapI18nService);
  private editorCommands = inject(EditorCommandsService);

  readonly t = this.i18nService.toolbar;
  readonly state = this.editorCommands.editorState;

  onCommand(command: string, ...args: unknown[]) {
    const editor = this.editor();
    if (!editor) return;
    this.editorCommands.execute(editor, command, ...args);
  }
}
