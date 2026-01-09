import { Injectable, inject } from "@angular/core";
import { Editor } from "@tiptap/core";
import { ImageService, ImageUploadHandler } from "./image.service";

@Injectable({
  providedIn: "root",
})
export class EditorCommandsService {
  private imageService = inject(ImageService);

  // Accès aux états de l'ImageService
  get isUploading() { return this.imageService.isUploading; }
  get uploadProgress() { return this.imageService.uploadProgress; }
  get uploadMessage() { return this.imageService.uploadMessage; }
  set uploadHandler(handler: ImageUploadHandler | null) { this.imageService.uploadHandler = handler; }

  // Méthodes pour vérifier l'état actif
  isActive(
    editor: Editor,
    name: string,
    attributes?: Record<string, any>
  ): boolean {
    return editor.isActive(name, attributes);
  }

  // Méthodes pour vérifier si une commande peut être exécutée
  canExecute(editor: Editor, command: string): boolean {
    if (!editor) return false;

    const can = editor.can();

    switch (command) {
      case "toggleBold":
        return can.toggleBold();
      case "toggleItalic":
        return can.toggleItalic();
      case "toggleStrike":
        return can.toggleStrike();
      case "toggleCode":
        return can.toggleCode();
      case "toggleUnderline":
        return can.toggleUnderline();
      case "toggleSuperscript":
        return can.toggleSuperscript();
      case "toggleSubscript":
        return can.toggleSubscript();
      case "setTextAlign":
        return can.setTextAlign("left");
      case "toggleLink":
        return can.toggleLink({ href: "" });
      case "insertHorizontalRule":
        return can.setHorizontalRule();
      case "toggleHighlight":
        return can.toggleHighlight();
      case "undo":
        return can.undo();
      case "redo":
        return can.redo();
      case "insertTable":
        return can.insertTable();
      case "addColumnBefore":
        return can.addColumnBefore();
      case "addColumnAfter":
        return can.addColumnAfter();
      case "deleteColumn":
        return can.deleteColumn();
      case "addRowBefore":
        return can.addRowBefore();
      case "addRowAfter":
        return can.addRowAfter();
      case "deleteRow":
        return can.deleteRow();
      case "deleteTable":
        return can.deleteTable();
      case "mergeCells":
        return can.mergeCells();
      case "splitCell":
        return can.splitCell();
      case "toggleHeaderColumn":
        return can.toggleHeaderColumn();
      case "toggleHeaderRow":
        return can.toggleHeaderRow();
      case "toggleHeaderCell":
        return can.toggleHeaderCell();
      case "setColor":
        return can.setColor("#000000");
      case "setHighlight":
        return can.setHighlight({ color: "#000000" });
      default:
        return false;
    }
  }

