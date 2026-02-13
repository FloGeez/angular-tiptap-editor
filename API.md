# API Reference

Detailed documentation for `AngularTiptapEditorComponent` inputs, outputs, and configuration objects.

## 📥 Inputs

| Input                 | Type                                             | Default             | Description                                   |
| --------------------- | ------------------------------------------------ | ------------------- | --------------------------------------------- |
| `config`              | `AteEditorConfig`                                | `{}`                | **Global configuration object** (Recommended) |
| `content`             | `string`                                         | `""`                | Initial HTML content                          |
| `placeholder`         | `string`                                         | `"Start typing..."` | Placeholder text (overrides config)           |
| `locale`              | `'en' \| 'fr'`                                   | Auto-detect         | Editor language (overrides config)            |
| `editable`            | `boolean`                                        | `true`              | Whether editor is editable                    |
| `disabled`            | `boolean`                                        | `false`             | Disabled state (for forms)                    |
| `mode`                | `'classic' \| 'seamless'`                        | `'classic'`         | Seamless mode removes borders and background  |
| `height`              | `string \| number`                               | `undefined`         | Editor height (e.g. '400px', 400, 'auto')     |
| `maxHeight`           | `string \| number`                               | `undefined`         | Maximum height                                |
| `minHeight`           | `string \| number`                               | `undefined`         | Minimum height                                |
| `fillContainer`       | `boolean`                                        | `false`             | Fill parent container height                  |
| `autofocus`           | `boolean \| 'start' \| 'end' \| 'all' \| number` | `false`             | Auto-focus behavior                           |
| `spellcheck`          | `boolean`                                        | `true`              | Enable browser spellcheck                     |
| `showToolbar`         | `boolean`                                        | `true`              | Show toolbar                                  |
| `floatingToolbar`     | `boolean`                                        | `false`             | Show floating toolbar on focus                |
| `showFooter`          | `boolean`                                        | `true`              | Show footer (counters)                        |
| `showEditToggle`      | `boolean`                                        | `false`             | Show read-only/edit toggle button             |
| `showCharacterCount`  | `boolean`                                        | `true`              | Show character counter                        |
| `showWordCount`       | `boolean`                                        | `true`              | Show word counter                             |
| `maxCharacters`       | `number`                                         | `undefined`         | Character limit                               |
| `showBubbleMenu`      | `boolean`                                        | `true`              | Show text bubble menu                         |
| `showImageBubbleMenu` | `boolean`                                        | `true`              | Show image bubble menu                        |
| `showTableMenu`       | `boolean`                                        | `true`              | Show table bubble menu                        |
| `showCellMenu`        | `boolean`                                        | `true`              | Show cell bubble menu                         |
| `enableSlashCommands` | `boolean`                                        | `true`              | Enable slash commands functionality           |
| `blockControls`       | `'inside' \| 'outside' \| 'none'`                | `'none'`            | Plus button and drag handle mode              |
| `enableOfficePaste`   | `boolean`                                        | `true`              | Enable smart Office pasting                   |
| `toolbar`             | `AteToolbarConfig`                               | All enabled         | Detailed toolbar configuration                |
| `bubbleMenu`          | `AteBubbleMenuConfig`                            | All enabled         | Detailed bubble menu configuration            |
| `slashCommands`       | `AteSlashCommandsConfig`                         | All enabled         | Detailed slash commands config                |
| `imageUploadHandler`  | `AteImageUploadHandler`                          | `undefined`         | Custom image upload function                  |
| `stateCalculators`    | `AteStateCalculator[]`                           | `[]`                | Custom reactive state logic                   |
| `tiptapExtensions`    | `(Extension \| Node \| Mark)[]`                  | `[]`                | Additional Tiptap extensions                  |
| `tiptapOptions`       | `Partial<EditorOptions>`                         | `{}`                | Additional Tiptap editor options              |

> **Note on Precedence**: Values provided in individual inputs (e.g., `[editable]="false"`) always take precedence over values defined inside the `[config]` object.

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

| Output           | Type                                    | Description                       |
| ---------------- | --------------------------------------- | --------------------------------- |
| `contentChange`  | `string`                                | Emitted when content changes      |
| `editorCreated`  | `Editor`                                | Emitted when editor is created    |
| `editorUpdate`   | `{ editor: Editor; transaction: any }`  | Emitted on every editor update    |
| `editorFocus`    | `{ editor: Editor; event: FocusEvent }` | Emitted when editor gains focus   |
| `editorBlur`     | `{ editor: Editor; event: FocusEvent }` | Emitted when editor loses focus   |
| `editableChange` | `boolean`                               | Emitted when edit mode is toggled |
