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

`AngularTiptapEditorComponent` is "batteries included" (toolbar, bubble menus, slash commands, block controls, all wired up by default). If you need a lighter or fully custom layout, assemble the same public pieces yourself instead.

### The pieces

- **`AteEditorChassisComponent`** (`ate-editor-chassis`): the recommended starting point. A Root compound component — it provides the required DI setup itself, so you just project whatever UI chrome you want inside it. No manual providers, no DI errors to debug.
- **`AteEditorCoreComponent`**: the lower-level primitive Chassis (and `AngularTiptapEditorComponent`) are both built on. Attaches to an existing element via the `[ateEditorCore]` attribute and owns the Tiptap `Editor` instance, extensions, paste/drop handling and reactive state — with **zero UI chrome**, no wrapper element added to the DOM. Use it directly only if you need to place it somewhere `ate-editor-chassis`'s template can't (e.g. sharing `ATE_EDITOR_PROVIDERS` across a custom layout of your own).
- **UI chrome components**: `AteToolbarComponent` (`ate-toolbar`), `AteBubbleMenuComponent` (`ate-bubble-menu`), `AteImageBubbleMenuComponent`, `AteTableBubbleMenuComponent`, `AteCellBubbleMenuComponent`, `AteLinkBubbleMenuComponent`, `AteColorBubbleMenuComponent`, `AteSlashCommandsComponent`, `AteBlockControlsComponent`, `AteEditToggleComponent` — each takes the `Editor` instance (and a `config`, where relevant) as a plain `@Input`.
- **`ATE_EDITOR_PROVIDERS`**: the DI providers (`AteEditorCommandsService` and friends) that `AteEditorCoreComponent` and the UI chrome components share to stay in sync. `ate-editor-chassis` declares these for you; only needed manually if you compose `AteEditorCoreComponent` directly.

### Example: bare editor, no chrome at all

```typescript
import { Component } from "@angular/core";
import { AteEditorChassisComponent } from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-bare-editor",
  standalone: true,
  imports: [AteEditorChassisComponent],
  template: `
    <ate-editor-chassis [content]="content" (contentChange)="content = $event" />
  `,
})
export class BareEditorComponent {
  content = "<p>Hello world</p>";
}
```

### Example: toolbar, no bubble menus

Project `<ate-toolbar>` inside `<ate-editor-chassis>` — it's always rendered above the editable content, wherever you write it, and inherits the shared editor state automatically:

```typescript
import { Component } from "@angular/core";
import {
  AteEditorChassisComponent,
  AteToolbarComponent,
  ATE_DEFAULT_TOOLBAR_CONFIG,
} from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-toolbar-editor",
  standalone: true,
  imports: [AteEditorChassisComponent, AteToolbarComponent],
  template: `
    <ate-editor-chassis #chassis="ateEditorChassis" [content]="content">
      @if (chassis.editor(); as editor) {
        <ate-toolbar [editor]="editor" [config]="toolbarConfig" />
      }
    </ate-editor-chassis>
  `,
})
export class ToolbarEditorComponent {
  content = "<p>Hello world</p>";
  toolbarConfig = ATE_DEFAULT_TOOLBAR_CONFIG;
}
```

`ate-toolbar` manages its own hover state (it suppresses bubble menus while the pointer is over it), so that behavior works automatically — no extra wiring needed.

### Example: block controls composed by hand

Block controls (the `+` / drag handle) can't be wired through DI alone — they read hover data produced by an extension registered on the editor instance. Set `[blockControls]` on the chassis and forward its `hoveredBlock()` signal:

```html
<ate-editor-chassis #chassis="ateEditorChassis" [blockControls]="'outside'" [content]="content">
  @if (chassis.editor(); as editor) {
    <ate-block-controls [editor]="editor" [hoveredData]="chassis.hoveredBlock()" />
  }
</ate-editor-chassis>
```

### Custom toolbar visuals

`AteButtonComponent`, `AteSeparatorComponent`, and `AteColorPickerComponent` (the atoms `ate-toolbar` itself is built from) are also exported, so a fully custom toolbar can match the built-in visual style.

### Power users: composing `AteEditorCoreComponent` directly

If `ate-editor-chassis`'s template (chrome projected around a single content area) doesn't fit your layout, drop down to `AteEditorCoreComponent` and declare `ATE_EDITOR_PROVIDERS` yourself on whatever component wraps your custom layout — Angular throws a clear DI error if it's missing on an ancestor of everything below:

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
      activeRef.toggleBold();
    }
  }

  // Access a specific editor by ID
  targetEditor() {
    const editorRef = this.registry.get("my-editor-id");
    editorRef?.insertTable();
  }
}
```

---

## 🔌 Standalone Chrome Components (No DI Required)

Every UI chrome component (`ate-toolbar`, the bubble menus, `ate-slash-commands`, `ate-color-picker`) resolves its editor the same way `AteTableOfContentsComponent` always has: through `AteEditorRegistry`, not through Angular DI. Their `[editor]` input accepts a raw `Editor` instance, an `AteEditorRef`, an editor ID string, or nothing at all (falls back to whichever editor is currently active).

This means chrome doesn't have to be projected inside `ate-editor-chassis` or live under a `providers: ATE_EDITOR_PROVIDERS` ancestor anymore — drop it anywhere in your app:

```typescript
import { Component } from "@angular/core";
import {
  AteEditorChassisComponent,
  AteToolbarComponent,
  ATE_DEFAULT_TOOLBAR_CONFIG,
} from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-detached-toolbar",
  standalone: true,
  imports: [AteEditorChassisComponent, AteToolbarComponent],
  template: `
    <!-- toolbar lives entirely outside the chassis, in its own layout slot -->
    <ate-toolbar [editor]="'main-doc'" [config]="toolbarConfig" />

    <ate-editor-chassis [editorId]="'main-doc'" [content]="content" />
  `,
})
export class DetachedToolbarComponent {
  content = "<p>Hello world</p>";
  toolbarConfig = ATE_DEFAULT_TOOLBAR_CONFIG;
}
```

With no `[editor]` input at all, a chrome component targets whichever editor is currently focused (`AteEditorRegistry.activeEditor()`) — handy for one shared toolbar next to several editors on the same page. The flip side: if another `AngularTiptapEditorComponent`/`ate-editor-chassis` elsewhere on the page steals focus, an editor-less chrome component silently follows it.

This is also what makes it practical to build fully custom chrome for a different editor "flavor": inject `AteEditorRegistry` yourself, or call `injectAteEditorRef()` (exported from the library, the exact resolver every built-in chrome component uses) in your own component's field initializer — no need to replicate `ATE_EDITOR_PROVIDERS` wiring for a bespoke toolbar or bubble menu.

The chassis-projection pattern from the previous section (toolbar projected inside `<ate-editor-chassis>`) still works exactly as before and remains the quickest way to assemble a single editor with its own chrome — this is an additional option, not a replacement.
