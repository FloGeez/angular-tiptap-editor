# Advanced Usage Guide

This guide covers advanced integration patterns, custom extensions, and the internal architecture of the Angular Tiptap Editor.

## 🧩 Embedding Angular Components (Angular Nodes)

One of the most powerful features of this library is the ability to turn any Angular component into a TipTap node without writing complex extension code.

### 1. Define your component

Your component can optionally inherit from `AteAngularNodeView` to access the full TipTap API (`editor`, `node`, `attributes`, `updateAttributes`) via Signals.

```typescript
import { Component, computed } from "@angular/core";
import { AteAngularNodeView } from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-my-counter",
  template: `
    <div class="counter-node">
      <button (click)="increment()">Count: {{ count() }}</button>
    </div>
  `,
})
export class MyCounterComponent extends AteAngularNodeView {
  readonly count = computed<number>(() => (this.attributes()["count"] as number) || 0);

  increment() {
    this.updateAttributes({ count: this.count() + 1 });
  }
}
```

### 2. Register the Node

Map your component to the editor document structure via the `angularNodes` config:

```typescript
editorConfig: AteEditorConfig = {
  angularNodes: [
    {
      component: MyCounterComponent,
      name: "counter",
      attributes: { count: { default: 0 } },
      group: "block",
      draggable: true,
      selectable: true,
    },
  ],
};
```

---

## ⚡ Programmatic Control with `AteEditorCommandsService`

The `AteEditorCommandsService` provides deep programmatic control over editor instances and exposes the reactive state.

```typescript
import { AteEditorCommandsService } from "@flogeez/angular-tiptap-editor";

export class MyToolbarComponent {
  private editorCommands = inject(AteEditorCommandsService);

  // Execute commands on a specific editor instance
  clear(editor: Editor) {
    this.editorCommands.clearContent(editor);
  }

  // Access the live reactive state via Signal
  state = this.editorCommands.editorState; // WritableSignal<AteEditorState>
}
```

---

## 🛠️ Custom Tiptap Extensions

You can still use any standard Tiptap extension. Pass them via the `tiptapExtensions` property.

```typescript
import Highlight from "@tiptap/extension-highlight";

editorConfig: AteEditorConfig = {
  tiptapExtensions: [Highlight.configure({ multicolor: true })],
};
```

### Configuring the StarterKit

The editor builds on Tiptap's `StarterKit`. Use `starterKitOptions` (input or `AteEditorConfig` property) to disable or tune the extensions it bundles. Your options are merged over the library defaults, so the default link behavior is preserved unless you override `link`.

For example, turn off `undoRedo` when using `@tiptap/extension-collaboration` (Yjs), which ships its own undo manager:

```typescript
import Collaboration from "@tiptap/extension-collaboration";

editorConfig: AteEditorConfig = {
  starterKitOptions: { undoRedo: false },
  tiptapExtensions: [Collaboration.configure({ document: ydoc })],
};
```

### Overriding Built-in Extensions

Extensions passed in `tiptapExtensions` take precedence over built-in extensions of the same `name` (both ATE's built-ins such as `highlight`, `textStyle`, `color`, `placeholder`, `superscript`, `subscript`, `textAlign`, `resizableImage`, `tableExtension`, `tableOfContents`, and extensions bundled in Tiptap's `StarterKit` such as `codeBlock`, `heading`, `link`, `undoRedo`, ...).

The built-in `highlight` (multicolor) and `color` extensions validate color values: only a single valid CSS color is parsed or rendered, anything else (`red; position: fixed`, `url(...)`, `!important`) is dropped while the text is kept. Replacing `highlight` or `color` through `tiptapExtensions` removes this protection, so validate the color values yourself (or extend the built-in extension with `.configure()`/`.extend()` instead of providing a fresh one).

When a custom extension replaces a built-in one:

- The built-in extension (or `StarterKit` extension) is automatically disabled so your custom extension takes its place.
- If the same `StarterKit` extension is also configured in `starterKitOptions` (for example `starterKitOptions.link` alongside a custom `link` extension in `tiptapExtensions`), the custom extension in `tiptapExtensions` wins and `starterKitOptions.<key>` is ignored.
- In Angular development mode (`isDevMode()`), a one-time `[ATE]` `console.warn` per editor instance lists the replaced extension names, the ATE UI features and state calculators that depend on their commands/attributes, and any ignored `starterKitOptions` keys:

```
[ATE] Custom extension(s) in tiptapExtensions replaced built-in extension(s):
  - "highlight" (used by: Highlight toolbar button, bubble menu highlight button & color picker, marks.highlight state). Ensure your custom extension stays compatible with these features, or extend it under a unique name if you want both.
```

If you want to keep the built-in extension and add a specialized variant alongside it instead of replacing it, extend it under a unique `name`:

```typescript
import CodeBlock from "@tiptap/extension-code-block";

const MermaidCodeBlock = CodeBlock.extend({
  name: "mermaidCodeBlock",
  priority: 200,
  parseHTML() {
    return [
      {
        tag: "pre",
        preserveWhitespace: "full",
        getAttrs: el => ((el as HTMLElement).dataset["lang"] === "mermaid" ? null : false),
      },
    ];
  },
});

editorConfig: AteEditorConfig = {
  tiptapExtensions: [MermaidCodeBlock],
};
```

Both nodes are then in the schema, so narrow the parse rules of the new one (above, only `data-lang="mermaid"` blocks) and, if it should be created from Markdown or typing, give it its own input rules and keyboard shortcuts. Otherwise it competes with the original for the same content.

### Extending Reactive State (Calculators)

Any standard Mark or Node you add is automatically tracked by our `DiscoveryCalculator`. However, for complex calculations, you can define your own **Calculator**.

```typescript
import { AteStateCalculator } from "@flogeez/angular-tiptap-editor";

// Called on every editor update
export const MyDepthCalculator: AteStateCalculator = editor => ({
  custom: { selectionDepth: editor.state.selection.$from.depth },
});

// Register it
editorConfig: AteEditorConfig = {
  stateCalculators: [MyDepthCalculator],
};
```

---

## 🖼️ Advanced Image Handling

### Custom Upload Handler

By default, images are converted to base64. Provide a custom handler to upload to your server (S3, Cloudinary, etc.):

```typescript
uploadHandler: AteImageUploadHandler = async ctx => {
  const formData = new FormData();
  formData.append("image", ctx.file);

  const response = await fetch("/api/upload", { method: "POST", body: formData });
  const data = await response.json();

  return { src: data.url }; // Return the final URL
};
```

The `ctx` object provides `file`, `width`, `height`, `type`, and `base64` (fallback).

### Images Behind Authentication (`imageSrcResolver`)

When stored image URLs need credentials (a bearer token, signed cookies), a plain `<img src>` cannot load them. Provide an `imageSrcResolver` to fetch the image yourself and display a `blob:` URL, while the document keeps the original URL:

```typescript
private readonly http = inject(HttpClient);
private readonly blobUrls = new Map<string, Observable<string>>();

imageSrcResolver: AteImageSrcResolver = src => {
  if (!this.blobUrls.has(src)) {
    this.blobUrls.set(
      src,
      this.http.get(src, { responseType: "blob" }).pipe(
        map(blob => URL.createObjectURL(blob)),
        shareReplay(1)
      )
    );
  }
  return this.blobUrls.get(src)!;
};
```

```html
<angular-tiptap-editor [imageSrcResolver]="imageSrcResolver" [content]="content" />
```

- The resolver can also be set as `imageSrcResolver` in `[config]`, and may return a `string`, a `Promise` or an `Observable` (first emission).
- It runs for every image (initial content, upload, paste, replace) and again when an image `src` changes. Return the `src` unchanged for URLs you do not handle.
- On error (throw, rejection, empty result) the original `src` is displayed instead.
- `getHTML()`, `getJSON()`, exports, copy and paste keep the original `src`. "Download Image" and the "Original" size use the resolved URL, which calls the resolver again: cache by `src` as above.
- The editor never revokes the URLs you return. Revoke your `blob:` URLs when you no longer need them (e.g. in `ngOnDestroy`).
- Setting or replacing the resolver later (e.g. once a token is available, or after a token refresh) re-resolves the images already displayed; each image keeps its current URL until the new one is ready. Pass a stable function, like the class field above: an inline arrow recreated on every change detection or `[config]` change re-resolves every image each time.
- For pasting, the stored `src` must still be one the paste cleanup keeps (`http(s)`, root-relative, same-origin `blob:` or base64).

---

## 📋 Paste Handling (`paste`)

`paste` (input, or `paste` in `[config]`) decides what is kept from HTML pasted or dropped from other apps:

```html
<angular-tiptap-editor [paste]="{ colors: false, highlights: false }" />
```

| Key             | Default | Effect when `false`                                                     |
| --------------- | ------- | ----------------------------------------------------------------------- |
| `colors`        | `true`  | Removes text colors (`color`, `<font color>`)                           |
| `highlights`    | `true`  | Removes highlights and background colors (`<mark>`, `background-color`) |
| `transformHTML` | none    | Your own last step (see below)                                          |

The editor detects where the HTML comes from:

| Copied from                                                       | `source`   | Format keys                                             |
| ----------------------------------------------------------------- | ---------- | ------------------------------------------------------- |
| An Angular Tiptap Editor (this one or another one, in any app)    | `editor`   | Ignored: what the user formatted is kept                |
| Microsoft Word or Excel                                           | `office`   | Applied, after the Office cleanup (`enableOfficePaste`) |
| Anything else (Google Docs, web pages, Confluence, other editors) | `external` | Applied                                                 |