  // Méthode générique pour exécuter une commande
  execute(editor: Editor, command: string, ...args: any[]): void {
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
        this.setTextAlign(editor, args[0] as any);
        break;
      case "toggleLink":
        this.toggleLink(editor, args[0] as string);
        break;
      case "insertHorizontalRule":
        this.insertHorizontalRule(editor);
        break;
      case "insertImage":
        this.insertImage(editor, args[0]);
        break;
      case "uploadImage":
        this.uploadImage(editor, args[0], args[1]);
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
        this.insertTable(editor, args[0], args[1]);
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
      case "toggleHeaderCell":
        this.toggleHeaderCell(editor);
        break;
      case "clearContent":
        this.clearContent(editor);
        break;
    }
  }

  // Méthodes pour exécuter les commandes
  toggleBold(editor: Editor): void {
    editor.chain().focus().toggleBold().run();
  }

  toggleItalic(editor: Editor): void {
    editor.chain().focus().toggleItalic().run();
  }

  toggleStrike(editor: Editor): void {
    editor.chain().focus().toggleStrike().run();
  }

  toggleCode(editor: Editor): void {
    editor.chain().focus().toggleCode().run();
  }

  toggleHeading(editor: Editor, level: 1 | 2 | 3): void {
    editor.chain().focus().toggleHeading({ level }).run();
  }

  toggleBulletList(editor: Editor): void {
    editor.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList(editor: Editor): void {
    editor.chain().focus().toggleOrderedList().run();
  }

  toggleBlockquote(editor: Editor): void {
    editor.chain().focus().toggleBlockquote().run();
  }

  undo(editor: Editor): void {
    editor.chain().focus().undo().run();
  }

  redo(editor: Editor): void {
    editor.chain().focus().redo().run();
  }

  // Nouvelles méthodes pour les formatages supplémentaires
  toggleUnderline(editor: Editor): void {
    editor.chain().focus().toggleUnderline().run();
  }

  toggleSuperscript(editor: Editor): void {
    editor.chain().focus().toggleSuperscript().run();
  }

  toggleSubscript(editor: Editor): void {
    editor.chain().focus().toggleSubscript().run();
  }

  setTextAlign(
    editor: Editor,
    alignment: "left" | "center" | "right" | "justify"
  ): void {
    editor.chain().focus().setTextAlign(alignment).run();
  }

  toggleLink(editor: Editor, url?: string): void {
    if (url) {
      editor.chain().focus().toggleLink({ href: url }).run();
    } else {
      // Si pas d'URL fournie, on demande à l'utilisateur
      const href = window.prompt("URL du lien:");
      if (href) {
        editor.chain().focus().toggleLink({ href }).run();
      }
    }
  }

  insertHorizontalRule(editor: Editor): void {
    editor.chain().focus().setHorizontalRule().run();
  }

  toggleHighlight(editor: Editor, color?: string): void {
    if (color) {
      editor.chain().focus().toggleHighlight({ color }).run();
    } else {
      editor.chain().focus().toggleHighlight().run();
    }
  }

  // Table commands
  insertTable(editor: Editor, rows: number = 3, cols: number = 3): void {
    editor.chain().focus().insertTable({ rows, cols }).run();
  }

  addColumnBefore(editor: Editor): void {
    editor.chain().focus().addColumnBefore().run();
  }

  addColumnAfter(editor: Editor): void {
    editor.chain().focus().addColumnAfter().run();
  }

  deleteColumn(editor: Editor): void {
    editor.chain().focus().deleteColumn().run();
  }

  addRowBefore(editor: Editor): void {
    editor.chain().focus().addRowBefore().run();
  }

  addRowAfter(editor: Editor): void {
    editor.chain().focus().addRowAfter().run();
  }

  deleteRow(editor: Editor): void {
    editor.chain().focus().deleteRow().run();
  }

  deleteTable(editor: Editor): void {
    editor.chain().focus().deleteTable().run();
  }

  mergeCells(editor: Editor): void {
    editor.chain().focus().mergeCells().run();
  }

  splitCell(editor: Editor): void {
    editor.chain().focus().splitCell().run();
  }

  toggleHeaderColumn(editor: Editor): void {
    editor.chain().focus().toggleHeaderColumn().run();
  }

  toggleHeaderRow(editor: Editor): void {
    editor.chain().focus().toggleHeaderRow().run();
  }

  toggleHeaderCell(editor: Editor): void {
    editor.chain().focus().toggleHeaderCell().run();
  }

  // Méthode pour vider le contenu
  clearContent(editor: Editor): void {
    editor.commands.setContent("", true);
  }

  // Méthodes de base de l'éditeur
  focus(editor: Editor): void {
    editor.chain().focus().run();
  }

  blur(editor: Editor): void {
    editor.chain().blur().run();
  }

  setContent(editor: Editor, content: string, emitUpdate = true): void {
    editor.commands.setContent(content, emitUpdate);
  }

  setEditable(editor: Editor, editable: boolean): void {
    editor.setEditable(editable);
  }

  insertContent(editor: Editor, content: string): void {
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
