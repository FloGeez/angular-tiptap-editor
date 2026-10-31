import { Injectable } from "@angular/core";
import { Editor } from "@tiptap/core";

/** Supported export formats */
export type AteExportFormat = "html" | "markdown" | "text";

/** Export delivery method */
export type AteExportMethod = "clipboard" | "download";

/** Options for file download */
export interface AteExportOptions {
  /** Custom filename (without extension). Defaults to "document". */
  filename?: string;
}

@Injectable()
export class AteExportService {
  // ============================================================
  // Public Content Getters
  // ============================================================

  /** Returns the editor content as HTML string. */
  getHtml(editor: Editor): string {
    return editor.getHTML();
  }

  /** Returns the editor content as plain text. */
  getText(editor: Editor): string {
    return editor.getText();
  }

  /** Returns the editor content as Markdown, serialized by `@tiptap/markdown`. */
  getMarkdown(editor: Editor): string {
    if (editor.markdown) {
      return editor.getMarkdown();
    }
    // `tiptap-markdown` in tiptapExtensions shares the "markdown" name, so it replaces
    // `@tiptap/markdown` and exposes its serializer in storage instead
    const storage = editor.storage.markdown as unknown as { getMarkdown?: () => string };
    return storage?.getMarkdown?.() ?? "";
  }

  /** Returns the editor content in the specified format. */
  getContent(editor: Editor, format: AteExportFormat): string {
    switch (format) {
      case "html":
        return this.getHtml(editor);
      case "markdown":
        return this.getMarkdown(editor);
      case "text":
        return this.getText(editor);
    }
  }

  // ============================================================
  // Export Methods
  // ============================================================

  /** Copies the editor content to the clipboard. */
  async exportToClipboard(editor: Editor, format: AteExportFormat): Promise<void> {
    const content = this.getContent(editor, format);
    await navigator.clipboard.writeText(content);
  }

  /** Downloads the editor content as a file. */
  exportToFile(editor: Editor, format: AteExportFormat, options?: AteExportOptions): void {
    const content = this.getContent(editor, format);
    const baseName = options?.filename || "document";

    const extensions: Record<AteExportFormat, string> = {
      html: "html",
      markdown: "md",
      text: "txt",
    };
    const mimeTypes: Record<AteExportFormat, string> = {
      html: "text/html;charset=utf-8",
      markdown: "text/markdown;charset=utf-8",
      text: "text/plain;charset=utf-8",
    };

    const filename = `${baseName}.${extensions[format]}`;
    const blob = new Blob([content], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
