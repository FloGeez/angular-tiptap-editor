# API Reference

Detailed documentation for `AngularTiptapEditorComponent` inputs, outputs, and configuration objects.

## 📥 Inputs

| Input                  | Type                                             | Default             | Description                                         |
| ---------------------- | ------------------------------------------------ | ------------------- | --------------------------------------------------- |
| `config`               | `AteEditorConfig`                                | `{}`                | **Global configuration object** (Recommended)       |
| `content`              | `string`                                         | `""`                | Initial HTML content                                |
| `placeholder`          | `string`                                         | `"Start typing..."` | Placeholder text (overrides config)                 |
| `locale`               | `'en' \| 'fr' \| 'de' \| 'pt' \| 'es'`           | Auto-detect         | Editor language, per instance (overrides config)    |
| `editable`             | `boolean`                                        | `true`              | Whether editor is editable                          |
| `disabled`             | `boolean`                                        | `false`             | Disabled state (for forms)                          |
| `mode`                 | `'classic' \| 'seamless'`                        | `'classic'`         | Seamless mode removes borders and background        |
| `height`               | `string \| number`                               | `undefined`         | Editor height (e.g. '400px', 400, 'auto')           |
| `maxHeight`            | `string \| number`                               | `undefined`         | Maximum height                                      |
| `minHeight`            | `string \| number`                               | `undefined`         | Minimum height                                      |
| `fillContainer`        | `boolean`                                        | `false`             | Fill parent container height                        |
| `autofocus`            | `boolean \| 'start' \| 'end' \| 'all' \| number` | `false`             | Auto-focus behavior                                 |
| `spellcheck`           | `boolean`                                        | `true`              | Enable browser spellcheck                           |
| `showToolbar`          | `boolean`                                        | `true`              | Show toolbar                                        |
| `floatingToolbar`      | `boolean`                                        | `false`             | Show floating toolbar on focus                      |
| `showFooter`           | `boolean`                                        | `true`              | Show footer (counters)                              |
| `showEditToggle`       | `boolean`                                        | `false`             | Show read-only/edit toggle button                   |
| `showCharacterCount`   | `boolean`                                        | `true`              | Show character counter                              |
| `showWordCount`        | `boolean`                                        | `true`              | Show word counter                                   |
| `maxCharacters`        | `number`                                         | `undefined`         | Character limit                                     |
| `showBubbleMenu`       | `boolean`                                        | `true`              | Show text bubble menu                               |
| `showImageBubbleMenu`  | `boolean`                                        | `true`              | Show image bubble menu                              |
| `showTableMenu`        | `boolean`                                        | `true`              | Show table bubble menu                              |
| `showCellMenu`         | `boolean`                                        | `true`              | Show cell bubble menu                               |
| `enableSlashCommands`  | `boolean`                                        | `true`              | Enable slash commands functionality                 |
| `blockControls`        | `'inside' \| 'outside' \| 'none'`                | `'none'`            | Plus button and drag handle mode                    |
| `enableBlockShortcuts` | `boolean`                                        | `true`              | Enable block duplicate and move shortcuts           |
| `enableOfficePaste`    | `boolean`                                        | `true`              | Enable smart Office pasting                         |
| `paste`                | `AtePasteConfig`                                 | All kept            | Formats kept from other apps, `transformHTML` hook  |
| `toolbar`              | `AteToolbarConfig`                               | All enabled         | Detailed toolbar configuration                      |
| `bubbleMenu`           | `AteBubbleMenuConfig`                            | All enabled         | Detailed bubble menu configuration                  |
| `slashCommands`        | `AteSlashCommandsConfig`                         | All enabled         | Detailed slash commands config                      |
| `imageUploadHandler`   | `AteImageUploadHandler`                          | `undefined`         | Custom image upload function (toolbar, drop, paste) |
| `imageSrcResolver`     | `AteImageSrcResolver`                            | `undefined`         | Maps a stored image `src` to the URL to display     |
| `stateCalculators`     | `AteStateCalculator[]`                           | `[]`                | Custom reactive state logic                         |
| `tiptapExtensions`     | `(Extension \| Node \| Mark)[]`                  | `[]`                | Additional Tiptap extensions                        |
| `tiptapOptions`        | `Partial<EditorOptions>`                         | `{}`                | Additional Tiptap editor options                    |
| `starterKitOptions`    | `Partial<StarterKitOptions>`                     | `{}`                | Options for Tiptap's `StarterKit` (see below)       |

