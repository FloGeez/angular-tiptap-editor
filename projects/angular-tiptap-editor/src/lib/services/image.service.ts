import { Injectable, signal, computed, inject } from "@angular/core";
import { Editor } from "@tiptap/core";
import { isObservable, firstValueFrom } from "rxjs";
import { TiptapI18nService } from "./i18n.service";
import { ResizeOptions, ImageUploadOptions, ImageUploadHandler, ImageUploadResult, ImageData } from "../models/image.model";


@Injectable()
export class ImageService {
  /** Signals for image state */
  selectedImage = signal<ImageData | null>(null);
  isImageSelected = computed(() => this.selectedImage() !== null);

  /** Resizing state */
  isResizing = signal(false);

  private i18n = inject(TiptapI18nService);
  private readonly t = this.i18n.imageUpload;

  /** Upload state signals */
  isUploading = signal(false);
  uploadProgress = signal(0);
  uploadMessage = signal("");

  /**
   * Custom upload handler.
   * If set, this handler replaces the default base64 conversion.
   */
  uploadHandler: ImageUploadHandler | null = null;

  private currentEditor: Editor | null = null;

  /** Select and track an image from the editor */
  selectImage(editor: Editor): void {
    if (editor.isActive("resizableImage")) {
      const attrs = editor.getAttributes("resizableImage");
      this.selectedImage.set({
        src: attrs["src"],
        alt: attrs["alt"],
        title: attrs["title"],
        width: attrs["width"],
        height: attrs["height"],
      });
    } else {
      this.selectedImage.set(null);
    }
  }

  clearSelection(): void {
    this.selectedImage.set(null);
  }

  /** Insert a new image and ensure it's selected */
  insertImage(editor: Editor, imageData: ImageData): void {
    const { from } = editor.state.selection;
    editor.chain()
      .focus()
      .setResizableImage(imageData)
      .setNodeSelection(from)
      .run();
  }

  /** Update attributes of the currently active image */
  updateImageAttributes(editor: Editor, attributes: Partial<ImageData>): void {
    if (editor.isActive("resizableImage")) {
      const pos = editor.state.selection.from;
      editor
        .chain()
        .focus()
        .updateAttributes("resizableImage", attributes)
        .setNodeSelection(pos)
        .run();
      this.updateSelectedImage(attributes);
    }
  }

  /** Resize image with optional aspect ratio maintenance */
  resizeImage(editor: Editor, options: ResizeOptions): void {
    if (!editor.isActive("resizableImage")) return;

    const currentAttrs = editor.getAttributes("resizableImage");
    let newWidth = options.width;
    let newHeight = options.height;

    // Maintain aspect ratio if requested
    if (
      options.maintainAspectRatio !== false &&
      currentAttrs["width"] &&
      currentAttrs["height"]
    ) {
      const aspectRatio = currentAttrs["width"] / currentAttrs["height"];

      if (newWidth && !newHeight) {
        newHeight = Math.round(newWidth / aspectRatio);
      } else if (newHeight && !newWidth) {
        newWidth = Math.round(newHeight * aspectRatio);
      }
    }

    // Apply minimum limits
    if (newWidth) newWidth = Math.max(50, newWidth);
    if (newHeight) newHeight = Math.max(50, newHeight);

    this.updateImageAttributes(editor, {
      width: newWidth,
      height: newHeight,
    });
  }

  /** Predetermined resize helpers used by UI */
  resizeImageToSmall(editor: Editor): void {
    this.resizeImage(editor, { width: 300, height: 200, maintainAspectRatio: true });
  }

  resizeImageToMedium(editor: Editor): void {
    this.resizeImage(editor, { width: 500, height: 350, maintainAspectRatio: true });
  }

  resizeImageToLarge(editor: Editor): void {
    this.resizeImage(editor, { width: 800, height: 600, maintainAspectRatio: true });
  }

