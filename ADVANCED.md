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
- **`AteEditorRegistry`**: Global root service tracking all editor instances and the active focused editor.
- **`AteImageService`**: Image processing pipeline (compression, selection).
- **`AteI18nService`**: Reactive translation and locale management.

---

## 🧱 Composing Your Own Editor (Building Blocks)

`AngularTiptapEditorComponent` is "batteries included" (toolbar, bubble menus, slash commands, block controls, all wired up by default). Internally it's built from the same public pieces documented here — if you need a lighter or fully custom layout, assemble them yourself instead.

### The pieces

- **`AteEditorCoreComponent`**: attaches to an existing element via the `[ateEditorCore]` attribute and owns the Tiptap `Editor` instance, extensions, paste/drop handling and reactive state — with **zero UI chrome**. No wrapper element is added to the DOM.
- **UI chrome components**: `AteToolbarComponent` (`ate-toolbar`), `AteBubbleMenuComponent` (`ate-bubble-menu`), `AteImageBubbleMenuComponent`, `AteTableBubbleMenuComponent`, `AteCellBubbleMenuComponent`, `AteLinkBubbleMenuComponent`, `AteColorBubbleMenuComponent`, `AteSlashCommandsComponent`, `AteBlockControlsComponent`, `AteEditToggleComponent` — each takes the `Editor` instance (and a `config`, where relevant) as a plain `@Input`.
- **`ATE_EDITOR_PROVIDERS`**: the DI providers (`AteEditorCommandsService` and friends) that `AteEditorCoreComponent` and the UI chrome components share to stay in sync. **Required** on an ancestor component of everything below — Angular throws a clear DI error if it's missing.

### Example: bare editor, no chrome at all

```typescript
import { Component } from "@angular/core";
import { AteEditorCoreComponent, ATE_EDITOR_PROVIDERS } from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-bare-editor",
  standalone: true,
  imports: [AteEditorCoreComponent],
  providers: ATE_EDITOR_PROVIDERS,
  template: `<div ateEditorCore [content]="content" (contentChange)="content = $event"></div>`,
})
export class BareEditorComponent {
  content = "<p>Hello world</p>";
}
```

### Example: toolbar + core, no bubble menus

```typescript
import { Component } from "@angular/core";
import {
  AteEditorCoreComponent,
  AteToolbarComponent,
  ATE_EDITOR_PROVIDERS,
  ATE_DEFAULT_TOOLBAR_CONFIG,
} from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-toolbar-editor",
  standalone: true,
  imports: [AteEditorCoreComponent, AteToolbarComponent],
  providers: ATE_EDITOR_PROVIDERS,
  template: `
    @if (core.editor(); as editor) {
      <ate-toolbar [editor]="editor" [config]="toolbarConfig" />
    }
    <div ateEditorCore #core="ateEditorCore" [content]="content"></div>
  `,
})
export class ToolbarEditorComponent {
  content = "<p>Hello world</p>";
  toolbarConfig = ATE_DEFAULT_TOOLBAR_CONFIG;
}
```

`ate-toolbar` manages its own hover state (it suppresses bubble menus while the pointer is over it via `AteEditorCommandsService`), so this behavior works automatically as soon as it shares `ATE_EDITOR_PROVIDERS` with the core — no extra wiring needed.

### Example: block controls composed by hand

Block controls (the `+` / drag handle) can't be wired through DI alone — they read hover data produced by an extension registered on the editor instance. Bind `[blockControls]` on the core and forward its `hoveredBlock()` signal:

```html
<div ateEditorCore #core="ateEditorCore" [blockControls]="'outside'" [content]="content"></div>

@if (core.editor(); as editor) {
<ate-block-controls [editor]="editor" [hoveredData]="core.hoveredBlock()" />
}
```

### Custom toolbar visuals

`AteButtonComponent`, `AteSeparatorComponent`, and `AteColorPickerComponent` (the atoms `ate-toolbar` itself is built from) are also exported, so a fully custom toolbar can match the built-in visual style.

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
