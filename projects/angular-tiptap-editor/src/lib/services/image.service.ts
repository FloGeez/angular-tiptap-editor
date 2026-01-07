import { Injectable, signal, computed, inject } from "@angular/core";
import { Editor } from "@tiptap/core";
import { Observable, isObservable, firstValueFrom } from "rxjs";
import { TiptapI18nService } from "./i18n.service";

export interface ImageData {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
}

export interface ImageUploadResult {
  src: string;
  name: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
  originalSize?: number;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
}

/**
 * Context passed to the image upload handler containing information about the image
 */
export interface ImageUploadContext {
  /** Original file being uploaded */
  file: File;
  /** Width of the processed image */
  width: number;
  /** Height of the processed image */
  height: number;
  /** MIME type of the image */
  type: string;
  /** Base64 data URL of the processed image (after compression/resize) */
  base64: string;
}

/**
 * Result expected from a custom image upload handler.
 * Must contain at least the `src` property with the image URL.
 */
export interface ImageUploadHandlerResult {
  /** URL of the uploaded image (can be a remote URL or any string) */
  src: string;
  /** Optional custom alt text */
  alt?: string;
  /** Optional custom title */
  title?: string;
}

/**
 * Custom handler function for image uploads.
 * Allows users to implement their own image storage logic (e.g., upload to S3, Cloudinary, etc.)
 *
 * Can return either a Promise or an Observable (Angular-friendly).
 *
 * @param context - Context containing the image file and metadata
 * @returns Promise or Observable resolving to ImageUploadHandlerResult
 *
 * @example Using Promise (async/await)
 * ```typescript
 * uploadHandler: ImageUploadHandler = async (ctx) => {
 *   const formData = new FormData();
 *   formData.append('image', ctx.file);
 *   const result = await firstValueFrom(this.http.post<{url: string}>('/api/upload', formData));
 *   return { src: result.url };
 * };
 * ```
 *
 * @example Using Observable (Angular HttpClient)
 * ```typescript
 * uploadHandler: ImageUploadHandler = (ctx) => {
 *   const formData = new FormData();
 *   formData.append('image', ctx.file);
 *   return this.http.post<{url: string}>('/api/upload', formData).pipe(
 *     map(result => ({ src: result.url }))
 *   );
 * };
 * ```
 */
export type ImageUploadHandler = (
  context: ImageUploadContext
) => Promise<ImageUploadHandlerResult> | Observable<ImageUploadHandlerResult>;


@Injectable({
  providedIn: "root",
})
export class ImageService {
  // Signals pour l'état des images
  selectedImage = signal<ImageData | null>(null);
  isImageSelected = computed(() => this.selectedImage() !== null);
  // Resizing signals
  isResizing = signal(false);

  private i18n = inject(TiptapI18nService);
  private readonly t = this.i18n.imageUpload;

  // Signaux pour l'upload
  isUploading = signal(false);
  uploadProgress = signal(0);
  uploadMessage = signal("");

  /**
   * Custom upload handler for images.
   * When set, this handler will be called instead of the default base64 conversion.
   * This allows users to implement their own image storage logic.
   *
   * @example
   * ```typescript
   * imageService.uploadHandler = async (context) => {
   *   const formData = new FormData();
   *   formData.append('image', context.file);
   *   const response = await fetch('/api/upload', { method: 'POST', body: formData });
   *   const data = await response.json();
   *   return { src: data.url };
   * };
   * ```
   */
  uploadHandler: ImageUploadHandler | null = null;

  // Référence à l'éditeur pour les mises à jour
  private currentEditor: Editor | null = null;

  // Méthodes pour la gestion des images
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

  // Méthodes pour manipuler les images
  insertImage(editor: Editor, imageData: ImageData): void {
    editor.chain().focus().setResizableImage(imageData).run();
  }

  updateImageAttributes(editor: Editor, attributes: Partial<ImageData>): void {
    if (editor.isActive("resizableImage")) {
      editor
        .chain()
        .focus()
        .updateAttributes("resizableImage", attributes)
        .run();
      this.updateSelectedImage(attributes);
    }
  }

  // Nouvelles méthodes pour le redimensionnement
  resizeImage(editor: Editor, options: ResizeOptions): void {
    if (!editor.isActive("resizableImage")) return;

    const currentAttrs = editor.getAttributes("resizableImage");
    let newWidth = options.width;
    let newHeight = options.height;

    // Maintenir le ratio d'aspect si demandé
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

    // Appliquer des limites minimales
    if (newWidth) newWidth = Math.max(50, newWidth);
    if (newHeight) newHeight = Math.max(50, newHeight);

    this.updateImageAttributes(editor, {
      width: newWidth,
      height: newHeight,
    });
  }

