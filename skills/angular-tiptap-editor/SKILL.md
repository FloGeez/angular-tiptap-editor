---
name: angular-tiptap-editor
description: Expert guide and code reference for integrating, configuring, and extending @flogeez/angular-tiptap-editor in Angular 18+ applications. Use when setting up the editor, configuring toolbars/modes, implementing Reactive Forms, adding Angular NodeViews, Table of Contents, custom slash commands, or image upload handlers.
---

# Angular Tiptap Editor Guide (@flogeez/angular-tiptap-editor)

A modern, Signal-powered rich-text editor for Angular (18+), built on top of **Tiptap v3**. Features native `ChangeDetectionStrategy.OnPush`, Notion-style Slash Commands, context-aware Bubble Menus, interactive Angular NodeViews, and built-in i18n.

---

## 🎯 Configuration Best Practices & Architecture Hierarchy

The library follows a strict **4-tier configuration hierarchy** (from highest to lowest precedence):

1. **Direct Component Inputs** (e.g., `[editable]`, `[seamless]`) — _Use ONLY for dynamic runtime overrides on a specific instance._
2. **Component `[config]` Object** — _Recommended for instance-specific configuration._
3. **Global Provider `provideAteEditor(config)`** — ⭐ **RECOMMENDED BEST PRACTICE** for application-wide defaults in `app.config.ts`.
4. **Library Defaults (`ATE_DEFAULT_CONFIG`)** — _Internal fallbacks._

> 🤖 **IMPORTANT AI AGENT INSTRUCTION**:
> When generating or setting up an editor for a user, **ALWAYS ask the user first** if they prefer:
>
> - **Option A (Recommended)**: Global configuration via `provideAteEditor({ ... })` in `app.config.ts` (sets consistent defaults across all editors in the application).
> - **Option B**: Per-instance configuration via `[config]="editorConfig"` on the `<angular-tiptap-editor>` component.
>
> _Avoid polluting templates with individual boolean inputs (e.g. `[editable]`, `[seamless]`, `[showToolbar]`) unless generating dynamic UI toggles._

---

## 📦 Installation & Essential Setup

### 1. Installation

```bash
npm install @flogeez/angular-tiptap-editor @tiptap/core @tiptap/starter-kit @fontsource/material-symbols-outlined
```

### 2. Include Styles in `angular.json`

Add the library CSS to the `styles` array in `angular.json`:

```json
{
  "styles": [
    "node_modules/@fontsource/material-symbols-outlined/index.css",
    "node_modules/@flogeez/angular-tiptap-editor/styles/index.css"
  ]
}
```

### 3. Global Provider Setup in `app.config.ts` (Recommended Best Practice)

Initialize the global provider with application-wide defaults:

```typescript
import { ApplicationConfig } from "@angular/core";
import { provideAteEditor } from "@flogeez/angular-tiptap-editor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideAteEditor({
      theme: "auto",
      mode: "classic",
      placeholder: "Type something...",
      showToolbar: true,
      showFooter: true,
      enableSlashCommands: true,
    }),
  ],
};
```

---

## 🚀 Recommended Usage Patterns

### Option A: Clean Component Template (Using Global Config or `[config]`)

```typescript
import { Component } from "@angular/core";
import { AngularTiptapEditorComponent, AteEditorConfig } from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-editor-demo",
  standalone: true,
  imports: [AngularTiptapEditorComponent],
  template: `
    <!-- Clean template using global provider config or single config object -->
    <angular-tiptap-editor
      [content]="content"
      [config]="editorConfig"
      (contentChange)="onContentChange($event)" />
  `,
})
export class EditorDemoComponent {
  content = "<p>Welcome to <strong>Angular Tiptap Editor</strong>!</p>";

  // Optional instance-specific overrides
  editorConfig: AteEditorConfig = {
    mode: "seamless",
    placeholder: "Start writing...",
    blockControls: "inside",
  };

  onContentChange(html: string) {
    console.log("Updated HTML:", html);
  }
}
```

---

## 📝 Reactive Forms Integration

The editor component natively implements `ControlValueAccessor`, supporting standard `FormControl` and `FormGroup` bindings:

```typescript
import { Component } from "@angular/core";
import { FormControl, ReactiveFormsModule, Validators } from "@angular/forms";
import { AngularTiptapEditorComponent } from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-form-demo",
  standalone: true,
  imports: [AngularTiptapEditorComponent, ReactiveFormsModule],
  template: `
    <angular-tiptap-editor [formControl]="contentControl" />
    <button [disabled]="contentControl.invalid" (click)="save()">Save</button>
  `,
})
export class FormDemoComponent {
  contentControl = new FormControl("<p>Initial form content</p>", [Validators.required]);

  save() {
    console.log("Form Value:", this.contentControl.value);
  }
}
```

---

## 🎨 Display Modes (Classic vs. Seamless Notion-Style)

Set modes cleanly in `provideAteEditor({ mode: ... })` or inside `[config]`:

- **`mode: 'classic'`** (Default): Bordered box layout with fixed top toolbar and footer.
- **`mode: 'seamless'`**: Clean, frameless, borderless design. Relies on Notion-style Slash Commands (`/`), Drag Handles, and contextual Bubble Menus.

```typescript
// Inside provideAteEditor() or editorConfig:
config: AteEditorConfig = {
  mode: "seamless",
  blockControls: "inside",
  enableSlashCommands: true,
};
```

---

## 📋 Table of Contents (`AteTableOfContentsComponent`)

Supports Notion-style hover expansion (collapses into level-proportional vector dashes until hovered or focused).

```typescript
import { Component } from "@angular/core";
import {
  AteTableOfContentsComponent,
  AngularTiptapEditorComponent,
} from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-article-page",
  standalone: true,
  imports: [AngularTiptapEditorComponent, AteTableOfContentsComponent],
  template: `
    <!-- Floating Notion-Style TOC -->
    <ate-table-of-contents
      [floating]="true"
      position="right"
      variant="card"
      [hoverExpand]="true"
      [maxDepth]="4" />

    <angular-tiptap-editor [content]="articleHtml" />
  `,
})
export class ArticlePageComponent {
  articleHtml = "<h1>Title</h1><h2>Section 1</h2><p>Content...</p>";
}
```

---

## 🧩 Custom Angular NodeViews (Embedding Angular Components)

Turn any Angular Component into an interactive Tiptap node view with reactive state sync using `AteAngularNodeView`.

### Step 1: Create the Component

```typescript
import { Component, computed } from "@angular/core";
import { AteAngularNodeView } from "@flogeez/angular-tiptap-editor";

@Component({
  selector: "app-counter-node",
  standalone: true,
  template: `
    <div class="counter-card">
      <span>Count: {{ count() }}</span>
      <button type="button" (click)="increment()">+1</button>
    </div>
  `,
})
export class CounterNodeComponent extends AteAngularNodeView {
  // Access node attributes reactively via Signal
  readonly count = computed<number>(() => (this.attributes()["count"] as number) || 0);

  increment() {
    this.updateAttributes({ count: this.count() + 1 });
  }
}
```

### Step 2: Register in `angularNodes` Config

```typescript
config: AteEditorConfig = {
  angularNodes: [
    {
      component: CounterNodeComponent,
      name: "counterNode",
      attributes: { count: { default: 0 } },
      group: "block",
      draggable: true,
      selectable: true,
    },
  ],
};
```

---

## 🖼️ Custom Image Upload Handler

Process image uploads asynchronously (to S3, Cloudinary, etc.) instead of converting to Base64:

```typescript
import { AteImageUploadHandler } from "@flogeez/angular-tiptap-editor";

export class ImageUploaderComponent {
  uploadHandler: AteImageUploadHandler = async ctx => {
    const formData = new FormData();
    formData.append("file", ctx.file);

    const response = await fetch("/api/images/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    return { src: data.imageUrl };
  };
}
```

Pass in `[config]="{ imageUpload: { handler: uploadHandler } }"` or `[imageUploadHandler]="uploadHandler"`.

---

## ⌨️ Custom Slash Commands (`/`)

```typescript
config: AteEditorConfig = {
  enableSlashCommands: true,
  slashCommands: {
    custom: [
      {
        title: "Insert Banner",
        description: "Add an announcement banner",
        icon: "campaign",
        keywords: ["banner", "notice", "announcement"],
        command: editor => {
          editor.commands.insertContent(
            '<blockquote class="banner"><p>📢 Announcement!</p></blockquote>'
          );
        },
      },
    ],
  },
};
```

---

## 🗂️ Programmatic Control & Global Registry (`AteEditorRegistry`)

Access, control, or switch between multiple editor instances globally:

```typescript
import { Component, inject } from '@angular/core';
import { AteEditorRegistry } from '@flogeez/angular-tiptap-editor';

@Component({ ... })
export class MultiEditorComponent {
  private registry = inject(AteEditorRegistry);

  // Active focused editor instance
  triggerBoldOnActive() {
    const activeRef = this.registry.activeEditor();
    activeRef?.commands.toggleBold();
  }

  // Get specific editor by ID
  getMarkdownFromTarget() {
    const editorRef = this.registry.get('my-editor-id');
    return editorRef?.getContent('markdown');
  }
}
```

---

## 💡 Key Architectural Guidelines for AI Agents

1. **Ask User for Config Preference**: ALWAYS ask if the user wants global `provideAteEditor()` settings or a local `[config]` object before generating boilerplate.
2. **Avoid Template Input Pollution**: Use `provideAteEditor()` or `[config]` object instead of listing dozens of individual boolean attributes on `<angular-tiptap-editor>`.
3. **Readonly Mode (`editable: false`)**: Automatically hides the top toolbar and disables editing while preserving link clicking and selection.
4. **Signals & OnPush**: All components use `ChangeDetectionStrategy.OnPush`. NodeViews extending `AteAngularNodeView` expose reactive signals for `attributes`, `node`, `editor`, and `selected`.
