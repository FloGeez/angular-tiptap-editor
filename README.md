# Angular Tiptap Editor

> [!IMPORTANT]
> **^v3.0.0 uses Tiptap v3**. If you need to stay on Tiptap v2, please use version `^2.4.0`.

A modern, customizable Angular rich-text editor, built with **Tiptap**.

[![NPM Version](https://img.shields.io/npm/v/@flogeez/angular-tiptap-editor?style=for-the-badge&logo=npm)](https://www.npmjs.com/package/@flogeez/angular-tiptap-editor) [![Demo](https://img.shields.io/badge/Demo-Live-brightgreen?style=for-the-badge&logo=google-chrome)](https://flogeez.github.io/angular-tiptap-editor/) [![Try it on StackBlitz](https://img.shields.io/badge/Try%20it-StackBlitz-blue?style=for-the-badge&logo=stackblitz)](https://stackblitz.com/edit/angular-tiptap-editor)

High-performance Angular WYSIWYG editor. Built on top of **Tiptap** and powered by a native **Signals** architecture, it features a polished, professional design that feels, I think, clean and modern out of the box.
Yet, I've worked to keep it fully customizable: you can easily configure the editor, tweak the UI, or even embed your own Angular components as interactive nodes.

---

## ✨ Features

- ⚡ **Signal-Based**: Native performance with `ChangeDetectionStrategy.OnPush`.
- 🧩 **Angular Nodes**: Embed any Angular component as an interactive editor node.
- ⌨️ **UX First**: Slash commands (`/`) and context-aware bubble menus (Notion-like).
- 📊 **Table Power**: Advanced management with cell selection and merging.
- 🖼️ **Pro Media**: Image resizing, auto-compression, and custom uploaders.
- 🌍 **Built-in i18n**: Support for English and French out of the box.
- 📎 **Office-Ready**: Clean pasting from Word and Excel.
- 🎨 **Highly Customizable**: Easily configure toolbars, bubble menus, and slash command items.

- 🛠️ **Extensible**: Easily add custom Tiptap extensions and reactive state calculators.

## 📦 Installation

```bash
npm install @flogeez/angular-tiptap-editor
```

Add the styles to your `angular.json`:

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

## 🚀 Quick Start

### 1. Global Setup

Initialize the library in `app.config.ts`:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [provideAteEditor()],
};
```

### 2. Basic Usage

```typescript
import { AngularTiptapEditorComponent } from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-example",
  standalone: true,
  imports: [AngularTiptapEditorComponent],
  template: `<angular-tiptap-editor
    [content]="content"
    (contentChange)="onContentChange($event)" />`,
})
export class ExampleComponent {
  content = "<p>Hello World!</p>";
  onContentChange(html: string) {
    console.log(html);
  }
}
```

### 3. Reactive Forms Integration

```typescript
import { FormControl, ReactiveFormsModule } from "@angular/forms";

@Component({
  standalone: true,
  imports: [AngularTiptapEditorComponent, ReactiveFormsModule],
  template: ` <angular-tiptap-editor [formControl]="contentControl" /> `,
})
export class FormComponent {
  contentControl = new FormControl("<p>Initial content</p>");
}
```

## ⚙️ Configuration

The editor is fully configurable via the `[config]` input:

```typescript
editorConfig: AteEditorConfig = {
  locale: "fr",
  placeholder: "Commencez à rédiger...",
  toolbar: { ...ATE_DEFAULT_TOOLBAR_CONFIG, highlight: true },
  slashCommands: { heading1: true, table: true },
};
```

| Input        | Type              | Description                        |
| ------------ | ----------------- | ---------------------------------- |
| `[config]`   | `AteEditorConfig` | Global config object (recommended) |
| `[content]`  | `string`          | Initial HTML content               |
| `[editable]` | `boolean`         | Read-only toggle                   |
| `[disabled]` | `boolean`         | Disabled toggle                    |

_See the [API reference](./API.md) for the full list of inputs and configuration options._

## 🧩 Advanced Features

For deeper integration patterns and complex use cases, check our **[Advanced Usage Guide](./ADVANCED.md)**.

### Custom Angular Nodes

Embed any Angular component as an editor node (e.g., a dynamic counter, a complex widget, IA block, etc.):

```typescript
angularNodes: [
  {
    component: MyCounterComponent,
    name: "counter",
    attributes: { count: { default: 0 } },
    group: "block",
  },
];
```

### Image Upload Handler

Avoid base64 by providing a custom uploader (S3, Cloudinary, etc.):

```typescript
uploadHandler: AteImageUploadHandler = ctx => {
  return this.http.post<any>("/api/upload", ctx.file).pipe(map(res => ({ src: res.url })));
};
```

## 🌍 i18n & 🎨 Styling

- **Languages**: Detects browser language automatically. Extend with `AteI18nService.addTranslations()`.
- **Styling**: Customize via CSS variables (e.g., `--ate-primary`, `--ate-border-radius`, and much more).
- **Dark Mode**: Works natively by adding `.dark` or `[data-theme="dark"]`.

## 🔧 Development

```bash
npm install
npm run build:lib  # Build library
npm start          # Run demo
```

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🔗 Links

- 📖 [Tiptap Documentation](https://tiptap.dev/)
- 📦 [NPM Package](https://www.npmjs.com/package/@flogeez/angular-tiptap-editor)
- 📖 [Live Demo](https://flogeez.github.io/angular-tiptap-editor/)
- 🐛 [Report Issues / Feature Requests](https://github.com/FloGeez/angular-tiptap-editor/issues)

Made with ❤️ by [FloGeez](https://github.com/FloGeez)