  // Méthodes pour redimensionner par pourcentage
  resizeImageByPercentage(editor: Editor, percentage: number): void {
    if (!editor.isActive("resizableImage")) return;

    const currentAttrs = editor.getAttributes("resizableImage");
    if (!currentAttrs["width"] || !currentAttrs["height"]) return;

    const newWidth = Math.round(currentAttrs["width"] * (percentage / 100));
    const newHeight = Math.round(currentAttrs["height"] * (percentage / 100));

    this.resizeImage(editor, { width: newWidth, height: newHeight });
  }

  // Méthodes pour redimensionner à des tailles prédéfinies
  resizeImageToSmall(editor: Editor): void {
    this.resizeImage(editor, {
      width: 300,
      height: 200,
      maintainAspectRatio: true,
    });
  }

  resizeImageToMedium(editor: Editor): void {
    this.resizeImage(editor, {
      width: 500,
      height: 350,
      maintainAspectRatio: true,
    });
  }

  resizeImageToLarge(editor: Editor): void {
    this.resizeImage(editor, {
      width: 800,
      height: 600,
      maintainAspectRatio: true,
    });
  }

  resizeImageToOriginal(editor: Editor): void {
    if (!editor.isActive("resizableImage")) return;

    const img = new Image();
    img.onload = () => {
      this.resizeImage(editor, {
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = editor.getAttributes("resizableImage")["src"];
  }

  // Méthode pour redimensionner librement (sans maintenir le ratio)
  resizeImageFreely(editor: Editor, width: number, height: number): void {
    this.resizeImage(editor, {
      width,
      height,
      maintainAspectRatio: false,
    });
  }

  // Méthode pour obtenir les dimensions actuelles de l'image
  getImageDimensions(editor: Editor): { width: number; height: number } | null {
    if (!editor.isActive("resizableImage")) return null;

    const attrs = editor.getAttributes("resizableImage");
    return {
      width: attrs["width"] || 0,
      height: attrs["height"] || 0,
    };
  }

  // Méthode pour obtenir les dimensions naturelles de l'image
  getNaturalImageDimensions(
    src: string
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => {
        reject(new Error(this.t().loadError));
      };
      img.src = src;
    });
  }

  deleteImage(editor: Editor): void {
    if (editor.isActive("resizableImage")) {
      editor.chain().focus().deleteSelection().run();
      this.clearSelection();
    }
  }

  // Méthodes utilitaires
  private updateSelectedImage(attributes: Partial<ImageData>): void {
    const current = this.selectedImage();
    if (current) {
      this.selectedImage.set({ ...current, ...attributes });
    }
  }

  // Validation des images
  validateImage(
    file: File,
    maxSize: number = 5 * 1024 * 1024
  ): { valid: boolean; error?: string } {
    if (!file.type.startsWith("image/")) {
      return { valid: false, error: this.t().invalidFileType };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `${this.t().imageTooLarge} (max ${maxSize / 1024 / 1024}MB)`,
      };
    }

    return { valid: true };
  }

  // Compression d'image
  async compressImage(
    file: File,
    quality: number = 0.8,
    maxWidth: number = 1920,
    maxHeight: number = 1080
  ): Promise<ImageUploadResult> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Mise à jour du progrès
        if (this.isUploading()) {
          this.uploadProgress.set(40);
          this.uploadMessage.set(this.t().resizing);
          this.forceEditorUpdate();
        }

        let { width, height } = img;

        // Redimensionner si nécessaire
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Dessiner l'image redimensionnée
        ctx?.drawImage(img, 0, 0, width, height);

        // Mise à jour du progrès
        if (this.isUploading()) {
          this.uploadProgress.set(60);
          this.uploadMessage.set(this.t().compressing);
          this.forceEditorUpdate();
        }

        // Convertir en base64 avec compression
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const base64 = e.target?.result as string;
                if (base64) {
                  const result: ImageUploadResult = {
                    src: base64,
                    name: file.name,
                    size: blob.size,
                    type: file.type,
                    width: Math.round(width),
                    height: Math.round(height),
                    originalSize: file.size,
                  };
                  resolve(result);
                } else {
                  reject(new Error(this.t().compressionError));
                }
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