> **Note on Precedence**: Values provided in individual inputs (e.g., `[editable]="false"`) always take precedence over values defined inside the `[config]` object.

> **Overriding built-in extensions**: a custom extension in `tiptapExtensions` whose `name` matches a built-in ATE extension (such as `highlight`, `textStyle`, `textAlign`, `placeholder` or `resizableImage`) or a `StarterKit` extension (`link`, `codeBlock`, `heading`, ...) replaces the built-in one (and takes precedence over `starterKitOptions.<key>`). In Angular dev mode (`isDevMode()`), a one-time `[ATE]` warning per editor instance lists the replaced extensions, the ATE UI features that depend on them, and any ignored `starterKitOptions` keys. See [Custom Tiptap Extensions](ADVANCED.md#️-custom-tiptap-extensions).

> **Image upload flows**: `imageUploadHandler` is invoked for all file-based image insertions: toolbar picker, drag-and-drop, and clipboard paste.
>
> **Resolving image URLs**: `imageSrcResolver` (also `imageSrcResolver` in `[config]`) maps the `src` stored in the document to the URL the editor displays, for images that a plain `<img src>` cannot load (e.g. endpoints behind an `Authorization` header: fetch the image and resolve to a `blob:` URL). The document, `getHTML()`, `getJSON()`, the markdown/HTML exports, copy and paste always keep the original `src`. The resolver may return a `string`, a `Promise` or an `Observable` (first emission), is called whenever an image appears or its `src` changes (initial content, upload, paste, replace), and is called for every `src` (return it unchanged for the ones you do not handle). If it throws, rejects or resolves to an empty string, the original `src` is displayed. A resolution that finishes after the `src` changed is discarded. While resolving, the image has no `src`, so the original URL is not requested by the editor. "Download Image" and "Original" size use the resolved URL (the resolver is called again, so cache inside it). The editor never revokes the URLs you return: you own the `blob:` lifetime. Setting or replacing the resolver after the editor is created (e.g. once a token is available) re-resolves the images already displayed, keeping each current image until its new URL is ready; pass a stable function (not an inline arrow recreated on every change detection or config change), otherwise every change re-resolves all images. For pasting, the stored `src` must still be one the paste cleanup keeps (`http(s)`, root-relative, same-origin `blob:` or base64): other schemes are dropped as `unreachable`.
>
> **Pasted HTML images**: images inside pasted HTML (Notion, Google Docs, Office, web pages) are cleaned up too. Images whose source the page cannot load (`attachment:`, `file:`, `cid:`, foreign `blob:`) are dropped instead of being inserted broken, and base64 images are sent through `imageUploadHandler`, then swapped for the hosted URL (they stay base64 when no handler is set). Each dropped image emits `pastedImageRejected`.
>
> **Image validation feedback**: file-based images (clipboard, drag-and-drop, toolbar/slash-menu/bubble-menu picker, `uploadImage`) are validated against `allowedTypes` and `maxSize` before `imageUploadHandler` runs. `maxSize` is set in MB (default `5`). A rejected file is not inserted and emits `imageRejected` with the reason (`invalid-type`, `too-large`, or `upload-failed` when processing or the handler fails). Base64 images in pasted HTML go through the same validation and report it on `pastedImageRejected`.

> **Link shortcut**: `Mod+K` (`Cmd+K` on macOS, `Ctrl+K` elsewhere) opens the link editor when text is selected or the cursor is on a link, with focus in the URL field. With an empty selection outside a link the key event is left untouched, so app-level `Mod+K` shortcuts keep working.

> **Block shortcuts**: `Mod+D` duplicates the current block right after it, and `Mod+Shift+ArrowUp` / `Mod+Shift+ArrowDown` move it up or down by one sibling. Inside a list the block is the list or task item, which moves within its list and never out of it. At the edges of the document or list, in a read-only editor, or with `enableBlockShortcuts: false` the key event is left untouched. On macOS `Cmd+Shift+ArrowUp/Down` normally extends the selection to the document edges and `Cmd+D` bookmarks the page in the browser; with the shortcuts enabled the editor takes those keys only when it acts on them. They complement `blockControls`: the plus button and drag handle work with the mouse, the shortcuts with the keyboard, and each works without the other.
>
> **Block drag handle**: with `blockControls` enabled, the `⋮⋮` handle drags the whole top-level block. If the selection spans several blocks and you grab the handle of one of them, all the selected blocks move together and keep their order. The drop always lands on a top-level block boundary (never inside a list, blockquote or table cell) and a drop indicator line is shown before or after the target block (`.ate-block-drop-before` / `.ate-block-drop-after`, which you can restyle). The native drop cursor is hidden during a block drag, and the drag state is cleared on drop, `dragend` (also when the drop happens outside the editor) or Escape.

> **Paste settings**: `paste` (also `paste` in `[config]`, merged with it, the input winning) decides what is kept from HTML pasted or dropped from other apps. `colors: false` removes text colors (`color`, `<font color>`) and `highlights: false` removes highlights and background colors (`<mark>`, `background-color`), so hard-coded black text or white backgrounds do not clash with dark themes or your palette; both default to `true`. Bold, italic, links, lists and tables are always kept. Content copied from an Angular Tiptap Editor (this one or another one, marked when it is copied) always keeps its formatting; content from other ProseMirror-based editors counts as another app. `transformHTML(html, { source })` is the last step before the HTML is parsed: it receives the HTML after the Office cleanup (`enableOfficePaste`) and the format keys, with `source` set to `'editor'`, `'office'` or `'external'`, and returns the HTML to insert (if it throws or returns no string, the HTML is inserted unchanged). Every key is read at paste time, so changes apply to the next paste.

> **StarterKit options**: `starterKitOptions` is merged over the library defaults and passed to `StarterKit.configure()`, so you can disable or tune the bundled extensions (`undoRedo`, `heading`, `codeBlock`, ...). The default `link` options (`openOnClick: false` and the `ate-link` class) are kept unless you override them; `link: false` disables the extension. Changing the value at runtime re-creates the editor. For example, `@tiptap/extension-collaboration` needs `{ undoRedo: false }`, otherwise Tiptap warns that it is not compatible with undo-redo and the local history conflicts with Yjs' undo manager.

## ⚙️ AteEditorConfig Reference

The `AteEditorConfig` nested structure allows for complex configurations while remaining flat for core settings:

```typescript
export interface AteEditorConfig {
  // --- 1. Core Settings ---
  theme?: "light" | "dark" | "auto";
  mode?: "classic" | "seamless";
  height?: string | number;
  minHeight?: string | number;
  maxHeight?: string | number;
  fillContainer?: boolean;
  autofocus?: AteAutofocusMode; // "start" | "end" | "all" | boolean | number
  placeholder?: string;
  editable?: boolean;
  disabled?: boolean;
  locale?: string;
  spellcheck?: boolean;
  enableOfficePaste?: boolean;

  // --- 2. Visibility & UX Options ---
  showToolbar?: boolean;
  floatingToolbar?: boolean;
  showFooter?: boolean;
  showCharacterCount?: boolean;
  showWordCount?: boolean;
  showEditToggle?: boolean;
  showBubbleMenu?: boolean;
  showImageBubbleMenu?: boolean;
  showTableMenu?: boolean;
  showCellMenu?: boolean;
  downloadImage?: boolean; // Whether to allow image downloading from bubble menu
  enableSlashCommands?: boolean;
  enableBlockShortcuts?: boolean; // Mod+D duplicate, Mod+Shift+Arrow Up/Down move (default: true)
  maxCharacters?: number;
  blockControls?: AteBlockControlsMode; // "inside" | "outside" | "none"

  // --- 3. Complex Modules & Extensions ---
  toolbar?: AteToolbarConfig;
  bubbleMenu?: AteBubbleMenuConfig;
  imageBubbleMenu?: AteImageBubbleMenuConfig;
  tableBubbleMenu?: AteTableBubbleMenuConfig;
  cellBubbleMenu?: AteCellBubbleMenuConfig;
  slashCommands?: AteSlashCommandsConfig;
  imageUpload?: AteImageUploadConfig;
  imageSrcResolver?: AteImageSrcResolver;
  paste?: AtePasteConfig; // { colors?, highlights?, transformHTML? } for HTML from other apps
  angularNodes?: AteAngularNode[]; // Angular components as editor nodes
  tiptapExtensions?: (Extension | Node | Mark)[];
  tiptapOptions?: Partial<EditorOptions>;
  starterKitOptions?: Partial<StarterKitOptions>;
  stateCalculators?: AteStateCalculator[];
  customSlashCommands?: AteCustomSlashCommands;
}
```

## 📤 Outputs

| Output                | Type                                    | Description                                                                                                       |
| --------------------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `contentChange`       | `string`                                | Emitted when content changes                                                                                      |
| `editorCreated`       | `Editor`                                | Emitted when editor is created                                                                                    |
| `editorUpdate`        | `{ editor: Editor; transaction: any }`  | Emitted on every editor update                                                                                    |
| `editorFocus`         | `{ editor: Editor; event: FocusEvent }` | Emitted when editor gains focus                                                                                   |
| `editorBlur`          | `{ editor: Editor; event: FocusEvent }` | Emitted when editor loses focus                                                                                   |
| `editableChange`      | `boolean`                               | Emitted when edit mode is toggled                                                                                 |
| `imageUploaded`       | `AteImageUploadResult`                  | Emitted when an image is uploaded                                                                                 |
| `imageRejected`       | `AteImageRejection`                     | Emitted when an image file is not inserted (`invalid-type`, `too-large` or `upload-failed`)                       |
| `pastedImageRejected` | `AtePastedImageRejection`               | Emitted when an image from pasted HTML is dropped (`unreachable`, `invalid-type`, `too-large` or `upload-failed`) |

### Image rejection models

```typescript
type AteImageValidationReason = "invalid-type" | "too-large";
type AteImageSource = "paste" | "drop" | "picker" | "api";

interface AteImageRejection {
  reason: AteImageValidationReason | "upload-failed";
  file: File;
  source: AteImageSource; // paste (clipboard file), drop, picker (toolbar, slash menu, image bubble menu) or api (uploadImage)
}

interface AtePastedImageRejection {
  reason: "unreachable" | AteImageValidationReason | "upload-failed";
  src: string;
}

class AteImageValidationError extends Error {
  readonly reason: AteImageValidationReason; // `message` is the translated text
}
```

Programmatic callers that `await` `AteEditorCommandsService.uploadImage()` still receive the rejection (an `AteImageValidationError` for validation failures) in addition to the `imageRejected` output.

> **`imageRejected` vs `pastedImageRejected`**:
>
> - **`imageRejected` (`AteImageRejection`)** is emitted for **file-based** image insertions (`source: 'paste' | 'drop' | 'picker' | 'api'`, providing the `File` object) when a file fails `allowedTypes` (`invalid-type`), `maxSize` (`too-large`), or upload (`upload-failed`).
> - **`pastedImageRejected` (`AtePastedImageRejection`)** is emitted for **`<img src="...">` elements inside pasted HTML** (e.g. from Notion, Google Docs, Word, or web pages, providing the `src` string) when an image source is unreachable (`attachment:`, `file:`, `cid:`, foreign `blob:`) or when an embedded `data:image/...;base64` image fails validation (`invalid-type`, `too-large`) or re-hosting (`upload-failed`).
