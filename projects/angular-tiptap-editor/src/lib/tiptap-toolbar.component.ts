import { Component, input, inject, ChangeDetectionStrategy } from "@angular/core";
import { Editor } from "@tiptap/core";
import { TiptapButtonComponent } from "./tiptap-button.component";
import { TiptapSeparatorComponent } from "./tiptap-separator.component";
import { EditorCommandsService } from "./services/editor-commands.service";
import { TiptapI18nService } from "./services/i18n.service";
import { TiptapColorPickerComponent } from "./components/tiptap-color-picker.component";

export interface ToolbarConfig {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  highlight?: boolean;
  highlightPicker?: boolean;
  heading1?: boolean;
  heading2?: boolean;
  heading3?: boolean;
  bulletList?: boolean;
  orderedList?: boolean;
  blockquote?: boolean;
  alignLeft?: boolean;
  alignCenter?: boolean;
  alignRight?: boolean;
  alignJustify?: boolean;
  link?: boolean;
  image?: boolean;
  horizontalRule?: boolean;
  table?: boolean;
  undo?: boolean;
  redo?: boolean;
  clear?: boolean;
  textColor?: boolean;
  separator?: boolean;
}

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
        [active]="isActive('bold')"
        [disabled]="!canExecute('toggleBold')"
        (onClick)="onCommand('toggleBold')"
      />
      } @if (config().italic) {
      <tiptap-button
        icon="format_italic"
        [title]="t().italic"
        [active]="isActive('italic')"
        [disabled]="!canExecute('toggleItalic')"
        (onClick)="onCommand('toggleItalic')"
      />
      } @if (config().underline) {
      <tiptap-button
        icon="format_underlined"
        [title]="t().underline"
        [active]="isActive('underline')"
        [disabled]="!canExecute('toggleUnderline')"
        (onClick)="onCommand('toggleUnderline')"
      />
      } @if (config().strike) {
      <tiptap-button
        icon="strikethrough_s"
        [title]="t().strike"
        [active]="isActive('strike')"
        [disabled]="!canExecute('toggleStrike')"
        (onClick)="onCommand('toggleStrike')"
      />
      } @if (config().code) {
      <tiptap-button
        icon="code"
        [title]="t().code"
        [active]="isActive('code')"
        [disabled]="!canExecute('toggleCode')"
        (onClick)="onCommand('toggleCode')"
      />
      } @if (config().superscript) {
      <tiptap-button
        icon="superscript"
        [title]="t().superscript"
        [active]="isActive('superscript')"
        [disabled]="!canExecute('toggleSuperscript')"
        (onClick)="onCommand('toggleSuperscript')"
      />
      } @if (config().subscript) {
      <tiptap-button
        icon="subscript"
        [title]="t().subscript"
        [active]="isActive('subscript')"
        [disabled]="!canExecute('toggleSubscript')"
        (onClick)="onCommand('toggleSubscript')"
      />
      } @if (config().highlight) {
      <tiptap-button
        icon="highlight"
        [title]="t().highlight"
        [active]="isActive('highlight')"
        [disabled]="!canExecute('toggleHighlight')"
        (onClick)="onCommand('toggleHighlight')"
      />
      } @if (config().highlightPicker) {
      <tiptap-color-picker 
        mode="highlight" 
        [editor]="editor()" 
        [disabled]="!canExecute('setHighlight')"
      />
      } @if (config().textColor) {
      <tiptap-color-picker 
        mode="text" 
        [editor]="editor()" 
        [disabled]="!canExecute('setColor')"
      />
      }
 @if (config().separator && (config().heading1 || config().heading2 ||
      config().heading3)) {
      <tiptap-separator />
      } @if (config().heading1) {
      <tiptap-button
        icon="format_h1"
        [title]="t().heading1"
        [active]="isActive('heading', { level: 1 })"
        (onClick)="onCommand('toggleHeading', 1)"
      />
      } @if (config().heading2) {
      <tiptap-button
        icon="format_h2"
        [title]="t().heading2"
        [active]="isActive('heading', { level: 2 })"
        (onClick)="onCommand('toggleHeading', 2)"
      />
      } @if (config().heading3) {
      <tiptap-button
        icon="format_h3"
        [title]="t().heading3"
        [active]="isActive('heading', { level: 3 })"
        (onClick)="onCommand('toggleHeading', 3)"
      />
      } @if (config().separator && (config().bulletList || config().orderedList
      || config().blockquote)) {
      <tiptap-separator />
      } @if (config().bulletList) {
      <tiptap-button
        icon="format_list_bulleted"
        [title]="t().bulletList"
        [active]="isActive('bulletList')"
        (onClick)="onCommand('toggleBulletList')"
      />
      } @if (config().orderedList) {
      <tiptap-button
        icon="format_list_numbered"
        [title]="t().orderedList"
        [active]="isActive('orderedList')"
        (onClick)="onCommand('toggleOrderedList')"
      />
      } @if (config().blockquote) {
      <tiptap-button
        icon="format_quote"
        [title]="t().blockquote"
        [active]="isActive('blockquote')"
        (onClick)="onCommand('toggleBlockquote')"
      />
      } @if (config().separator && (config().alignLeft || config().alignCenter
      || config().alignRight || config().alignJustify)) {
      <tiptap-separator />
      } @if (config().alignLeft) {
      <tiptap-button
        icon="format_align_left"
        [title]="t().alignLeft"
        [active]="isActive('textAlign', { textAlign: 'left' })"
        (onClick)="onCommand('setTextAlign', 'left')"
      />
      } @if (config().alignCenter) {
      <tiptap-button
        icon="format_align_center"
        [title]="t().alignCenter"
        [active]="isActive('textAlign', { textAlign: 'center' })"
        (onClick)="onCommand('setTextAlign', 'center')"
      />
      } @if (config().alignRight) {
      <tiptap-button
        icon="format_align_right"
        [title]="t().alignRight"
        [active]="isActive('textAlign', { textAlign: 'right' })"
        (onClick)="onCommand('setTextAlign', 'right')"
      />
      } @if (config().alignJustify) {
      <tiptap-button
        icon="format_align_justify"
        [title]="t().alignJustify"
        [active]="isActive('textAlign', { textAlign: 'justify' })"
        (onClick)="onCommand('setTextAlign', 'justify')"
      />
      } @if (config().separator && (config().link || config().horizontalRule)) {
      <tiptap-separator />
      } @if (config().link) {
      <tiptap-button
        icon="link"
        [title]="t().link"
        [active]="isActive('link')"
        (onClick)="onCommand('toggleLink')"
      />
      } @if (config().horizontalRule) {
      <tiptap-button
        icon="horizontal_rule"
        [title]="t().horizontalRule"
        (onClick)="onCommand('insertHorizontalRule')"
      />
      } @if (config().table) {
      <tiptap-button
        icon="table_view"
        [title]="t().table"
        (onClick)="onCommand('insertTable')"
      />
      } @if (config().separator && config().image) {
      <tiptap-separator />
      } @if (config().image) {
      <tiptap-button
        icon="image"
        [title]="t().image"
        (onClick)="onCommand('insertImage', imageUpload())"
      />
      } @if (config().separator && (config().undo || config().redo)) {
      <tiptap-separator />
      } @if (config().undo) {
      <tiptap-button
        icon="undo"
        [title]="t().undo"
        [disabled]="!canExecute('undo')"
        (onClick)="onCommand('undo')"
      />
      } @if (config().redo) {
      <tiptap-button
        icon="redo"
        [title]="t().redo"
        [disabled]="!canExecute('redo')"
        (onClick)="onCommand('redo')"
      />
      } @if (config().separator && config().clear) {
      <tiptap-separator />
      } @if (config().clear) {
      <tiptap-button
        icon="delete"
        [title]="t().clear"
        (onClick)="onCommand('clearContent')"
      />
      }
    </div>
  `,
  styles: [
    `
      /* Styles de base pour la toolbar */
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

      /* Groupe de boutons */
      .toolbar-group {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 0 4px;
      }

      /* Séparateur entre groupes */
      .toolbar-separator {
        width: 1px;
        height: 24px;
        background: var(--ate-toolbar-border-color);
        margin: 0 4px;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .tiptap-toolbar {
          padding: 6px 8px;
          gap: 2px;
        }

        .toolbar-group {
          gap: 1px;
        }
      }

      /* Animation d'apparition */
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

  // Computed values pour les traductions
  readonly t = this.i18nService.toolbar;

  constructor(private editorCommands: EditorCommandsService) { }

  isActive(name: string, attributes?: Record<string, any>): boolean {
    return this.editorCommands.isActive(this.editor(), name, attributes);
  }

  canExecute(command: string): boolean {
    return this.editorCommands.canExecute(this.editor(), command);
  }

  onCommand(command: string, ...args: any[]) {
    this.editorCommands.execute(this.editor(), command, ...args);
  }
}