  resizeImageToOriginal(editor: Editor): void {
    if (!editor.isActive("resizableImage")) return;
    const img = new Image();
    img.onload = () => {
      this.resizeImage(editor, { width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = editor.getAttributes("resizableImage")["src"];
  }

  /** Get current image dimensions */
  getImageDimensions(editor: Editor): { width: number; height: number } | null {
    if (!editor.isActive("resizableImage")) return null;
    const attrs = editor.getAttributes("resizableImage");
    return {
      width: attrs["width"] || 0,
      height: attrs["height"] || 0,
    };
  }

  /** Remove the selected image */
  deleteImage(editor: Editor): void {
    if (editor.isActive("resizableImage")) {
      editor.chain().focus().deleteSelection().run();
      this.clearSelection();
    }
  }

  private updateSelectedImage(attributes: Partial<ImageData>): void {
    const current = this.selectedImage();
    if (current) {
      this.selectedImage.set({ ...current, ...attributes });
    }
  }

  /** Validate file type and size */
  validateImage(file: File, options?: { maxSize?: number; allowedTypes?: string[] }): { valid: boolean; error?: string } {
    const maxSize = options?.maxSize || 10 * 1024 * 1024;
    const allowedTypes = options?.allowedTypes || [];

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      return { valid: false, error: this.t().invalidFileType };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `${this.t().imageTooLarge} (max ${Math.round(maxSize / 1024 / 1024)}MB)`,
      };
    }
    return { valid: true };
  }

  /** Compress and process image on client side */
  async compressImage(
    file: File,
    quality: number = 0.8,
    maxWidth: number = 1920,
    maxHeight: number = 1200
  ): Promise<ImageUploadResult> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        if (this.isUploading()) {
          this.uploadProgress.set(40);
          this.uploadMessage.set(this.t().resizing);
        }

        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        if (this.isUploading()) {
          this.uploadProgress.set(60);
          this.uploadMessage.set(this.t().compressing);
        }

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                resolve({
                  src: base64,
                  name: file.name,
                  size: blob.size,
                  type: file.type,
                  width: Math.round(width),
                  height: Math.round(height),
                  originalSize: file.size,
                });
              };
              reader.readAsDataURL(blob);
            } else {
              reject(new Error(this.t().compressionError));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error(this.t().loadError));
      img.src = URL.createObjectURL(file);
    });
  }

  /** Core upload logic with progress tracking */
  private async uploadImageWithProgress(
    editor: Editor,
    file: File,
    insertionStrategy: (editor: Editor, result: ImageUploadResult) => void,
    actionMessage: string,
    options?: ImageUploadOptions
  ): Promise<void> {
    try {
      this.currentEditor = editor;
      this.isUploading.set(true);
      this.uploadProgress.set(10);
      this.uploadMessage.set(this.t().validating);
      this.forceEditorUpdate();

      const validation = this.validateImage(file, {
        maxSize: options?.maxSize,
        allowedTypes: options?.allowedTypes
      });
      if (!validation.valid) throw new Error(validation.error);

      this.uploadProgress.set(30);
      this.uploadMessage.set(this.t().compressing);
      this.forceEditorUpdate();

      const result = await this.compressImage(
        file,
        options?.quality || 0.8,
        options?.maxWidth || 1920,
        options?.maxHeight || 1200
      );

      this.uploadProgress.set(70);

      // Handle custom upload if handler is provided
      if (this.uploadHandler) {
        this.uploadMessage.set(this.t().uploadingToServer);
        this.forceEditorUpdate();

        try {
          const handlerResponse = this.uploadHandler({
            file,
            width: result.width || 0,
            height: result.height || 0,
            type: result.type,
            base64: result.src,
          });

          const handlerResult = isObservable(handlerResponse)
            ? await firstValueFrom(handlerResponse)
            : await handlerResponse;

          result.src = handlerResult.src;
          if (handlerResult.alt) result.name = handlerResult.alt;
        } catch (handlerError) {
          console.error(this.t().uploadError, handlerError);
          throw handlerError;
        }
      }

      this.uploadProgress.set(90);
      this.uploadMessage.set(actionMessage);
      this.forceEditorUpdate();

      // Final insertion
      insertionStrategy(editor, result);

      this.resetUploadState();
    } catch (error) {
      this.resetUploadState();
      console.error(this.t().uploadError, error);
      throw error;
    }
  }

  private resetUploadState() {
    this.isUploading.set(false);
    this.uploadProgress.set(0);
    this.uploadMessage.set("");
    this.forceEditorUpdate();
    this.currentEditor = null;
  }

  /** Main entry point for file upload and insertion */
  async uploadAndInsertImage(editor: Editor, file: File, options?: ImageUploadOptions): Promise<void> {
    return this.uploadImageWithProgress(
      editor,
      file,
      (ed, result) => {
        this.insertImage(ed, {
          src: result.src,
          alt: result.name,
          title: `${result.name} (${result.width}×${result.height})`,
          width: result.width,
          height: result.height,
        });
      },
      this.t().insertingImage,
      options
    );
  }

  /** Trigger an editor transaction to force decoration update */
  private forceEditorUpdate() {
    if (this.currentEditor) {
      const { tr } = this.currentEditor.state;
      this.currentEditor.view.dispatch(tr);
    }
  }

  /** Generic helper to open file picker and process selection */
  private async selectFileAndProcess(
    editor: Editor,
    uploadMethod: (editor: Editor, file: File, options?: ImageUploadOptions) => Promise<void>,
    options?: ImageUploadOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";

      // Use allowedTypes if provided, otherwise default to image/*
      if (options?.allowedTypes && options.allowedTypes.length > 0) {
        input.accept = options.allowedTypes.join(",");
      } else {
        input.accept = "image/*";
      }

      input.style.display = "none";

      input.addEventListener("change", async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file && file.type.startsWith("image/")) {
          try {
            await uploadMethod(editor, file, options);
            resolve();
          } catch (error) { reject(error); }
        } else {
          reject(new Error(this.t().noFileSelected));
        }
        document.body.removeChild(input);
      });

      input.addEventListener("cancel", () => {
        document.body.removeChild(input);
        reject(new Error(this.t().selectionCancelled));
      });

      document.body.appendChild(input);
      input.click();
    });
  }

  /** Select file and upload as new image */
  async selectAndUploadImage(editor: Editor, options?: ImageUploadOptions): Promise<void> {
    return this.selectFileAndProcess(editor, this.uploadAndInsertImage.bind(this), options);
  }

  /** Select file and replace currently selected image */
  async selectAndReplaceImage(editor: Editor, options?: ImageUploadOptions): Promise<void> {
    // No need for complicated backup/restore now that we don't delete prematurely.
    // The uploadAndReplaceImage will handle the atomic replacement.
    return this.selectFileAndProcess(editor, this.uploadAndReplaceImage.bind(this), options);
  }

  /** Internal helper used by replacement logic */
  async uploadAndReplaceImage(editor: Editor, file: File, options?: ImageUploadOptions): Promise<void> {
    // Store current position to ensure we can re-select the image even if selection blurs during upload
    const pos = editor.state.selection.from;
    const wasActive = editor.isActive("resizableImage");

    await this.uploadImageWithProgress(
      editor,
      file,
      (ed, result) => {
        const imageData = {
          src: result.src,
          alt: result.name,
          title: `${result.name} (${result.width}×${result.height})`,
          width: result.width,
          height: result.height,
        };

        // If the image was active or is still active, update it atomically
        if (wasActive || ed.isActive("resizableImage")) {
          ed.chain()
            .focus()
            .updateAttributes("resizableImage", imageData)
            .setNodeSelection(pos)
            .run();
          this.updateSelectedImage(imageData);
        } else {
          // Otherwise replace whatever is selected (or insert at cursor)
          this.insertImage(ed, imageData);
        }

        // After replacement, ensure the image is tracked in our signals
        this.selectImage(ed);
      },
      this.t().replacingImage,
      options
    );
  }
}
