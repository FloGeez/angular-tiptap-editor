import { Observable } from "rxjs";

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

export interface ImageUploadOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
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

/**
 * Interface dedicated to image upload configuration.
 */
export interface AteImageUploadConfig {
  /** Callback function to handle upload (Promise or Observable) */
  handler?: ImageUploadHandler;
  /** Compression quality (0 to 1) */
  quality?: number;
  /** Maximum allowed width in pixels */
  maxWidth?: number;
  /** Maximum allowed height in pixels */
  maxHeight?: number;
  /** Maximum allowed size in MB */
  maxSize?: number;
  /** Accepted file types (e.g., ['image/jpeg', 'image/png']) */
  allowedTypes?: string[];
}
