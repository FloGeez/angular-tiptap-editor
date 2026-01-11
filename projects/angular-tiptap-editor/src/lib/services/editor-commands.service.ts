import { Injectable, inject, signal } from "@angular/core";
import { Editor } from "@tiptap/core";
import { ImageService, ImageUploadHandler } from "./image.service";
import { EditorStateSnapshot, INITIAL_EDITOR_STATE } from "../models/editor-state.model";

@Injectable({
  providedIn: "root",
})
export class EditorCommandsService {
  private imageService = inject(ImageService);
  private readonly _editorState = signal<EditorStateSnapshot>(INITIAL_EDITOR_STATE, {
    equal: (a, b) => {
      // 1. Primitive global states
      if (a.isFocused !== b.isFocused || a.isEditable !== b.isEditable) return false;

      // 2. Detailed selection comparison
      if (
        a.selection.from !== b.selection.from ||
        a.selection.to !== b.selection.to ||
        a.selection.type !== b.selection.type ||
        a.selection.empty !== b.selection.empty ||
        a.selection.isSingleCell !== b.selection.isSingleCell
      ) return false;

      // Helper for object comparison
      const isRecordEqual = (objA: Record<string, any>, objB: Record<string, any>) => {
        const keysA = Object.keys(objA);
        const keysB = Object.keys(objB);
        if (keysA.length !== keysB.length) return false;
        return keysA.every(key => objA[key] === objB[key]);
      };

      // 3. Compare sub-states (marks, can, nodes)
      if (!isRecordEqual(a.marks, b.marks)) return false;
      if (!isRecordEqual(a.can, b.can)) return false;
      if (!isRecordEqual(a.nodes, b.nodes)) return false;

      // 4. Compare custom extension states
      if (!isRecordEqual(a.custom, b.custom)) return false;

      return true;
    }
  });

  /** Exposed editor state as a readonly signal */
  readonly editorState = this._editorState.asReadonly();

  // Access to ImageService states as readonly signals for UI binding
  readonly isUploading = this.imageService.isUploading.asReadonly();
  readonly uploadProgress = this.imageService.uploadProgress.asReadonly();
  readonly uploadMessage = this.imageService.uploadMessage.asReadonly();
  set uploadHandler(handler: ImageUploadHandler | null) { this.imageService.uploadHandler = handler; }

  /** Update state (called by TiptapStateExtension) */
  updateState(state: EditorStateSnapshot) {
    this._editorState.set(state);
  }

  /** Generic method to execute any command by name */
  execute(editor: Editor, command: string, ...args: any[]): void {
    if (!editor) return;

    switch (command) {
      case "toggleBold": this.toggleBold(editor); break;
      case "toggleItalic": this.toggleItalic(editor); break;
      case "toggleStrike": this.toggleStrike(editor); break;
      case "toggleCode": this.toggleCode(editor); break;
      case "toggleUnderline": this.toggleUnderline(editor); break;
      case "toggleSuperscript": this.toggleSuperscript(editor); break;
      case "toggleSubscript": this.toggleSubscript(editor); break;
      case "toggleHeading": this.toggleHeading(editor, args[0] as 1 | 2 | 3); break;
      case "toggleBulletList": this.toggleBulletList(editor); break;
      case "toggleOrderedList": this.toggleOrderedList(editor); break;
      case "toggleBlockquote": this.toggleBlockquote(editor); break;
      case "setTextAlign": this.setTextAlign(editor, args[0] as any); break;
      case "toggleLink": this.toggleLink(editor, args[0] as string); break;
      case "insertHorizontalRule": this.insertHorizontalRule(editor); break;
      case "insertImage": this.insertImage(editor, args[0]); break;
      case "uploadImage": this.uploadImage(editor, args[0], args[1]); break;
      case "toggleHighlight": this.toggleHighlight(editor, args[0] as string); break;
      case "undo": this.undo(editor); break;
      case "redo": this.redo(editor); break;
      case "insertTable": this.insertTable(editor, args[0], args[1]); break;
      case "addColumnBefore": this.addColumnBefore(editor); break;
      case "addColumnAfter": this.addColumnAfter(editor); break;
      case "deleteColumn": this.deleteColumn(editor); break;
      case "addRowBefore": this.addRowBefore(editor); break;
      case "addRowAfter": this.addRowAfter(editor); break;
      case "deleteRow": this.deleteRow(editor); break;
      case "deleteTable": this.deleteTable(editor); break;
      case "mergeCells": this.mergeCells(editor); break;
      case "splitCell": this.splitCell(editor); break;
      case "toggleHeaderColumn": this.toggleHeaderColumn(editor); break;
      case "toggleHeaderRow": this.toggleHeaderRow(editor); break;
      case "clearContent": this.clearContent(editor); break;
    }
  }