Plain-text paste (`Ctrl+Shift+V` / `Cmd+Shift+V`) is not affected.

### `transformHTML`: your own paste step

`transformHTML(html, { source })` runs last, after the Office cleanup and the format keys, for every source. Return the HTML to insert:

```typescript
paste: AtePasteConfig = {
  // Keep images only when they were copied inside the editor
  transformHTML: (html, { source }) =>
    source === "editor" ? html : html.replace(/<img[^>]*>/g, ""),
};
```

If it throws or does not return a string, the HTML is inserted as it was before this step. The editor only keeps what it can represent: HTML the editor has no extension for (e.g. font sizes) is dropped after this step, whatever you return.

---

## ⌨️ Custom Slash Commands

You can define entirely new commands for the slash menu (`/`):

```typescript
slashCommands: AteSlashCommandsConfig = {
  custom: [
    {
      title: "AI Action",
      description: "Generate content with AI",
      icon: "auto_fix",
      keywords: ["ai", "magic", "generate"],
      command: editor => {
        // Your logic here
        editor.commands.insertContent("✨ Generated content...");
      },
    },
  ],
};
```

---

## 🏗️ Architecture Overview

### Reactive State Management

The library uses a **Snapshot & Signal** pattern:

1. **State Snapshot**: Every transaction triggers "Calculators" that produce an immutable state object.
2. **Signals Integration**: This snapshot is stored in a Signal, ensuring `OnPush` components only re-render when their specific data changes.

### Isolated Instances

Each `AngularTiptapEditorComponent` provides its own services at the component level. You can have 10 editors on the same page; they will all have independent states, configurations, and upload handlers without any interference.

### Core Services

- **`AteEditorCommandsService`**: Centralized API for commands and state.
- **`AteEditorRegistry`**: Global root service tracking all editor instances and the active focused editor.
- **`AteIconRegistry`**: Global root signal-backed registry for SVG icons (configurable at bootstrap via `provideAteIcons()` or at runtime via `inject(AteIconRegistry).register()`).
- **`AteImageService`**: Image processing pipeline (compression, selection).
- **`AteI18nService`**: Reactive translation and locale management.

---

## 📋 Table of Contents Component (`AteTableOfContentsComponent`)

The `AteTableOfContentsComponent` provides a Notion-style, responsive Table of Contents:

```typescript
import { AteTableOfContentsComponent } from "@flogeez/angular-tiptap-editor";

@Component({
  imports: [AteTableOfContentsComponent],
  template: `
    <!-- Floating Notion-style TOC (auto-connects to active editor) -->
    <ate-table-of-contents [floating]="true" position="right" variant="card" />

    <!-- Or inline TOC targeting a specific editor by ID -->
    <ate-table-of-contents [editor]="'doc-editor'" variant="minimal" />
  `
})
```

### Options & Inputs

| Input           | Type                                   | Default     | Description                                                                      |
| --------------- | -------------------------------------- | ----------- | -------------------------------------------------------------------------------- |
| `[editor]`      | `Editor \| AteEditorRef \| string`     | `undefined` | Target editor instance, ref, or ID. Fallback: `AteEditorRegistry.activeEditor()` |
| `[floating]`    | `boolean`                              | `false`     | Floating fixed positioning mode                                                  |
| `[position]`    | `'left' \| 'right'`                    | `'right'`   | Floating alignment position                                                      |
| `[variant]`     | `'card' \| 'minimal' \| 'transparent'` | `'card'`    | Visual container variant                                                         |
| `[hoverExpand]` | `boolean`                              | `true`      | Collapses into dashes until hovered (floating mode)                              |
| `[showTitle]`   | `boolean`                              | `true`      | Toggle header title visibility                                                   |

---

## 🗂️ Global Editor Registry (`AteEditorRegistry`)

The `AteEditorRegistry` service is provided in `root` and tracks all editor instances:

```typescript
import { inject } from "@angular/core";
import { AteEditorRegistry } from "@flogeez/angular-tiptap-editor";

export class WorkspaceComponent {
  private registry = inject(AteEditorRegistry);

  // Access the currently active (focused) editor facade
  getActiveContent() {
    const activeRef = this.registry.activeEditor();
    if (activeRef) {
      console.log("Active Editor ID:", activeRef.id);
      console.log("Markdown:", activeRef.getContent("markdown"));
      activeRef.commands.toggleBold();
    }
  }

  // Access a specific editor by ID
  targetEditor() {
    const editorRef = this.registry.get("my-editor-id");
    editorRef?.commands.insertTable();
  }
}
```
