import { Injectable } from "@angular/core";
import { Editor } from "@tiptap/core";

@Injectable({
  providedIn: "root",
})
export class EditorCommandsService {
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

    switch (command) {
      case "toggleBold":
        return editor.can().chain().focus().toggleBold().run();
      case "toggleItalic":
        return editor.can().chain().focus().toggleItalic().run();
      case "toggleStrike":
        return editor.can().chain().focus().toggleStrike().run();
      case "toggleCode":
        return editor.can().chain().focus().toggleCode().run();
      case "toggleUnderline":
        return editor.can().chain().focus().toggleUnderline().run();
      case "toggleSuperscript":
        return editor.can().chain().focus().toggleSuperscript().run();
      case "toggleSubscript":
        return editor.can().chain().focus().toggleSubscript().run();
      case "setTextAlign":
        return editor.can().chain().focus().setTextAlign("left").run();
      case "toggleLink":
        return editor.can().chain().focus().toggleLink({ href: "" }).run();
      case "insertHorizontalRule":
        return editor.can().chain().focus().setHorizontalRule().run();
      case "toggleHighlight":
        return editor.can().chain().focus().toggleHighlight().run();
      case "undo":
        return editor.can().chain().focus().undo().run();
      case "redo":
        return editor.can().chain().focus().redo().run();
      case "insertTable":
        return editor.can().chain().focus().insertTable().run();
      case "addColumnBefore":
        return editor.can().chain().focus().addColumnBefore().run();
      case "addColumnAfter":
        return editor.can().chain().focus().addColumnAfter().run();
      case "deleteColumn":
        return editor.can().chain().focus().deleteColumn().run();
      case "addRowBefore":
        return editor.can().chain().focus().addRowBefore().run();
      case "addRowAfter":
        return editor.can().chain().focus().addRowAfter().run();
      case "deleteRow":
        return editor.can().chain().focus().deleteRow().run();
      case "deleteTable":
        return editor.can().chain().focus().deleteTable().run();
      case "mergeCells":
        return editor.can().chain().focus().mergeCells().run();
      case "splitCell":
        return editor.can().chain().focus().splitCell().run();
      case "toggleHeaderColumn":
        return editor.can().chain().focus().toggleHeaderColumn().run();
      case "toggleHeaderRow":
        return editor.can().chain().focus().toggleHeaderRow().run();
      case "toggleHeaderCell":
        return editor.can().chain().focus().toggleHeaderCell().run();
      default:
        return false;
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
}
