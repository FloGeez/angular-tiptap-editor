import { Signal } from "@angular/core";
import { Editor, JSONContent } from "@tiptap/core";
import { AteEditorCommandsService } from "../services/ate-editor-commands.service";
import { AteEditorStateSnapshot } from "./ate-editor-state.model";
import { AteImageUploadOptions } from "./ate-image.model";
import { AteExportFormat, AteExportOptions } from "../services/ate-export.service";

/**
 * A wrapper class that holds a reference to a registered editor component.
 * It provides direct, type-safe facade methods to interact with the editor
 * and execute formatting/utility commands without needing to manage the raw
 * TipTap editor instance directly.
 */
export class AteEditorRef {
  constructor(
    public readonly id: string,
    private readonly getEditorInstance: () => Editor | null,
    public readonly commandsService: AteEditorCommandsService
  ) {}

  /** Get the raw TipTap Editor instance. */
  get editor(): Editor | null {
    return this.getEditorInstance();
  }

  /** Get the current editor state snapshot. */
  get state(): AteEditorStateSnapshot {
    return this.commandsService.editorState();
  }

  /** Get the reactive editor state as a Signal. */
  get stateSignal(): Signal<AteEditorStateSnapshot> {
    return this.commandsService.editorState;
  }

  /** Execute a generic command by name. */
  execute(command: string, ...args: unknown[]): void {
    const editor = this.editor;
    if (editor) {
      this.commandsService.execute(editor, command, ...args);
    }
  }

  // ============================================
  // Facade Formatting Commands
  // ============================================

  toggleBold(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleBold(editor);}
  }

  toggleItalic(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleItalic(editor);}
  }

  toggleStrike(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleStrike(editor);}
  }

  toggleCode(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleCode(editor);}
  }

  toggleCodeBlock(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleCodeBlock(editor);}
  }

  toggleUnderline(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleUnderline(editor);}
  }

  toggleSuperscript(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleSuperscript(editor);}
  }

  toggleSubscript(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleSubscript(editor);}
  }

  toggleHeading(level: 1 | 2 | 3): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleHeading(editor, level);}
  }

  toggleBulletList(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleBulletList(editor);}
  }

  toggleOrderedList(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleOrderedList(editor);}
  }

  toggleBlockquote(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleBlockquote(editor);}
  }

  setTextAlign(alignment: "left" | "center" | "right" | "justify"): void {
    const editor = this.editor;
    if (editor) {this.commandsService.setTextAlign(editor, alignment);}
  }

  insertHorizontalRule(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.insertHorizontalRule(editor);}
  }

  insertImage(options: AteImageUploadOptions): void {
    const editor = this.editor;
    if (editor) {this.commandsService.insertImage(editor, options);}
  }

  uploadImage(file: File, options?: AteImageUploadOptions): void {
    const editor = this.editor;
    if (editor) {this.commandsService.uploadImage(editor, file, options);}
  }

  toggleHighlight(color: string): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleHighlight(editor, color);}
  }

  undo(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.undo(editor);}
  }

  redo(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.redo(editor);}
  }

  // ============================================
  // Table Commands
  // ============================================

  insertTable(rows?: number, cols?: number): void {
    const editor = this.editor;
    if (editor) {this.commandsService.insertTable(editor, rows, cols);}
  }

  addColumnBefore(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.addColumnBefore(editor);}
  }

  addColumnAfter(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.addColumnAfter(editor);}
  }

  deleteColumn(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.deleteColumn(editor);}
  }

  addRowBefore(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.addRowBefore(editor);}
  }

  addRowAfter(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.addRowAfter(editor);}
  }

  deleteRow(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.deleteRow(editor);}
  }

  deleteTable(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.deleteTable(editor);}
  }

  mergeCells(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.mergeCells(editor);}
  }

  splitCell(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.splitCell(editor);}
  }

  toggleHeaderColumn(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleHeaderColumn(editor);}
  }

  toggleHeaderRow(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.toggleHeaderRow(editor);}
  }

  // ============================================
  // Color Picker & Link Commands
  // ============================================

  applyColor(color: string, selectionOnly?: boolean, closeMenu?: boolean): void {
    const editor = this.editor;
    if (editor) {
      this.commandsService.execute(editor, "applyColor", color, selectionOnly, closeMenu);
    }
  }

  applyHighlight(color: string, selectionOnly?: boolean, closeMenu?: boolean): void {
    const editor = this.editor;
    if (editor) {
      this.commandsService.execute(editor, "applyHighlight", color, selectionOnly, closeMenu);
    }
  }

  unsetColor(selectionOnly?: boolean): void {
    const editor = this.editor;
    if (editor) {
      this.commandsService.execute(editor, "unsetColor", selectionOnly);
    }
  }

  unsetHighlight(selectionOnly?: boolean): void {
    const editor = this.editor;
    if (editor) {
      this.commandsService.execute(editor, "unsetHighlight", selectionOnly);
    }
  }

  toggleLink(event?: Event): void {
    const editor = this.editor;
    if (editor) {
      this.commandsService.execute(editor, "toggleLink", event);
    }
  }

  unsetLink(): void {
    const editor = this.editor;
    if (editor) {
      this.commandsService.execute(editor, "unsetLink");
    }
  }

  toggleColorPicker(mode: "text" | "highlight", event: Event): void {
    const editor = this.editor;
    if (editor) {
      this.commandsService.execute(editor, "toggleColorPicker", mode, event);
    }
  }

  // ============================================
  // General Controls & Content
  // ============================================

  clearContent(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.clearContent(editor);}
  }

  setContent(content: string, emitUpdate = true): void {
    const editor = this.editor;
    if (editor) {this.commandsService.setContent(editor, content, emitUpdate);}
  }

  getContent(format: AteExportFormat): string {
    const editor = this.editor;
    return editor ? this.commandsService.getContent(editor, format) : "";
  }

  getHTML(): string {
    const editor = this.editor;
    return editor ? editor.getHTML() : "";
  }

  getJSON(): JSONContent | undefined {
    const editor = this.editor;
    return editor ? editor.getJSON() : undefined;
  }

  getText(): string {
    const editor = this.editor;
    return editor ? editor.getText() : "";
  }

  async exportAs(
    format: AteExportFormat,
    method: "clipboard" | "download",
    options?: AteExportOptions
  ): Promise<void> {
    const editor = this.editor;
    if (editor) {
      await this.commandsService.exportAs(editor, format, method, options);
    }
  }

  focus(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.focus(editor);}
  }

  blur(): void {
    const editor = this.editor;
    if (editor) {this.commandsService.blur(editor);}
  }
}
