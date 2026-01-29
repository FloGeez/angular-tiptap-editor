# Angular Tiptap Editor

A modern, customizable rich-text editor for Angular, built with Tiptap.

[![NPM Version](https://img.shields.io/npm/v/@flogeez/angular-tiptap-editor?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@flogeez/angular-tiptap-editor) [![Demo](https://img.shields.io/badge/Demo-Live-brightgreen?style=for-the-badge&logo=google-chrome)](https://flogeez.github.io/angular-tiptap-editor/) [![Try it on StackBlitz](https://img.shields.io/badge/Try%20it-StackBlitz-blue?style=for-the-badge&logo=stackblitz)](https://stackblitz.com/edit/angular-tiptap-editor)

Angular Tiptap Editor is a high-performance WYSIWYG editor engineered for the modern Angular ecosystem. Built on top of Tiptap and powered by a native **Signals** architecture, it features a polished, professional design that feels, I think, clean and modern out of the box.
Yet, I've worked to keep it fully customizable: you can easily configure the editor, tweak the UI, or even embed your own Angular components as interactive nodes.

## 🚀 Features

- **Modern Angular**: Built with Angular 18+ using Signals and modern patterns for peak performance.
- **Full Rich Text Power**: Powered by Tiptap with extensive formatting and block capabilities.
- **Modern UX (Notion-like)**: Intuitive slash commands and bubble menus for a keyboard-first experience.
- **Highly Customizable**: Easily configure toolbars, bubble menus, and slash command items.
- **Signal-Based Reactivity**: Pure Signal architecture natively compatible with `ChangeDetectionStrategy.OnPush`.
- **Advanced Table Support**: Full table management with cell selection and context-aware bubble menus.
- **Professional Media**: Advanced image handling with resizing, auto-compression, and custom uploaders.
- **Built-in i18n**: English & French support with a reactive, extensible locale system.
- **Word/Character Count**: Real-time statistics with proper pluralization support.
- **Office-Ready**: Cleaned-up pasting from Microsoft Word and Excel to maintain layout integrity.
- **Seamless Angular Integration**: Use a single `provideAteEditor()` to initialize the library and share a root injector across all nodes.
- **Universal Component Embedding**: Embed _any_ Angular component (library or custom) directly into the editor as a TipTap node.
- **Global Configuration**: Set application-wide defaults for themes, toolbars, and features with hierarchical inheritance.
- **Service Driven**: Deep programmatic control via `AteEditorCommandsService` and isolated instances.
- **A11y First**: Built with accessibility best practices and full keyboard navigation.

## 💎 Why this editor?

Most Angular wrappers for Tiptap provide a basic component but leave the heavy lifting to you. **Angular Tiptap Editor** is built to solve common production hurdles:

- **True Scalability**: Thanks to **isolated services** provided at the component level, you can host multiple independent editors with different configurations and languages on the same page without a single state leak.
- **OnPush by Default**: The entire UI (toolbar, menus) is powered by **Angular Signals**. The `editorState` snapshot logic ensures that your components only re-render when necessary, even in complex `OnPush` applications.
- **Deep i18n & Extensibility**: Not just English/French — you can inject **custom translations** and **custom Tiptap extensions**. Our `DiscoveryCalculator` automatically tracks any new mark or node you add, making them reactive without extra code.
- **Clean Office UX**: Professional-grade pasting from **Word and Excel** plus smart image handling (auto-compression, resizing handles) ensures a polished experience for end-users.

## 🛠️ Extensions included

The library comes with a pre-configured set of standard and custom extensions:

- **Nodes**: `StarterKit`, `Heading`, `Table`, `Image`, `HorizontalRule`, `CodeBlock`.
- **Marks**: `Bold`, `Italic`, `Underline`, `Strike`, `Code`, `Link`, `Highlight`, `TextStyle`, `Color`, `Superscript`, `Subscript`.
- **Utilities**: `Placeholder`, `CharacterCount`, `Typography`, `Focus`, `BubbleMenu`, `Gapcursor`, `Dropcursor`, `ResizableImage` (Custom).

## 📦 Installation

```bash
npm install @flogeez/angular-tiptap-editor
```

### CSS Styles

Add the required CSS to your `angular.json` file in the `styles` array:

```json
{
  "styles": [
    ...
    "node_modules/@fontsource/material-symbols-outlined/index.css",
    "node_modules/@flogeez/angular-tiptap-editor/styles/index.css",
    ...
  ]
}
```

## 🎯 Quick Start

### 1. Basic Usage

```typescript
import { Component } from "@angular/core";
import { AngularTiptapEditorComponent } from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-example",
  standalone: true,
  imports: [AngularTiptapEditorComponent],
  template: `
    <angular-tiptap-editor [content]="content" (contentChange)="onContentChange($event)" />
  `,
})
export class ExampleComponent {
  content = "<p>Hello <strong>World</strong>!</p>";

  onContentChange(newContent: string) {
    this.content = newContent;
    console.log("Content updated:", newContent);
  }
}
```

### 2. With Custom Configuration

The editor can be fully configured using a single `[config]` object, which provides a clean and type-safe way to manage all settings.

```typescript
import { Component } from "@angular/core";
import {
  AngularTiptapEditorComponent,
  AteEditorConfig,
  ATE_DEFAULT_TOOLBAR_CONFIG,
} from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-advanced",
  standalone: true,
  imports: [AngularTiptapEditorComponent],
  template: `
    <angular-tiptap-editor
      [content]="content"
      [config]="editorConfig"
      (contentChange)="onContentChange($event)" />
  `,
})
export class AdvancedComponent {
  content = "<h1>Welcome!</h1><p>Start editing...</p>";

  editorConfig: AteEditorConfig = {
    locale: "fr", // Force French (default is auto-detect)
    height: "400px", // Set a fixed height
    placeholder: "Commencez à rédiger...",
    showWordCount: false, // Hide the word counter (default is true)
    showEditToggle: true, // Show the button to toggle read-only mode (default is false)

    // Customize the toolbar by enabling specific features
    toolbar: {
      ...ATE_DEFAULT_TOOLBAR_CONFIG,
      clear: true, // Enable the 'Clear' button
      highlight: false, // Disable the highlight button
    },

    // Only enable specific slash commands
    slashCommands: {
      heading1: true,
      heading2: true,
      image: true,
      table: true,
    },
  };

  onContentChange(newContent: string) {
    this.content = newContent;
  }
}
```

### 3. With Form Integration

```typescript
import { Component } from "@angular/core";
import { FormControl, ReactiveFormsModule } from "@angular/forms";
import { AngularTiptapEditorComponent } from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-form",
  standalone: true,
  imports: [AngularTiptapEditorComponent, ReactiveFormsModule],
  template: `
    <form>
      <angular-tiptap-editor
        [formControl]="contentControl"
        placeholder="Enter your content here..." />
      <button type="submit">Submit</button>
    </form>
  `,
})
export class FormComponent {
  contentControl = new FormControl("<p>Initial content</p>");
}
```

## ⚙️ Advanced Setup & Extensions

### 1. Global Setup (Recommended)

Initialize the library globally in your `app.config.ts` or `main.ts` to capture the root injector and set application-wide defaults.

```typescript
import { ApplicationConfig } from "@angular/core";
import { provideAteEditor } from "@flogeez/angular-tiptap-editor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideAteEditor({
      theme: "auto",
      mode: "seamless",
      tiptapExtensions: [
        /* Global TipTap Extensions */
      ],
      stateCalculators: [
        /* Global State Calculators */
      ],
    }),
  ],
};
```

### 2. Embedding Angular Components (Angular Nodes)

Turn any Angular component into a TipTap node without writing extension code. This project makes it easy to map your existing Angular components directly to the editor's document structure.

```typescript
import { Component } from "@angular/core";
import {
  AngularTiptapEditorComponent,
  AteEditorConfig,
  AteAngularNode,
} from "@flogeez/angular-tiptap-editor";
import { MyCounterComponent } from "./my-counter.component";

@Component({
  selector: "app-custom-nodes",
  standalone: true,
  imports: [AngularTiptapEditorComponent],
  template: ` <angular-tiptap-editor [config]="editorConfig" /> `,
})
export class CustomNodesComponent {
  // Use AteAngularNode for explicit typing if needed
  myNodes: AteAngularNode[] = [
    {
      component: MyCounterComponent,
      name: "counter",
      attributes: { count: { default: 0 } },
      group: "block",
      draggable: true,
    },
  ];

  editorConfig: AteEditorConfig = {
    angularNodes: this.myNodes,
  };
}
```

> **Note**: Your component can inherit from `AteAngularNodeView` to access the full TipTap API (`editor`, `node`, `updateAttributes`) via Signals!

### 3. Using EditorCommandsService

Deep programmatic control over any editor instance.

```typescript
import { Component, inject } from "@angular/core";
import { AteEditorCommandsService } from "@flogeez/angular-tiptap-editor";
import { Editor } from "@tiptap/core";

@Component({
  selector: "app-commands",
  standalone: true,
  template: `
    <div class="controls">
      <button (click)="clearContent()">Clear</button>
      <button (click)="focusEditor()">Focus</button>
      <button (click)="setContent()">Set Content</button>
    </div>
    <angular-tiptap-editor (editorCreated)="onEditorCreated($event)" />
  `,
})
export class CommandsComponent {
  private editorCommandsService = inject(AteEditorCommandsService);
  private editor: Editor | null = null;

  onEditorCreated(editor: Editor) {
    this.editor = editor;
  }

  clearContent() {
    if (this.editor) this.editorCommandsService.clearContent(this.editor);
  }

  focusEditor() {
    if (this.editor) this.editorCommandsService.focus(this.editor);
  }

  setContent() {
    if (this.editor) this.editorCommandsService.setContent(this.editor, "<h1>New!</h1>");
  }
}
```

### 4. Custom Tiptap Extensions (Low Level)

Standard TipTap extensions can be passed via the `tiptapExtensions` property in your config.

```typescript
import { AteEditorConfig } from "@flogeez/angular-tiptap-editor";

@Component({
  template: ` <angular-tiptap-editor [config]="editorConfig" /> `,
})
export class CustomExtensionsComponent {
  editorConfig: AteEditorConfig = {
    tiptapExtensions: [
      /* Standard TipTap extensions (Highlight, Link, etc.) */
    ],
  };
}
```

### 5. Extending Reactive Editor State (Calculators)

The editor features a dual-layer state architecture for maximum reactivity.

#### A. Automatic Extension Tracking (Zero Config)

Any TipTap **Mark** or **Node** you add to `tiptapExtensions` is automatically tracked. You don't need extra code to make them reactive.

- **For Marks**: `state().marks.yourExtensionName` (boolean).
- **For Nodes**: `state().nodes.yourExtensionName` (boolean).

#### B. Custom State Calculators (Advanced)

Extract complex data (attributes, depth, custom logic) via specialized Calculators.

**1. Define a Calculator**:

```typescript
import { AteStateCalculator } from "@flogeez/angular-tiptap-editor";

// Called on every editor update
export const MyCustomCalculator: AteStateCalculator = editor => ({
  custom: { selectionDepth: editor.state.selection.$from.depth },
});
```

**2. Register in the Config**:

```typescript
import { AteEditorConfig } from "@flogeez/angular-tiptap-editor";

editorConfig: AteEditorConfig = {
  stateCalculators: [MyCustomCalculator],
};
```

```html
<angular-tiptap-editor [config]="editorConfig" />
```

**3. Consume the State**:

```typescript
@Component({ ... })
export class MyToolbarComponent {
  private editorCommands = inject(AteEditorCommandsService);

  // Access your custom data reactively via Signals!
  depth = computed(() => this.editorCommands.editorState().custom?.selectionDepth);
}
```

## ✨ Key Features

### 📊 Table Management

Full table support with intuitive bubble menus:

- **Table Creation**: Insert tables via slash commands (`/table`)
- **Cell Selection**: Click and drag to select multiple cells
- **Bubble Menus**: Context-aware menus for table operations
- **Row/Column Management**: Add, remove, and merge cells
- **Styling**: Custom table styling with proper borders

### ⚡ Slash Commands

Quick content insertion with slash commands:

- **Headings**: `/h1`, `/h2`, `/h3`
- **Lists**: `/bullet`, `/numbered`
- **Blocks**: `/quote`, `/code`, `/line`
- **Media**: `/image`, `/table`
- **Fully Internationalized**: All commands translated

#### Custom Slash Commands

The `slashCommands` object also allows you to add completely custom command items:

```typescript
import { AteSlashCommandsConfig } from "@flogeez/angular-tiptap-editor";

slashCommands: AteSlashCommandsConfig = {
  // Toggle native commands
  heading1: true,
  image: false,
  // Add custom ones
  custom: [
    {
      title: "Magic Action",
      description: "Insert some AI magic",
      icon: "auto_fix",
      keywords: ["magic", "ai"],
      command: editor => editor.commands.insertContent("✨ Magic happened!"),
    },
  ],
};
```

### 🖼️ Advanced Image Handling

Professional image management:

- **Drag & Drop**: Drag images directly into the editor
- **File Selection**: Click to select images from device
- **Auto-Compression**: Images automatically compressed (max 1920x1080)
- **Resizable**: Images can be resized with handles
- **Bubble Menu**: Context menu for image operations
- **Custom Upload Handler**: Upload images to your own server instead of base64

#### Custom Image Upload Handler

By default, images are converted to base64 and embedded directly in the HTML content. You can provide a custom upload handler to upload images to your own server (S3, Cloudinary, custom API, etc.) and use the returned URL instead.

The handler can return either an **Observable** or a **Promise**.

#### Using Observable (recommended for Angular)

```typescript
import { Component, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { map } from "rxjs/operators";
import {
  AngularTiptapEditorComponent,
  AteImageUploadHandler,
} from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-custom-upload",
  standalone: true,
  imports: [AngularTiptapEditorComponent],
  template: `
    <angular-tiptap-editor
      [content]="content"
      [imageUploadHandler]="uploadHandler"
      (contentChange)="onContentChange($event)" />
  `,
})
export class CustomUploadComponent {
  private http = inject(HttpClient);
  content = "";

  uploadHandler: AteImageUploadHandler = ctx => {
    const formData = new FormData();
    formData.append("image", ctx.file);

    return this.http
      .post<{ url: string }>("/api/upload", formData)
      .pipe(map(result => ({ src: result.url })));
  };

  onContentChange(newContent: string) {
    this.content = newContent;
  }
}
```

#### Using Promise (async/await)

```typescript
uploadHandler: AteImageUploadHandler = async ctx => {
  const formData = new FormData();
  formData.append("image", ctx.file);

  const result = await firstValueFrom(this.http.post<{ url: string }>("/api/upload", formData));

  return { src: result.url };
};
```

The `ImageUploadContext` provides:

- `file`: The original File object
- `width`: Processed image width
- `height`: Processed image height
- `type`: MIME type (e.g., 'image/jpeg')
- `base64`: Base64 data URL of the processed image (fallback)

The handler must return an `ImageUploadHandlerResult` with at least a `src` property containing the image URL.

---

### 📝 Word & Character Counting

Real-time content statistics:

- **Live Updates**: Counters update as you type
- **Proper Pluralization**: "1 word" vs "2 words"
- **Separate Counts**: Independent word and character counts
- **Configurable**: Show/hide individual counters

## 🎨 Demo

### 🌐 Live Demo

Try the interactive demo online: **[https://flogeez.github.io/angular-tiptap-editor/](https://flogeez.github.io/angular-tiptap-editor/)**

### 🖥️ Run Locally

```bash
git clone https://github.com/FloGeez/angular-tiptap-editor.git
cd angular-tiptap-editor
npm install
npm start
```

Open [http://localhost:4200](http://localhost:4200) to view the demo.

## 📖 Documentation

### API Reference

#### Inputs

| Input                 | Type                                             | Default             | Description                                   |
| --------------------- | ------------------------------------------------ | ------------------- | --------------------------------------------- |
| `config`              | `AteEditorConfig`                                | `{}`                | **Global configuration object** (Recommended) |
| `content`             | `string`                                         | `""`                | Initial HTML content                          |
| `placeholder`         | `string`                                         | `"Start typing..."` | Placeholder text (overrides config)           |
| `locale`              | `'en' \| 'fr'`                                   | Auto-detect         | Editor language (overrides config)            |
| `editable`            | `boolean`                                        | `true`              | Whether editor is editable                    |
| `height`              | `string`                                         | `undefined`         | Editor height (e.g. '400px', 'auto')          |
| `maxHeight`           | `string`                                         | `undefined`         | Maximum height (e.g. '80vh')                  |
| `minHeight`           | `string`                                         | `undefined`         | Minimum height                                |
| `maxCharacters`       | `number`                                         | `undefined`         | Character limit                               |
| `fillContainer`       | `boolean`                                        | `false`             | Fill parent container height                  |
| `autofocus`           | `boolean \| 'start' \| 'end' \| 'all' \| number` | `false`             | Auto-focus behavior                           |
| `disabled`            | `boolean`                                        | `false`             | Disabled state (for forms)                    |
| `spellcheck`          | `boolean`                                        | `true`              | Enable browser spellcheck                     |
| `showToolbar`         | `boolean`                                        | `true`              | Show toolbar                                  |
| `showFooter`          | `boolean`                                        | `true`              | Show footer (counters)                        |
| `showBubbleMenu`      | `boolean`                                        | `true`              | Show text bubble menu                         |
| `showImageBubbleMenu` | `boolean`                                        | `true`              | Show image bubble menu                        |
| `showTableMenu`       | `boolean`                                        | `true`              | Show table bubble menu                        |
| `showCellMenu`        | `boolean`                                        | `true`              | Show cell bubble menu                         |
| `enableSlashCommands` | `boolean`                                        | `true`              | Enable slash commands functionality           |
| `enableOfficePaste`   | `boolean`                                        | `true`              | Enable smart Office pasting                   |
| `showCharacterCount`  | `boolean`                                        | `true`              | Show character counter                        |
| `showWordCount`       | `boolean`                                        | `true`              | Show word counter                             |
| `toolbar`             | `AteToolbarConfig`                               | All enabled         | Detailed toolbar configuration                |
| `bubbleMenu`          | `AteBubbleMenuConfig`                            | All enabled         | Detailed bubble menu configuration            |
| `slashCommands`       | `AteSlashCommandsConfig`                         | All enabled         | Detailed slash commands config                |
| `imageUploadHandler`  | `AteImageUploadHandler`                          | `undefined`         | Custom image upload function                  |
| `stateCalculators`    | `AteStateCalculator[]`                           | `[]`                | Custom reactive state logic                   |
| `tiptapExtensions`    | `(Extension \| Node \| Mark)[]`                  | `[]`                | Additional Tiptap extensions                  |
| `tiptapOptions`       | `Partial<EditorOptions>`                         | `{}`                | Additional Tiptap editor options              |

> **Note on Precedence**: Values provided in individual inputs (e.g., `[editable]="false"`) always take precedence over values defined inside the `[config]` object.

#### AteEditorConfig Reference

The `AteEditorConfig` nested structure allows for complex configurations while remaining flat for core settings:

```typescript
export interface AteEditorConfig {
  // Core Settings
  theme?: "light" | "dark" | "auto";
  height?: string;
  minHeight?: string;
  maxHeight?: string;
  fillContainer?: boolean;
  autofocus?: "start" | "end" | "all" | boolean | number;
  placeholder?: string;
  editable?: boolean;
  disabled?: boolean;
  locale?: string;
  spellcheck?: boolean;
  enableOfficePaste?: boolean;

  // Visibility Options
  showToolbar?: boolean;
  showFooter?: boolean;
  showCharacterCount?: boolean;
  showWordCount?: boolean;
  showEditToggle?: boolean;
  showBubbleMenu?: boolean;
  showImageBubbleMenu?: boolean;
  showTableMenu?: boolean;
  showCellMenu?: boolean;
  enableSlashCommands?: boolean;
  maxCharacters?: number;

  // Complex Modules
  toolbar?: AteToolbarConfig;
  bubbleMenu?: AteBubbleMenuConfig;
  imageBubbleMenu?: AteImageBubbleMenuConfig;
  tableBubbleMenu?: AteTableBubbleMenuConfig;
  cellBubbleMenu?: AteCellBubbleMenuConfig;
  slashCommands?: AteSlashCommandsConfig;
  imageUpload?: AteImageUploadConfig;
}
```

#### Image Upload Configuration

The `imageUpload` property in `AteEditorConfig` provides fine-grained control over the image processing pipeline:

```typescript
export interface AteImageUploadConfig {
  /** Custom handler to upload files to a server */
  handler?: AteImageUploadHandler;
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number;
  /** Accepted file types (default: 'image/*') */
  accept?: string;
  /** Whether to automatically compress images before upload (default: true) */
  autoCompress?: boolean;
}
```

#### Outputs

| Output          | Type              | Description                     |
| --------------- | ----------------- | ------------------------------- |
| `contentChange` | `string`          | Emitted when content changes    |
| `editorCreated` | `Editor`          | Emitted when editor is created  |
| `editorUpdate`  | `{editor, trans}` | Emitted on every editor update  |
| `editorFocus`   | `{editor, event}` | Emitted when editor gains focus |
| `editorBlur`    | `{editor, event}` | Emitted when editor loses focus |

## 🌍 Internationalization

The editor comes with built-in support for **English (en)** and **French (fr)**, featuring automatic browser language detection.

### Basic Usage

```typescript
// Force a specific language
<angular-tiptap-editor [locale]="'fr'" />

// Auto-detect (default)
<angular-tiptap-editor />
```

### Adding Custom Languages

You can easily extend the editor with new languages or override existing labels using the `AteI18nService`:

```typescript
import { AteI18nService } from "@flogeez/angular-tiptap-editor";

@Component({ ... })
export class MyComponent {
  constructor(private i18nService: AteI18nService) {
    // Add Spanish support
    this.i18nService.addTranslations('es', {
       toolbar: { bold: 'Negrita', italic: 'Cursiva', ... },
       editor: { placeholder: 'Empieza a escribir...' }
    });

    // Switch to Spanish
    this.i18nService.setLocale('es');
  }
}
```

### 🎨 CSS Custom Properties

Customize the editor appearance using CSS variables with the `--ate-` prefix:

```css
/* In your global styles or component styles */
angular-tiptap-editor {
  --ate-primary: #2563eb;
  --ate-primary-contrast: #ffffff;
  --ate-primary-light: color-mix(in srgb, var(--ate-primary), transparent 90%);
  --ate-primary-lighter: color-mix(in srgb, var(--ate-primary), transparent 95%);
  --ate-primary-light-alpha: color-mix(in srgb, var(--ate-primary), transparent 85%);

  --ate-surface: #ffffff;
  --ate-surface-secondary: #f8f9fa;
  --ate-surface-tertiary: #f1f5f9;

  --ate-text: #2d3748;
  --ate-text-secondary: #64748b;
  --ate-text-muted: #a0aec0;

  --ate-border: #e2e8f0;

  /* And More... */
}
```

#### Dark Mode Support

The editor supports dark mode in two ways:

**1. With CSS Class**

```html
<angular-tiptap-editor [class.dark]="isDarkMode" />
```

**2. With Data Attribute**

```html
<angular-tiptap-editor [attr.data-theme]="isDarkMode ? 'dark' : null" />
```

#### Example: Custom Dark Theme

```css
angular-tiptap-editor.dark {
  --ate-background: #1a1a2e;
  --ate-border-color: #3d3d5c;
  --ate-focus-color: #6366f1;
  --ate-text-color: #e2e8f0;
  --ate-placeholder-color: #64748b;
  --ate-counter-background: #2d2d44;
  --ate-counter-color: #94a3b8;
  --ate-blockquote-background: #2d2d44;
  --ate-code-background: #2d2d44;
}
```

#### Example: Custom Brand Colors

```css
angular-tiptap-editor {
  --ate-focus-color: #8b5cf6;
  --ate-image-selected-color: #8b5cf6;
  --ate-border-radius: 12px;
}
```

### ⚡ Reactive State & OnPush

The library exposes a reactive `editorState` signal via the `AteEditorCommandsService`. This signal contains everything you need to build custom UIs around the editor:

- **Active State**: Check if `bold`, `italic`, or custom marks are active.
- **Commands Availability**: Check if `undo`, `redo`, or custom commands can be executed.
- **Structural Data**: Access table status, image attributes, or selection details.

Since it's built with Signals, your custom toolbar items or UI overlays will only re-render when the specific data they consume changes, making it extremely efficient for `OnPush` applications.

## 🏗️ Architecture

### Reactive State Management

The library uses a **Snapshot & Signal** pattern to bridge Tiptap and Angular.

1.  **State Snapshot**: Every editor transaction triggers a set of "Calculators" that produce a single immutable state object.
2.  **Specialized Calculators**: Logic is modularized into specialized functions (Marks, Table, Image, etc.) and a **Discovery Calculator** for automatic extension detection.
3.  **Signals Integration**: This snapshot is stored in a single Angular Signal. Sub-components (toolbar, menus) consume this signal only where needed.
4.  **Change Detection Optimization**: A custom equality check on the signal prevents unnecessary re-renders when the visual state of the editor hasn't changed.

### Core Services

- **`AteEditorCommandsService`**: Exposes the `editorState` signal and provides a centralized API for executing Tiptap commands.
- **`AteImageService`**: Manages the image processing pipeline (selection, compression, and server-side upload handling).
- **`AteI18nService`**: Reactive translation service with support for browser locale auto-detection.

### Isolated Instances

Each component instance provides its own set of services (`AteEditorCommandsService`, `AteImageService`, etc.) at the component level. This ensures that multiple editors on the same page maintain independent states and configurations without interference.

### Modern Angular Integration

- **Signals**: Native reactivity for efficient UI updates.
- **OnPush**: Designed for `ChangeDetectionStrategy.OnPush` throughout.
- **Typed State**: Fully typed interfaces for the editor state and configurations.

### Default Configurations

The library provides default configurations that can be imported and customized:

```typescript
import {
  ATE_DEFAULT_TOOLBAR_CONFIG,
  ATE_DEFAULT_BUBBLE_MENU_CONFIG,
  ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG,
  ATE_DEFAULT_TABLE_MENU_CONFIG,
  ATE_DEFAULT_SLASH_COMMANDS_CONFIG,
} from "@flogeez/angular-tiptap-editor";
```

## 🔧 Development

### Build Library

```bash
npm run build:lib
```

### Watch Mode (Development)

```bash
npm run dev
```

This runs the library in watch mode and starts the demo application.

### Available Scripts

- `npm start` - Start demo application
- `npm run build` - Build demo application
- `npm run build:lib` - Build library
- `npm run watch:lib` - Watch library changes
- `npm run dev` - Development mode (watch + serve)

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🔗 Links

- 📖 [Tiptap Documentation](https://tiptap.dev/)
- 🅰️ [Angular Documentation](https://angular.dev/)
- 📦 [NPM Package](https://www.npmjs.com/package/@flogeez/angular-tiptap-editor)
- 📖 [Live Demo](https://flogeez.github.io/angular-tiptap-editor/)
- 🐛 [Report Issues](https://github.com/FloGeez/angular-tiptap-editor/issues)
- 💡 [Feature Requests](https://github.com/FloGeez/angular-tiptap-editor/issues)

## 🆕 What's New

### Latest Updates

- ✅ **Seamless Integration**: Drastically simplified setup with `provideAteEditor()` and declarative `nodeViews`.
- ✅ **Universal Component Engine**: Embed any Angular component as an editor node.

---

Made with ❤️ by [FloGeez](https://github.com/FloGeez)
