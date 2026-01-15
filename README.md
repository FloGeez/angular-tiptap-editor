# Angular Tiptap Editor

A modern, customizable rich-text editor for Angular applications, built with Tiptap and featuring complete internationalization support.

[![Demo](https://img.shields.io/badge/Demo-Live-brightgreen?style=for-the-badge&logo=google-chrome)](https://flogeez.github.io/angular-tiptap-editor/) [![Try it on StackBlitz](https://img.shields.io/badge/Try%20it-StackBlitz-blue?style=for-the-badge&logo=stackblitz)](https://stackblitz.com/edit/angular-tiptap-editor)

## 📖 Table of Contents

- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
  - [Basic Usage](#1-basic-usage)
  - [Form Integration](#4-with-form-integration)
  - [Editor Commands](#5-using-editorcommandsservice)
  - [Reactive State](#6-extending-reactive-editor-state)
- [Key Features](#-key-features)
  - [Table Management](#-table-management)
  - [Slash Commands](#-slash-commands)
  - [Advanced Image Handling](#️-advanced-image-handling)
- [Documentation](#-documentation)
- [Theming & Dark Mode](#-css-custom-properties)
- [Architecture](#-architecture)

## 🚀 Features

- **Modern Angular**: Built with Angular 18+ using Signals and modern patterns for peak performance.
- **Full Rich Text Power**: Powered by Tiptap v2 with extensive formatting and block capabilities.
- **Modern UX (Notion-like)**: Intuitive slash commands and bubble menus for a keyboard-first experience.
- **Highly Customizable**: Easily configure toolbars, bubble menus, and slash command items.
- **Signal-Based Reactivity**: Pure Signal architecture natively compatible with `ChangeDetectionStrategy.OnPush`.
- **Advanced Table Support**: Full table management with cell selection and context-aware bubble menus.
- **Professional Media**: Advanced image handling with resizing, auto-compression, and custom uploaders.
- **Built-in i18n**: English & French support with a reactive, extensible locale system.
- **Word/Character Count**: Real-time statistics with proper pluralization support.
- **Office-Ready**: Cleaned-up pasting from Microsoft Word and Excel to maintain layout integrity.
- **Service Driven**: Deep programmatic control via `EditorCommandsService` and isolated instances.
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
    "node_modules/@flogeez/angular-tiptap-editor/src/lib/styles/index.css",
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
    <angular-tiptap-editor
      [content]="content"
      (contentChange)="onContentChange($event)"
    />
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

```typescript
import { Component } from "@angular/core";
import {
  AngularTiptapEditorComponent,
  DEFAULT_TOOLBAR_CONFIG,
  DEFAULT_BUBBLE_MENU_CONFIG,
} from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-advanced",
  standalone: true,
  imports: [AngularTiptapEditorComponent],
  template: `
    <angular-tiptap-editor
      [content]="content"
      [toolbar]="toolbarConfig"
      [bubbleMenu]="bubbleMenuConfig"
      [slashCommands]="slashCommandsConfig"
      [locale]="'en'"
      [height]="400"
      [showCharacterCount]="true"
      [showWordCount]="true"
      [maxCharacters]="500"
      (contentChange)="onContentChange($event)"
    />
  `,
})
export class AdvancedComponent {
  content = "<h1>Welcome!</h1><p>Start editing...</p>";

  // Use default configurations as base
  toolbarConfig = {
    ...DEFAULT_TOOLBAR_CONFIG,
    clear: true, // Add clear button
  };

  bubbleMenuConfig = {
    ...DEFAULT_BUBBLE_MENU_CONFIG,
    table: true, // Enable table bubble menu
  };

  // No config needed if you want all commands enabled
  slashCommandsConfig = {
    image: true,
    table: true,
    heading1: true
  };

  // Available keys: "heading1", "heading2", "heading3", "bulletList", 
  // "orderedList", "blockquote", "code", "image", "horizontalRule", "table"

  onContentChange(newContent: string) {
    this.content = newContent;
  }
}
```

### 3. Registering Custom Extensions

Easily extend the editor with any standard Tiptap extension or your own custom marks/nodes via the `tiptapExtensions` input.

```typescript
import { Component } from "@angular/core";
import { AngularTiptapEditorComponent } from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-custom-extensions",
  standalone: true,
  imports: [AngularTiptapEditorComponent],
  template: `
    <angular-tiptap-editor
      [content]="content"
      [tiptapExtensions]="extensions"
      (contentChange)="content = $event"
    />
  `,
})
export class CustomExtensionsComponent {
  content = "<p>Custom extensions example</p>";

  extensions = [
    // Add your custom TipTap extensions here
    // Example: Custom extension configuration
    // MyCustomExtension.configure({ /* options */ })
  ];
}
```

### 4. With Form Integration

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
        placeholder="Enter your content here..."
        [showCharacterCount]="true"
        [showWordCount]="true"
      />
      <button type="submit">Submit</button>
    </form>
  `,
})
export class FormComponent {
  contentControl = new FormControl("<p>Initial content</p>");
}
```

### 5. Using EditorCommandsService

```typescript
import { Component, inject } from "@angular/core";
import { EditorCommandsService } from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-commands",
  standalone: true,
  template: `
    <div>
      <div class="controls">
        <button (click)="clearContent()">Clear Content</button>
        <button (click)="focusEditor()">Focus Editor</button>
        <button (click)="setContent()">Set Content</button>
      </div>

      <angular-tiptap-editor 
        (editorCreated)="onEditorCreated($event)" 
      />
    </div>
  `,
})
export class CommandsComponent {
  private editorCommandsService = inject(EditorCommandsService);
  private editor: Editor | null = null;

  onEditorCreated(editor: Editor) {
    this.editor = editor;
  }

  clearContent() {
    if (this.editor) {
      this.editorCommandsService.clearContent(this.editor);
    }
  }

  focusEditor() {
    if (this.editor) {
      this.editorCommandsService.focus(this.editor);
    }
  }

  setContent() {
    if (this.editor) {
      this.editorCommandsService.setContent(
        this.editor,
        "<h1>New Content</h1>"
      );
    }
  }
}
```

### 6. Extending Reactive Editor State

The editor features a dual-layer state architecture: **Automatic Tracking** for simple extensions and **Custom Calculators** for advanced needs.

#### A. Automatic Extension Tracking (Zero Config)

Any TipTap **Mark** or **Node** you add to `tiptapExtensions` is automatically tracked by our `DiscoveryCalculator`. You don't need to write any extra code to make them reactive.

*   **For Marks**: `state().marks.yourExtensionName` (boolean) and `state().can.toggleYourExtensionName` (boolean).
*   **For Nodes**: `state().nodes.yourExtensionName` (boolean).

#### B. Custom State Calculators (Advanced)

If you need to extract complex data (like attributes, depth, or custom logic), you can provide a custom `StateCalculator`.

1. **Define a Calculator**:
```typescript
import { StateCalculator } from "@flogeez/angular-tiptap-editor";

// This function will be called on every editor update
export const MyCustomCalculator: StateCalculator = (editor) => {
  return {
    custom: {
      hasHighPriority: editor.isActive('priority'),
      selectionDepth: editor.state.selection.$from.depth,
      // Any data you need...
    }
  };
};
```

2. **Register it in the Template**:
```html
<angular-tiptap-editor 
  [stateCalculators]="[MyCustomCalculator]" 
/>
```

3. **Consume it anywhere**:
```typescript
@Component({ ... })
export class MyToolbarComponent {
  private editorCommands = inject(EditorCommandsService);
  
  // Access your custom data reactively!
  isHighPriority = computed(() => this.editorCommands.editorState().custom?.hasHighPriority);
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
import { SlashCommandsConfig } from "@flogeez/angular-tiptap-editor";

slashCommands: SlashCommandsConfig = {
  // Toggle native commands
  heading1: true,
  image: false,
  // Add custom ones
  custom: [
    {
      title: 'Magic Action',
      description: 'Insert some AI magic',
      icon: 'auto_fix',
      keywords: ['magic', 'ai'],
      command: (editor) => editor.commands.insertContent('✨ Magic happened!')
    }
  ]
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
import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import {
  AngularTiptapEditorComponent,
  ImageUploadHandler
} from '@flogeez/angular-tiptap-editor';

@Component({
  selector: 'app-custom-upload',
  standalone: true,
  imports: [AngularTiptapEditorComponent],
  template: `
    <angular-tiptap-editor
      [content]="content"
      [imageUploadHandler]="uploadHandler"
      (contentChange)="onContentChange($event)"
    />
  `
})
export class CustomUploadComponent {
  private http = inject(HttpClient);
  content = '';

  uploadHandler: ImageUploadHandler = (ctx) => {
    const formData = new FormData();
    formData.append('image', ctx.file);

    return this.http.post<{ url: string }>('/api/upload', formData).pipe(
      map(result => ({ src: result.url }))
    );
  };

  onContentChange(newContent: string) {
    this.content = newContent;
  }
}
```

#### Using Promise (async/await)

```typescript
uploadHandler: ImageUploadHandler = async (ctx) => {
  const formData = new FormData();
  formData.append('image', ctx.file);

  const result = await firstValueFrom(
    this.http.post<{ url: string }>('/api/upload', formData)
  );

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

| Input                | Type                                   | Default             | Description                      |
| -------------------- | -------------------------------------- | ------------------- | -------------------------------- |
| `content`            | `string`                               | `""`                | Initial HTML content             |
| `placeholder`        | `string`                               | `"Start typing..."` | Placeholder text                 |
| `locale`             | `'en' \| 'fr'`                         | Auto-detect         | Editor language                  |
| `editable`           | `boolean`                              | `true`              | Whether editor is editable       |
| `height`             | `number`                               | `undefined`         | Fixed height in pixels           |
| `maxHeight`          | `number`                               | `undefined`         | Maximum height in pixels         |
| `minHeight`          | `number`                               | `200`               | Minimum height in pixels         |
| `maxCharacters`      | `number`                               | `undefined`         | Character limit                  |
| `fillContainer`      | `boolean`                              | `false`             | Fill parent container height     |
| `autofocus`          | `boolean \| 'start' \| 'end' \| 'all'` | `false`             | Auto-focus behavior              |
| `showToolbar`        | `boolean`                              | `true`              | Show toolbar                     |
| `showBubbleMenu`     | `boolean`                              | `true`              | Show text bubble menu            |
| `showImageBubbleMenu`| `boolean`                              | `true`              | Show image bubble menu           |
| `showTableBubbleMenu`| `boolean`                              | `true`              | Show table bubble menu           |
| `showCellBubbleMenu` | `boolean`                              | `true`              | Show cell bubble menu            |
| `enableSlashCommands`| `boolean`                              | `true`              | Enable slash commands functionality|
| `enableOfficePaste`  | `boolean`                              | `true`              | Enable smart Office pasting      |
| `showCharacterCount` | `boolean`                              | `true`              | Show character counter           |
| `showWordCount`      | `boolean`                              | `true`              | Show word counter                |
| `toolbar`            | `ToolbarConfig`                        | All enabled         | Toolbar configuration            |
| `bubbleMenu`         | `BubbleMenuConfig`                     | All enabled         | Bubble menu configuration        |
| `imageBubbleMenu`    | `ImageBubbleMenuConfig`                | All enabled         | Image bubble menu config         |
| `tableBubbleMenu`    | `TableBubbleMenuConfig`                | All enabled         | Table bubble menu config         |
| `cellBubbleMenu`     | `CellBubbleMenuConfig`                 | All enabled         | Cell bubble menu config          |
| `slashCommands`      | `SlashCommandsConfig`                  | All enabled         | Slash commands configuration     |
| `imageUploadHandler` | `ImageUploadHandler`                   | `undefined`         | Custom image upload function     |
| `stateCalculators`   | `StateCalculator[]`                    | `[]`                | Custom reactive state logic      |
| `tiptapExtensions`   | `(Extension \| Node \| Mark)[]`        | `[]`                | Additional Tiptap extensions     |
| `tiptapOptions`      | `Partial<EditorOptions>`               | `{}`                | Additional Tiptap editor options |


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

You can easily extend the editor with new languages or override existing labels using the `TiptapI18nService`:

```typescript
import { TiptapI18nService } from "@flogeez/angular-tiptap-editor";

@Component({ ... })
export class MyComponent {
  constructor(private i18nService: TiptapI18nService) {
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

The library exposes a reactive `editorState` signal via the `EditorCommandsService`. This signal contains everything you need to build custom UIs around the editor:

- **Active State**: Check if `bold`, `italic`, or custom marks are active.
- **Commands Availability**: Check if `undo`, `redo`, or custom commands can be executed.
- **Structural Data**: Access table status, image attributes, or selection details.

Since it's built with Signals, your custom toolbar items or UI overlays will only re-render when the specific data they consume changes, making it extremely efficient for `OnPush` applications.

---

### 🧩 Custom Tiptap Extensions

You are not limited to the built-in extensions. Pass any Tiptap extension, mark, or node:

```html
<angular-tiptap-editor [tiptapExtensions]="[MyCustomExtension]" />
```

Any custom extension is automatically detected and its state (active/can) is added to the reactive `editorState` snapshot.

---

## 🏗️ Architecture

### Reactive State Management

The library uses a **Snapshot & Signal** pattern to bridge Tiptap and Angular.

1.  **State Snapshot**: Every editor transaction triggers a set of "Calculators" that produce a single immutable state object.
2.  **Specialized Calculators**: Logic is modularized into specialized functions (Marks, Table, Image, etc.) and a **Discovery Calculator** for automatic extension detection.
3.  **Signals Integration**: This snapshot is stored in a single Angular Signal. Sub-components (toolbar, menus) consume this signal only where needed.
4.  **Change Detection Optimization**: A custom equality check on the signal prevents unnecessary re-renders when the visual state of the editor hasn't changed.

### Core Services

- **`EditorCommandsService`**: Exposes the `editorState` signal and provides a centralized API for executing Tiptap commands.
- **`ImageService`**: Manages the image processing pipeline (selection, compression, and server-side upload handling).
- **`TiptapI18nService`**: Reactive translation service with support for browser locale auto-detection.

### Isolated Instances

Each component instance provides its own set of services (`EditorCommandsService`, `ImageService`, etc.) at the component level. This ensures that multiple editors on the same page maintain independent states and configurations without interference.

### Modern Angular Integration

- **Signals**: Native reactivity for efficient UI updates.
- **OnPush**: Designed for `ChangeDetectionStrategy.OnPush` throughout.
- **Typed State**: Fully typed interfaces for the editor state and configurations.

### Default Configurations

The library provides default configurations that can be imported and customized:

```typescript
import {
  DEFAULT_TOOLBAR_CONFIG,
  DEFAULT_BUBBLE_MENU_CONFIG,
  DEFAULT_IMAGE_BUBBLE_MENU_CONFIG,
  DEFAULT_TABLE_MENU_CONFIG,
  SLASH_COMMAND_KEYS,
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

- ✅ **Reactive State & Signals**: Optimized state management for a faster, smoother experience.
- ✅ **Zero-Config Extensions**: Custom Tiptap Marks and Nodes are tracked automatically.
- ✅ **Multi-Instance Support**: Use multiple independent editors on the same page without state leaks.
- ✅ **Clean Service Architecture**: Decoupled configurations and isolated services for better stability.
- ✅ **Refactored Link Management**: Dedicated link bubble menu with smart UI anchoring and real-time URL sync.

---

Made with ❤️ by [FloGeez](https://github.com/FloGeez)
