# Advanced Usage Guide

This guide covers advanced integration patterns, custom extensions, and the internal architecture of the Angular Tiptap Editor.

## 🧩 Embedding Angular Components (Angular Nodes)

One of the most powerful features of this library is the ability to turn any Angular component into a TipTap node without writing complex extension code.

### 1. Define your component

Your component can optionally inherit from `AteAngularNodeView` to access the full TipTap API (`editor`, `node`, `updateAttributes`) via Signals.

```typescript
import { Component } from "@angular/core";
import { AteAngularNodeView } from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-my-counter",
  template: `
    <div class="counter-node">
      <button (click)="increment()">Count: {{ attributes().count }}</button>
    </div>
  `,
})
export class MyCounterComponent extends AteAngularNodeView {
  increment() {
    this.updateAttributes({ count: this.attributes().count + 1 });
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
- **`AteImageService`**: Image processing pipeline (compression, selection).
- **`AteI18nService`**: Reactive translation and locale management.
