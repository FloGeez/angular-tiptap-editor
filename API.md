# API Reference

Detailed documentation for `AngularTiptapEditorComponent` inputs, outputs, and configuration objects.

## 📥 Inputs

| Input                 | Type                                             | Default             | Description                                         |
| --------------------- | ------------------------------------------------ | ------------------- | --------------------------------------------------- |
| `config`              | `AteEditorConfig`                                | `{}`                | **Global configuration object** (Recommended)       |
| `content`             | `string`                                         | `""`                | Initial HTML content                                |
| `placeholder`         | `string`                                         | `"Start typing..."` | Placeholder text (overrides config)                 |
| `locale`              | `'en' \| 'fr'`                                   | Auto-detect         | Editor language (overrides config)                  |
| `editable`            | `boolean`                                        | `true`              | Whether editor is editable                          |
| `disabled`            | `boolean`                                        | `false`             | Disabled state (for forms)                          |
| `mode`                | `'classic' \| 'seamless'`                        | `'classic'`         | Seamless mode removes borders and background        |
| `height`              | `string \| number`                               | `undefined`         | Editor height (e.g. '400px', 400, 'auto')           |
| `maxHeight`           | `string \| number`                               | `undefined`         | Maximum height                                      |
| `minHeight`           | `string \| number`                               | `undefined`         | Minimum height                                      |
| `fillContainer`       | `boolean`                                        | `false`             | Fill parent container height                        |
| `autofocus`           | `boolean \| 'start' \| 'end' \| 'all' \| number` | `false`             | Auto-focus behavior                                 |
| `spellcheck`          | `boolean`                                        | `true`              | Enable browser spellcheck                           |
| `showToolbar`         | `boolean`                                        | `true`              | Show toolbar                                        |
| `floatingToolbar`     | `boolean`                                        | `false`             | Show floating toolbar on focus                      |
| `showFooter`          | `boolean`                                        | `true`              | Show footer (counters)                              |
| `showEditToggle`      | `boolean`                                        | `false`             | Show read-only/edit toggle button                   |
| `showCharacterCount`  | `boolean`                                        | `true`              | Show character counter                              |
| `showWordCount`       | `boolean`                                        | `true`              | Show word counter                                   |
| `maxCharacters`       | `number`                                         | `undefined`         | Character limit                                     |
| `showBubbleMenu`      | `boolean`                                        | `true`              | Show text bubble menu                               |
| `showImageBubbleMenu` | `boolean`                                        | `true`              | Show image bubble menu                              |
| `showTableMenu`       | `boolean`                                        | `true`              | Show table bubble menu                              |
| `showCellMenu`        | `boolean`                                        | `true`              | Show cell bubble menu                               |
| `enableSlashCommands` | `boolean`                                        | `true`              | Enable slash commands functionality                 |
| `blockControls`       | `'inside' \| 'outside' \| 'none'`                | `'none'`            | Plus button and drag handle mode                    |
| `enableOfficePaste`   | `boolean`                                        | `true`              | Enable smart Office pasting                         |
| `toolbar`             | `AteToolbarConfig`                               | All enabled         | Detailed toolbar configuration                      |
| `bubbleMenu`          | `AteBubbleMenuConfig`                            | All enabled         | Detailed bubble menu configuration                  |
| `slashCommands`       | `AteSlashCommandsConfig`                         | All enabled         | Detailed slash commands config                      |
| `imageUploadHandler`  | `AteImageUploadHandler`                          | `undefined`         | Custom image upload function (toolbar, drop, paste) |
| `stateCalculators`    | `AteStateCalculator[]`                           | `[]`                | Custom reactive state logic                         |
| `tiptapExtensions`    | `(Extension \| Node \| Mark)[]`                  | `[]`                | Additional Tiptap extensions                        |
| `tiptapOptions`       | `Partial<EditorOptions>`                         | `{}`                | Additional Tiptap editor options                    |

> **Note on Precedence**: Values provided in individual inputs (e.g., `[editable]="false"`) always take precedence over values defined inside the `[config]` object.

> **Image upload flows**: `imageUploadHandler` is invoked for all file-based image insertions: toolbar picker, drag-and-drop, and clipboard paste.
>
> **Pasted HTML images**: images inside pasted HTML (Notion, Google Docs, Office, web pages) are cleaned up too. Images whose source the page cannot load (`attachment:`, `file:`, `cid:`, foreign `blob:`) are dropped instead of being inserted broken, and base64 images are sent through `imageUploadHandler`, then swapped for the hosted URL (they stay base64 when no handler is set). Each dropped image emits `pastedImageRejected`.
>
> **Image validation feedback**: file-based images (clipboard, drag-and-drop, toolbar/slash-menu/bubble-menu picker, `uploadImage`) are validated against `allowedTypes` and `maxSize` before `imageUploadHandler` runs. `maxSize` is set in MB (default `5`). A rejected file is not inserted and emits `imageRejected` with the reason (`invalid-type`, `too-large`, or `upload-failed` when processing or the handler fails). Base64 images in pasted HTML go through the same validation and report it on `pastedImageRejected`.

> **Link shortcut**: `Mod+K` (`Cmd+K` on macOS, `Ctrl+K` elsewhere) opens the link editor when text is selected or the cursor is on a link, with focus in the URL field. With an empty selection outside a link the key event is left untouched, so app-level `Mod+K` shortcuts keep working.

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
  angularNodes?: AteAngularNode[]; // Angular components as editor nodes
  tiptapExtensions?: (Extension | Node | Mark)[];
  tiptapOptions?: Partial<EditorOptions>;
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