  // --- Formatting Commands ---

  toggleBold(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().toggleBold().run();
  }

  toggleItalic(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().toggleItalic().run();
  }

  toggleStrike(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().toggleStrike().run();
  }

  toggleCode(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().toggleCode().run();
  }

  toggleUnderline(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().toggleUnderline().run();
  }

  toggleSuperscript(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().toggleSuperscript().run();
  }

  toggleSubscript(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().toggleSubscript().run();
  }

  toggleHeading(editor: Editor, level: 1 | 2 | 3): void {
    if (!editor) return;
    editor.chain().focus().toggleHeading({ level }).run();
  }

  toggleHighlight(editor: Editor, color?: string): void {
    if (!editor) return;
    if (color) {
      editor.chain().focus().setHighlight({ color }).run();
    } else {
      editor.chain().focus().toggleHighlight().run();
    }
  }

  toggleLink(editor: Editor, url?: string): void {
    if (!editor) return;
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      editor.chain().focus().unsetLink().run();
    }
  }

  // --- Structure Commands ---

  toggleBulletList(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().toggleOrderedList().run();
  }

  toggleBlockquote(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().toggleBlockquote().run();
  }

  setTextAlign(editor: Editor, alignment: "left" | "center" | "right" | "justify"): void {
    if (!editor) return;
    editor.chain().focus().setTextAlign(alignment).run();
  }

  insertHorizontalRule(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().setHorizontalRule().run();
  }

  // --- History Commands ---

  undo(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().undo().run();
  }

  redo(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().redo().run();
  }

  // --- Table Commands ---

  insertTable(editor: Editor, rows: number = 3, cols: number = 3): void {
    if (!editor) return;
    editor.chain().focus().insertTable({ rows, cols }).run();
  }

  addColumnBefore(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().addColumnBefore().run();
  }

  addColumnAfter(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().addColumnAfter().run();
  }

  deleteColumn(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().deleteColumn().run();
  }

  addRowBefore(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().addRowBefore().run();
  }

  addRowAfter(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().addRowAfter().run();
  }

  deleteRow(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().deleteRow().run();
  }

  deleteTable(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().deleteTable().run();
  }

  mergeCells(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().mergeCells().run();
  }

  splitCell(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().splitCell().run();
  }

  toggleHeaderColumn(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().toggleHeaderColumn().run();
  }

  toggleHeaderRow(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().toggleHeaderRow().run();
  }

  // --- Utility Commands ---

  clearContent(editor: Editor): void {
    if (!editor) return;
    editor.commands.setContent("", true);
  }

  focus(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().run();
  }

  blur(editor: Editor): void {
    if (!editor) return;
    editor.chain().blur().run();
  }

  setContent(editor: Editor, content: string, emitUpdate = true): void {
    if (!editor) return;
    editor.commands.setContent(content, emitUpdate);
  }

  setEditable(editor: Editor, editable: boolean): void {
    if (!editor) return;
    editor.setEditable(editable);
  }

  insertContent(editor: Editor, content: string): void {
    if (!editor) return;
    editor.chain().focus().insertContent(content).run();
  }

  async insertImage(
    editor: Editor,
    options?: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      accept?: string;
    }
  ): Promise<void> {
    try {
      await this.imageService.selectAndUploadImage(editor, options);
    } catch (error) {
      console.error("Error inserting image:", error);
      throw error;
    }
  }

  async uploadImage(
    editor: Editor,
    file: File,
    options?: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    }
  ): Promise<void> {
    try {
      await this.imageService.uploadAndInsertImage(editor, file, options);
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }
}
