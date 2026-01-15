import { Component, input, inject, ChangeDetectionStrategy } from "@angular/core";
import { Editor } from "@tiptap/core";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapSeparatorComponent } from "./tiptap-separator.component";
import { EditorCommandsService } from "./services/editor-commands.service";
import { TiptapI18nService } from "./services/i18n.service";
import { EditorStateSnapshot } from "./models/editor-state.model";
import { TiptapColorPickerComponent } from "./components/tiptap-color-picker.component";

import { ToolbarConfig } from "./models/toolbar.model";

@Component({
  selector: "tiptap-toolbar",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TiptapButtonComponent,
    TiptapSeparatorComponent,
    TiptapColorPickerComponent,
  ],
  template: `
    <div class="tiptap-toolbar">
      @if (config().bold) {
      <tiptap-button
        icon="format_bold"
        [title]="t().bold"
        [active]="state().marks.bold"
        [disabled]="!state().can.toggleBold"
        (onClick)="onCommand('toggleBold')"
      />
      } @if (config().italic) {
      <tiptap-button
        icon="format_italic"
        [title]="t().italic"
        [active]="state().marks.italic"
        [disabled]="!state().can.toggleItalic"
        (onClick)="onCommand('toggleItalic')"
      />
      } @if (config().underline) {
      <tiptap-button
        icon="format_underlined"
        [title]="t().underline"
        [active]="state().marks.underline"
        [disabled]="!state().can.toggleUnderline"
        (onClick)="onCommand('toggleUnderline')"
      />
      } @if (config().strike) {
      <tiptap-button
        icon="strikethrough_s"
        [title]="t().strike"
        [active]="state().marks.strike"
        [disabled]="!state().can.toggleStrike"
        (onClick)="onCommand('toggleStrike')"
      />
      } @if (config().code) {
      <tiptap-button
        icon="code"
        [title]="t().code"
        [active]="state().marks.code"
        [disabled]="!state().can.toggleCode"
        (onClick)="onCommand('toggleCode')"
      />
      } @if (config().codeBlock) {
      <tiptap-button
        icon="terminal"
        [title]="t().codeBlock"
        [active]="state().nodes.isCodeBlock"
        [disabled]="!state().can.toggleCodeBlock"
        (onClick)="onCommand('toggleCodeBlock')"
      />
      } @if (config().superscript) {
      <tiptap-button
        icon="superscript"
        [title]="t().superscript"
        [active]="state().marks.superscript"
        [disabled]="!state().can.toggleSuperscript"
        (onClick)="onCommand('toggleSuperscript')"
      />
      } @if (config().subscript) {
      <tiptap-button
        icon="subscript"
        [title]="t().subscript"
        [active]="state().marks.subscript"
        [disabled]="!state().can.toggleSubscript"
        (onClick)="onCommand('toggleSubscript')"
      />
      } @if (config().highlight) {
      <tiptap-button
        icon="highlight"
        [title]="t().highlight"
        [active]="state().marks.highlight"
        [disabled]="!state().can.toggleHighlight"
        (onClick)="onCommand('toggleHighlight')"
      />
      } @if (config().highlightPicker) {
      <tiptap-color-picker 
        mode="highlight" 
        [editor]="editor()" 
        [disabled]="!state().can.setHighlight"
      />
      } @if (config().textColor) {
      <tiptap-color-picker 
        mode="text" 
        [editor]="editor()" 
        [disabled]="!state().can.setColor"
      />
      }
      
      @if (config().separator && (config().heading1 || config().heading2 || config().heading3)) {
      <tiptap-separator />
      } @if (config().heading1) {
      <tiptap-button
        icon="format_h1"
        [title]="t().heading1"
        [active]="state().nodes.h1"
        [disabled]="!state().can.toggleHeading1"
        (onClick)="onCommand('toggleHeading', 1)"
      />
      } @if (config().heading2) {
      <tiptap-button
        icon="format_h2"
        [title]="t().heading2"
        [active]="state().nodes.h2"
        [disabled]="!state().can.toggleHeading2"
        (onClick)="onCommand('toggleHeading', 2)"
      />
      } @if (config().heading3) {
      <tiptap-button
        icon="format_h3"
        [title]="t().heading3"
        [active]="state().nodes.h3"
        [disabled]="!state().can.toggleHeading3"
        (onClick)="onCommand('toggleHeading', 3)"
      />
      } @if (config().separator && (config().bulletList || config().orderedList || config().blockquote)) {
      <tiptap-separator />
      } @if (config().bulletList) {
      <tiptap-button
        icon="format_list_bulleted"
        [title]="t().bulletList"
        [active]="state().nodes.isBulletList"
        [disabled]="!state().can.toggleBulletList"
        (onClick)="onCommand('toggleBulletList')"
      />
      } @if (config().orderedList) {
      <tiptap-button
        icon="format_list_numbered"
        [title]="t().orderedList"
        [active]="state().nodes.isOrderedList"
        [disabled]="!state().can.toggleOrderedList"
        (onClick)="onCommand('toggleOrderedList')"
      />
      } @if (config().blockquote) {
      <tiptap-button
        icon="format_quote"
        [title]="t().blockquote"
        [active]="state().nodes.isBlockquote"
        [disabled]="!state().can.toggleBlockquote"
        (onClick)="onCommand('toggleBlockquote')"
      />
      } @if (config().separator && (config().alignLeft || config().alignCenter || config().alignRight || config().alignJustify)) {
      <tiptap-separator />
      } @if (config().alignLeft) {
      <tiptap-button
        icon="format_align_left"
        [title]="t().alignLeft"
        [active]="state().nodes.alignLeft"
        [disabled]="!state().can.setTextAlignLeft"
        (onClick)="onCommand('setTextAlign', 'left')"
      />
      } @if (config().alignCenter) {
      <tiptap-button
        icon="format_align_center"
        [title]="t().alignCenter"
        [active]="state().nodes.alignCenter"
        [disabled]="!state().can.setTextAlignCenter"
        (onClick)="onCommand('setTextAlign', 'center')"
      />
      } @if (config().alignRight) {
      <tiptap-button
        icon="format_align_right"
        [title]="t().alignRight"
        [active]="state().nodes.alignRight"
        [disabled]="!state().can.setTextAlignRight"
        (onClick)="onCommand('setTextAlign', 'right')"
      />
      } @if (config().alignJustify) {
      <tiptap-button
        icon="format_align_justify"
        [title]="t().alignJustify"
        [active]="state().nodes.alignJustify"
        [disabled]="!state().can.setTextAlignJustify"
        (onClick)="onCommand('setTextAlign', 'justify')"
      />
      } @if (config().separator && (config().link || config().horizontalRule)) {
      <tiptap-separator />
      } @if (config().link) {
      <tiptap-button
        icon="link"
        [title]="t().link"
        [active]="state().marks.link"
        [disabled]="!state().can.toggleLink"
        (onClick)="onCommand('toggleLink', $event)"
      />
      } @if (config().horizontalRule) {
      <tiptap-button
        icon="horizontal_rule"
        [title]="t().horizontalRule"
        [disabled]="!state().can.insertHorizontalRule"
        (onClick)="onCommand('insertHorizontalRule')"
      />
      } @if (config().table) {
      <tiptap-button
        icon="table_view"
        [title]="t().table"
        [disabled]="!state().can.insertTable"
        (onClick)="onCommand('insertTable')"
      />
      } @if (config().separator && config().image) {
      <tiptap-separator />
      } @if (config().image) {
      <tiptap-button
        icon="image"
        [title]="t().image"
        [disabled]="!state().can.insertImage"
        (onClick)="onCommand('insertImage', imageUpload())"
      />
      } @if (config().separator && (config().undo || config().redo)) {
      <tiptap-separator />
      } @if (config().undo) {
      <tiptap-button
        icon="undo"
        [title]="t().undo"
        [disabled]="!state().can.undo"
        (onClick)="onCommand('undo')"
      />
      } @if (config().redo) {
      <tiptap-button
        icon="redo"
        [title]="t().redo"
        [disabled]="!state().can.redo"
        (onClick)="onCommand('redo')"
      />
      } @if (config().separator && config().clear) {
      <tiptap-separator />
      } @if (config().clear) {
      <tiptap-button
        icon="delete"
        [title]="t().clear"
        [disabled]="!state().isEditable"
        (onClick)="onCommand('clearContent')"
      />
      }
    </div>
  `,
  styles: [
    `
      .tiptap-toolbar {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: var(--ate-toolbar-background);
        border-bottom: 1px solid var(--ate-toolbar-border-color);
        flex-wrap: wrap;
        min-height: 32px;
        position: relative;
        z-index: 50;
        backdrop-filter: blur(var(--ate-menu-blur, 16px));
        border-top-left-radius: calc(var(--ate-border-radius, 8px) - var(--ate-border-width, 2px));
        border-top-right-radius: calc(var(--ate-border-radius, 8px) - var(--ate-border-width, 2px));
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
  imageUpload = input<any>({});

  private i18nService = inject(TiptapI18nService);
  private editorCommands = inject(EditorCommandsService);

  readonly t = this.i18nService.toolbar;
  readonly state = this.editorCommands.editorState;

  onCommand(command: string, ...args: any[]) {
    const editor = this.editor();
    if (!editor) return;
    this.editorCommands.execute(editor, command, ...args);
  }
}