      img.onerror = () =>
        reject(new Error(this.t().loadError));
      img.src = URL.createObjectURL(file);
    });
  }

  // Méthode privée générique pour uploader avec progression
  private async uploadImageWithProgress(
    editor: Editor,
    file: File,
    insertionStrategy: (editor: Editor, result: ImageUploadResult) => void,
    actionMessage: string,
    options?: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    }
  ): Promise<void> {
    try {
      // Stocker la référence à l'éditeur
      this.currentEditor = editor;

      this.isUploading.set(true);
      this.uploadProgress.set(0);
      this.uploadMessage.set(this.t().validating);
      this.forceEditorUpdate();

      // Validation
      const validation = this.validateImage(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      this.uploadProgress.set(20);
      this.uploadMessage.set(this.t().compressing);
      this.forceEditorUpdate();

      // Petit délai pour permettre à l'utilisateur de voir la progression
      await new Promise((resolve) => setTimeout(resolve, 200));

      const result = await this.compressImage(
        file,
        options?.quality || 0.8,
        options?.maxWidth || 1920,
        options?.maxHeight || 1080
      );

      this.uploadProgress.set(80);

      // Si un handler personnalisé est défini, l'utiliser pour l'upload
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

          // Convertir Observable en Promise si nécessaire
          const handlerResult = isObservable(handlerResponse)
            ? await firstValueFrom(handlerResponse)
            : await handlerResponse;

          // Remplacer le src base64 par l'URL retournée par le handler
          result.src = handlerResult.src;

          // Appliquer les overrides optionnels du handler
          if (handlerResult.alt) {
            result.name = handlerResult.alt;
          }
        } catch (handlerError) {
          console.error(this.t().uploadError, handlerError);
          throw handlerError;
        }
      }

      this.uploadMessage.set(actionMessage);
      this.forceEditorUpdate();

      // Petit délai pour l'action
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Exécuter la stratégie d'insertion
      insertionStrategy(editor, result);

      // L'action est terminée, maintenant on peut cacher l'indicateur
      this.isUploading.set(false);
      this.uploadProgress.set(0);
      this.uploadMessage.set("");
      this.forceEditorUpdate();
      this.currentEditor = null;
    } catch (error) {
      this.isUploading.set(false);
      this.uploadProgress.set(0);
      this.uploadMessage.set("");
      this.forceEditorUpdate();
      this.currentEditor = null;
      console.error(this.t().uploadError, error);
      throw error;
    }
  }

  // Méthode unifiée pour uploader et insérer une image
  async uploadAndInsertImage(
    editor: Editor,
    file: File,
    options?: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    }
  ): Promise<void> {
    return this.uploadImageWithProgress(
      editor,
      file,
      (editor, result) => {
        this.insertImage(editor, {
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

  // Méthode pour forcer la mise à jour de l'éditeur
  private forceEditorUpdate() {
    if (this.currentEditor) {
      // Déclencher une transaction vide pour forcer la mise à jour des décorations
      const { tr } = this.currentEditor.state;
      this.currentEditor.view.dispatch(tr);
    }
  }

  // Méthode privée générique pour créer un sélecteur de fichier
  private async selectFileAndProcess(
    editor: Editor,
    uploadMethod: (editor: Editor, file: File, options?: any) => Promise<void>,
    options?: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      accept?: string;
    }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = options?.accept || "image/*";
      input.style.display = "none";

      input.addEventListener("change", async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file && file.type.startsWith("image/")) {
          try {
            await uploadMethod(editor, file, options);
            resolve();
          } catch (error) {
            reject(error);
          }
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

  // Méthode pour créer un sélecteur de fichier et uploader une image
  async selectAndUploadImage(
    editor: Editor,
    options?: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      accept?: string;
    }
  ): Promise<void> {
    return this.selectFileAndProcess(
      editor,
      this.uploadAndInsertImage.bind(this),
      options
    );
  }

  // Méthode pour sélectionner et remplacer une image existante
  async selectAndReplaceImage(
    editor: Editor,
    options?: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
      accept?: string;
    }
  ): Promise<void> {
    return this.selectFileAndProcess(
      editor,
      this.uploadAndReplaceImage.bind(this),
      options
    );
  }

  // Méthode pour remplacer une image existante avec indicateur de progression
  async uploadAndReplaceImage(
    editor: Editor,
    file: File,
    options?: {
      quality?: number;
      maxWidth?: number;
      maxHeight?: number;
    }
  ): Promise<void> {
    // Sauvegarder les attributs de l'image actuelle pour restauration en cas d'échec
    const currentImageAttrs = editor.getAttributes("resizableImage");
    const backupImage = { ...currentImageAttrs };

    try {
      // Supprimer visuellement l'ancienne image immédiatement
      editor.chain().focus().deleteSelection().run();

      await this.uploadImageWithProgress(
        editor,
        file,
        (editor, result) => {
          this.insertImage(editor, {
            src: result.src,
            alt: result.name,
            title: `${result.name} (${result.width}×${result.height})`,
            width: result.width,
            height: result.height,
          });
        },
        this.t().replacingImage,
        options
      );
    } catch (error) {
      // En cas d'erreur, restaurer l'image originale si elle existait
      if (backupImage["src"]) {
        this.insertImage(editor, {
          src: backupImage["src"] as string,
          alt: (backupImage["alt"] as string) || "",
          title: (backupImage["title"] as string) || "",
          width: backupImage["width"] as number,
          height: backupImage["height"] as number,
        });
      }
      console.error("Error during image replacement:", error);
      throw error;
    }
  }
}
