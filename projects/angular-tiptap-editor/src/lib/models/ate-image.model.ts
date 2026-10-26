import { Observable } from "rxjs";

export interface AteImageData {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
}

export interface AteImageUploadResult {
  src: string;
  name: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
  originalSize?: number;
}

/** Why an image failed validation: its type is not in `allowedTypes`, or it exceeds `maxSize` */
export type AteImageValidationReason = "invalid-type" | "too-large";

/**
 * Thrown when an image fails validation, before compression and before `imageUploadHandler` runs.
 * `message` is the translated, user-facing text.
 */
export class AteImageValidationError extends Error {
  constructor(
    readonly reason: AteImageValidationReason,
    message: string
  ) {
    super(message);
    this.name = "AteImageValidationError";
  }
}

/** Where a rejected image file came from */
export type AteImageSource = "paste" | "drop" | "picker" | "api";

/**
 * Emitted when an image file cannot be inserted.
 * - `invalid-type`: the file type is not in `allowedTypes`
 * - `too-large`: the file exceeds `maxSize`
 * - `upload-failed`: processing or `imageUploadHandler` failed
 *
 * `source` is `paste` (clipboard file), `drop`, `picker` (toolbar, slash menu, image bubble menu)
 * or `api` (`uploadImage`).
 */
export interface AteImageRejection {
  reason: AteImageValidationReason | "upload-failed";
  file: File;
  source: AteImageSource;
}

/**
 * Emitted when an image found in pasted HTML cannot be kept.
 * - `unreachable`: the page cannot load its source (e.g. `attachment:`, `file:`, `cid:`, foreign `blob:`, malformed base64)
 * - `invalid-type`: a pasted base64 image has a type that is not in `allowedTypes`
 * - `too-large`: a pasted base64 image exceeds `maxSize`
 * - `upload-failed`: a pasted base64 image was rejected by the upload handler
 */
export interface AtePastedImageRejection {
  reason: "unreachable" | AteImageValidationReason | "upload-failed";
  src: string;
}

export interface AteResizeOptions {
  width?: number;
  height?: number;
  maintainAspectRatio?: boolean;
}

export interface AteImageUploadOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxSize?: number; // in bytes
  allowedTypes?: string[];
}

/**
 * Context passed to the image upload handler containing information about the image
 */
export interface AteImageUploadContext {
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
export interface AteImageUploadHandlerResult {
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
export type AteImageUploadHandler = (
  context: AteImageUploadContext
) => Promise<AteImageUploadHandlerResult> | Observable<AteImageUploadHandlerResult>;

/**
 * Interface dedicated to image upload configuration.
 */
export interface AteImageUploadConfig {
  /** Callback function to handle upload (Promise or Observable) */
  handler?: AteImageUploadHandler;
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

/**
 * Maps the `src` stored in the document to the URL the editor displays (and downloads).
 * The document, `getHTML()`, `getJSON()` and exports always keep the original `src`.
 *
 * Use it for images that cannot be loaded by a plain `<img src>`, e.g. endpoints that need an
 * authorization header: fetch the image and resolve to a `blob:` URL.
 *
 * Can return a string, a Promise or an Observable (only the first emission is used).
 * When it throws, rejects or emits nothing, the original `src` is displayed instead.
 * The library never revokes the URLs it returns: if you create `blob:` URLs, you own their lifetime.
 */
export type AteImageSrcResolver = (src: string) => string | Promise<string> | Observable<string>;
