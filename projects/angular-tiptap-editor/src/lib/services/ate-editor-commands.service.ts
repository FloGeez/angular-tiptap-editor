import { Injectable, inject, signal } from "@angular/core";
import { Editor } from "@tiptap/core";
import { AteImageService } from "./ate-image.service";
import { AteColorPickerService } from "./ate-color-picker.service";
import { AteLinkService } from "./ate-link.service";
import { AteEditorStateSnapshot, ATE_INITIAL_EDITOR_STATE } from "../models/ate-editor-state.model";
import { AteImageUploadHandler, AteImageUploadOptions } from "../models/ate-image.model";

@Injectable()
export class AteEditorCommandsService {
  private imageService = inject(AteImageService);
  private colorPickerSvc = inject(AteColorPickerService);
  private linkSvc = inject(AteLinkService);
  private readonly _editorState = signal<AteEditorStateSnapshot>(ATE_INITIAL_EDITOR_STATE, {
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
      )
        return false;

      // Helper for object comparison
      const isRecordEqual = (objA: Record<string, unknown>, objB: Record<string, unknown>) => {
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
    },
  });

  /** Exposed editor state as a readonly signal */
  readonly editorState = this._editorState.asReadonly();

  // ============================================
  // Toolbar Interaction State
  // ============================================

  /** Signal to track when the toolbar is being hovered/interacted with */
  private readonly _isToolbarInteracting = signal(false);
  readonly isToolbarInteracting = this._isToolbarInteracting.asReadonly();

  /** Set toolbar interaction state (called by editor component) */
  setToolbarInteracting(value: boolean): void {
    this._isToolbarInteracting.set(value);
  }

  // Access to ImageService states as readonly signals for UI binding
  readonly isUploading = this.imageService.isUploading.asReadonly();
  readonly uploadProgress = this.imageService.uploadProgress.asReadonly();
  readonly uploadMessage = this.imageService.uploadMessage.asReadonly();
  set uploadHandler(handler: AteImageUploadHandler | null) {
    this.imageService.uploadHandler = handler;
  }

  /** Update state (called by TiptapStateExtension) */
  updateState(state: AteEditorStateSnapshot) {
    this._editorState.set(state);
  }

  // ============================================
  // Link State (proxied from LinkService)
  // ============================================

  /** Signal to toggle link edit mode from UI (Toolbar) - Immediate response */
  readonly linkEditMode = this.linkSvc.editMode.asReadonly();

  /** Reference to the element that triggered the link menu (for anchoring) */
  readonly linkMenuTrigger = this.linkSvc.menuTrigger.asReadonly();

  // ============================================
  // Color Picker State (proxied from ColorPickerService)
  // ============================================

  /** Signal to toggle color picker mode from UI (text or highlight) */
  readonly colorEditMode = this.colorPickerSvc.editMode.asReadonly();

  /** Reference to the element that triggered the color menu (for anchoring) */
  readonly colorMenuTrigger = this.colorPickerSvc.menuTrigger.asReadonly();

  // ============================================
  // Link Edit Methods (delegated to LinkService)
  // ============================================

  // ============================================
  // Command Execution
  // ============================================

  /** Generic method to execute any command by name */
  execute(editor: Editor, command: string, ...args: unknown[]): void {
    if (!editor) return;

    switch (command) {
      case "toggleBold":
        this.toggleBold(editor);
        break;
      case "toggleItalic":
        this.toggleItalic(editor);
        break;
      case "toggleStrike":
        this.toggleStrike(editor);
        break;
      case "toggleCode":
        this.toggleCode(editor);
        break;
      case "toggleCodeBlock":
        this.toggleCodeBlock(editor);
        break;
      case "toggleUnderline":
        this.toggleUnderline(editor);
        break;
      case "toggleSuperscript":
        this.toggleSuperscript(editor);
        break;
      case "toggleSubscript":
        this.toggleSubscript(editor);
        break;
      case "toggleHeading":
        this.toggleHeading(editor, args[0] as 1 | 2 | 3);
        break;
      case "toggleBulletList":
        this.toggleBulletList(editor);
        break;
      case "toggleOrderedList":
        this.toggleOrderedList(editor);
        break;
      case "toggleBlockquote":
        this.toggleBlockquote(editor);
        break;
      case "setTextAlign":
        this.setTextAlign(editor, args[0] as "left" | "center" | "right" | "justify");
        break;
      case "toggleLink":
        this.linkSvc.toggle(editor, args[0] as Event | undefined);
        break;
      case "unsetLink":
        this.linkSvc.unsetLink(editor);
        break;
      case "toggleColorPicker":
        this.colorPickerSvc.toggle(editor, args[0] as "text" | "highlight", args[1] as Event);
        break;
      case "insertHorizontalRule":
        this.insertHorizontalRule(editor);
        break;
      case "insertImage":
        this.insertImage(editor, args[0] as AteImageUploadOptions);
        break;
      case "uploadImage":
        this.uploadImage(editor, args[0] as File, args[1] as AteImageUploadOptions | undefined);
        break;
      case "toggleHighlight":
        this.toggleHighlight(editor, args[0] as string);
        break;
      case "undo":
        this.undo(editor);
        break;
      case "redo":
        this.redo(editor);
        break;
      case "insertTable":
        this.insertTable(editor, args[0] as number | undefined, args[1] as number | undefined);
        break;
      case "addColumnBefore":
        this.addColumnBefore(editor);
        break;
      case "addColumnAfter":
        this.addColumnAfter(editor);
        break;
      case "deleteColumn":
        this.deleteColumn(editor);
        break;
      case "addRowBefore":
        this.addRowBefore(editor);
        break;
      case "addRowAfter":
        this.addRowAfter(editor);
        break;
      case "deleteRow":
        this.deleteRow(editor);
        break;
      case "deleteTable":
        this.deleteTable(editor);
        break;
      case "mergeCells":
        this.mergeCells(editor);
        break;
      case "splitCell":
        this.splitCell(editor);
        break;
      case "toggleHeaderColumn":
        this.toggleHeaderColumn(editor);
        break;
      case "toggleHeaderRow":
        this.toggleHeaderRow(editor);
        break;
      case "applyColor":
        this.colorPickerSvc.applyColor(
          editor,
          args[0] as string,
          args[1] as boolean | undefined,
          args[2] as boolean | undefined
        );
        break;
      case "applyHighlight":
        this.colorPickerSvc.applyHighlight(
          editor,
          args[0] as string,
          args[1] as boolean | undefined,
          args[2] as boolean | undefined
        );
        break;
      case "unsetColor":
        this.colorPickerSvc.unsetColor(editor, args[0] as boolean);
        break;
      case "unsetHighlight":
        this.colorPickerSvc.unsetHighlight(editor, args[0] as boolean);
        break;

      case "clearContent":
        this.clearContent(editor);
        break;
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

  toggleCodeBlock(editor: Editor): void {
    if (!editor) return;
    editor.chain().focus().toggleCodeBlock().run();
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

  insertTable(editor: Editor, rows = 3, cols = 3): void {
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
    editor.commands.clearContent(true);
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

  async insertImage(editor: Editor, options?: AteImageUploadOptions): Promise<void> {
    try {
      await this.imageService.selectAndUploadImage(editor, options);
    } catch (error) {
      console.error("Error inserting image:", error);
      throw error;
    }
  }

  async uploadImage(editor: Editor, file: File, options?: AteImageUploadOptions): Promise<void> {
    try {
      await this.imageService.uploadAndInsertImage(editor, file, options);
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  }
}
