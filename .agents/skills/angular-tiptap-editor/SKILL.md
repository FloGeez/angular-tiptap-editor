---
name: angular-tiptap-editor
description: Expert guide and code reference for integrating, configuring, and extending @flogeez/angular-tiptap-editor in Angular 18+ applications. Use when setting up the editor, configuring toolbars/modes, implementing Reactive Forms, adding Angular NodeViews, Table of Contents, custom slash commands, or image upload handlers.
---

# Angular Tiptap Editor Guide (@flogeez/angular-tiptap-editor)

A modern, Signal-powered rich-text editor for Angular (18+), built on top of **Tiptap v3**. Features native `ChangeDetectionStrategy.OnPush`, Notion-style Slash Commands, context-aware Bubble Menus, interactive Angular NodeViews, and built-in i18n (`en`, `fr`, `de`, `pt`, `es` with automatic browser language detection and subtag resolution such as `pt-BR` → `pt`, `es-MX` → `es`, `de-DE` → `de`). The `locale` input / `AteEditorConfig.locale` is per instance and applies to the whole editor (toolbar, bubble menus, slash menu, placeholder, counters) without changing the global locale, so editors with different locales can share a page; without it an editor follows the global locale (`AteI18nService.setLocale()` / browser language). The placeholder is read when the editor is created.

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
npm install @flogeez/angular-tiptap-editor @tiptap/core @tiptap/starter-kit
```

### 2. Include Styles in `angular.json`

Add the library CSS to the `styles` array in `angular.json`:

```json
{
  "styles": ["node_modules/@flogeez/angular-tiptap-editor/styles/index.css"]
}
```

Icons are built in as SVG (Material Symbols Outlined by default, or the custom `/ATE` stroke set via `provideAteIcons(ATE_STROKE_ICONS)`). Only add `node_modules/@fontsource/material-symbols-outlined/index.css` (and install the package) when custom toolbar items, bubble menus or slash commands use Material Symbols names that are not registered: unregistered names fall back to the font. Library icons are keyed by action (`bold`, `heading1`, `bulletList`, `unsetLink`, `addRowBefore`, `deleteTable`… see the `AteIconName` type); override them or add custom SVG icons at root bootstrap (`app.config.ts`) with `provideAteIcons({ bold: '<svg …>…</svg>', rocket: '<svg …>…</svg>' })`, then use `icon: "rocket"` in custom items.

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

The placeholder is reactive: changing the `placeholder` input, `config.placeholder`, the `locale` input / `config.locale` or the global locale (`AteI18nService.setLocale()`) updates the visible placeholder without re-creating the editor. The source order is `placeholder` input, then `config.placeholder`, then the translated default for the resolved locale.

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
  enableBlockShortcuts: true, // Mod+D to duplicate block/list item, Mod+Shift+ArrowUp/Down to move up/down (default: true)
  enableTextAlign: false, // Remove alignment: no TextAlign extension or Mod+Shift+L/E/R/J, pasted text-align dropped, align buttons hidden (default: true)
  paste: { colors: false, highlights: false }, // Drop text colors/highlights pasted from other apps (Google Docs, Word, web, other editors); content copied from an editor keeps them (default: all kept)
};
```

`blockControls` shows a plus button and a drag handle (`⋮⋮`) next to the hovered block. The handle drags the whole top-level block (list, table, quote, ...); when the selection spans several blocks and the handle of one of them is grabbed, all selected blocks move together in order. Drops land only on top-level block boundaries (never inside a list, quote or table cell), with a drop indicator line before or after the target block, and the drag state is cleared on drop, `dragend` or Escape. Style the indicator with the `.ate-block-drop-before` / `.ate-block-drop-after` classes.

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

Pass in `[config]="{ imageUpload: { handler: uploadHandler, maxSize: 5, allowedTypes: ['image/png', 'image/jpeg', 'image/webp'] } }"` or `[imageUploadHandler]="uploadHandler"`.

### Image URL Resolver (`imageSrcResolver`)

Maps the `src` stored in the document to the URL the editor displays, without changing the document. Use it for images behind authentication (fetch with a token, display a `blob:` URL). Pass `[imageSrcResolver]="resolve"` or `imageSrcResolver` in `[config]`; type `AteImageSrcResolver = (src: string) => string | Promise<string> | Observable<string>`.

- Called for every image (initial content, upload, paste, replace) and again when its `src` changes; return `src` unchanged for URLs you do not handle.
- `getHTML()`, `getJSON()`, exports, copy and paste keep the original `src`. "Download Image" and the "Original" size use the resolved URL (the resolver runs again, so cache by `src`).
- Throw, rejection or empty result: the original `src` is displayed. A stale resolution never overwrites a newer `src`. The image has no `src` while resolving.
- The editor never revokes returned `blob:` URLs; the app owns their lifetime.
- Setting or replacing the resolver later re-resolves displayed images (each keeps its current URL until the new one is ready). Pass a stable function: an inline arrow recreated on every change re-resolves every image. Pasting still requires a stored `src` the paste cleanup keeps (`http(s)`, root-relative, same-origin `blob:`, base64).

### Images in Markdown

The built-in `resizableImage` node (exported as `AteResizableImage`) serializes to `![alt](src "title")` for both `tiptap-markdown` (`storage.markdown`) and the official `@tiptap/markdown` (`renderMarkdown` / `parseMarkdown`), so adding either to `tiptapExtensions` handles images without replacing the node. Inert without them. `width` and `height` do not survive a Markdown round trip (plain Markdown has no size); `src`, `alt` and `title` do. `AteResizableImage.extend(...)` in `tiptapExtensions` replaces the built-in node; pass `srcResolver` in `.configure()` to keep `imageSrcResolver`.

### Image Rejection Outputs (`imageRejected` vs `pastedImageRejected`)

- **`(imageRejected)` (`AteImageRejection`)**: Emitted when a **file** (from clipboard paste, drag-and-drop, toolbar/slash-menu/bubble-menu file picker, or `uploadImage` API) is rejected (`reason: 'invalid-type' | 'too-large' | 'upload-failed'`, `file: File`, `source: 'paste' | 'drop' | 'picker' | 'api'`).
- **`(pastedImageRejected)` (`AtePastedImageRejection`)**: Emitted when an **`<img src="...">` inside pasted HTML** (e.g. from Google Docs, Notion, or Word) is dropped because its source is unreachable (`reason: 'unreachable'` for `attachment:`, `file:`, `cid:`, foreign `blob:`) or because a base64 image inside pasted HTML failed validation or upload (`reason: 'invalid-type' | 'too-large' | 'upload-failed'`, `src: string`).

---

## 📋 Paste Settings (`paste`)

`paste?: AtePasteConfig` (input or `[config]`, merged, input wins) applies to HTML pasted or dropped from other apps:

- `colors: false` removes text colors, `highlights: false` removes highlights and background colors (both default `true`). Bold, links, lists and tables are always kept.
- Each paste has a `source`: `'editor'` (copied from an Angular Tiptap Editor, marked on copy; format keys are ignored), `'office'` (Word/Excel, after the `enableOfficePaste` cleanup) or `'external'` (everything else, including other ProseMirror-based editors).
- `transformHTML: (html, { source }) => string` runs last for every source and returns the HTML to insert; if it throws or returns no string, the HTML is inserted unchanged. Prefer it over a custom Tiptap `transformPastedHTML` plugin: it knows the source and runs after the library cleanup.
- Read at paste time: changes apply to the next paste. `enableOfficePaste` stays a separate flag.

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

Task lists are built in: `TaskList` and `TaskItem` (nested) are always registered, the `taskList` slash command is on by default and the `taskList` toolbar button is off by default (`toolbar: { taskList: true }`). Style the checkboxes with `--ate-task-checkbox-size`, `--ate-task-checkbox-color`, `--ate-task-gap` and `--ate-task-checked-text-color`; a `taskList` / `taskItem` passed in `tiptapExtensions` replaces the built-in one. `@tiptap/extension-list` is a peer dependency.

---

## ⚙️ Configuring Bundled `StarterKit` (`starterKitOptions`) & Overriding Extensions

Tune or disable extensions bundled in Tiptap's `StarterKit` (such as `undoRedo`, `heading`, `codeBlock`, `link`, etc.) via `starterKitOptions` (`Partial<StarterKitOptions>` from `@tiptap/starter-kit`). Options are merged per key over ATE's defaults (preserving `openOnClick: false` and `class: "ate-link"` on `link` unless overridden or disabled with `link: false`).

Custom extensions passed in `tiptapExtensions` whose `name` matches a built-in ATE extension or a `StarterKit` extension automatically replace the built-in one (and take precedence over `starterKitOptions.<key>`), logging a one-time `[ATE]` warning in Angular dev mode (`isDevMode()`) detailing which ATE UI features depend on the replaced extension:

```typescript
import Collaboration from "@tiptap/extension-collaboration";

config: AteEditorConfig = {
  // Disable local undo/redo when using Yjs collaboration
  starterKitOptions: {
    undoRedo: false,
    heading: { levels: [1, 2, 3] },
    link: { autolink: false },
  },
  tiptapExtensions: [Collaboration.configure({ document: ydoc })],
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

### Replacing the content from code (`setContent`)

`setContent(content, options?)` exists on the component, `AteEditorRef` and `AteEditorCommandsService`. Options (`AteSetContentOptions`, all default `false` except `emitUpdate`): `emitUpdate` (default `true`), `preserveSelection` (clamped to the new document), `preserveScroll` (restores the scroll position of every scrolled ancestor: the editor area when it has a height, an app container or the page), `resetHistory` (drops undo/redo; no-op when `undoRedo` is disabled). `setContent(html, false)` still means `{ emitUpdate: false }`. Counters always follow the new content.

---

## 💡 Key Architectural Guidelines for AI Agents

1. **Ask User for Config Preference**: ALWAYS ask if the user wants global `provideAteEditor()` settings or a local `[config]` object before generating boilerplate.
2. **Avoid Template Input Pollution**: Use `provideAteEditor()` or `[config]` object instead of listing dozens of individual boolean attributes on `<angular-tiptap-editor>`.
3. **Readonly Mode (`editable: false`)**: Automatically hides the top toolbar and disables editing while preserving link clicking and selection.
4. **Signals & OnPush**: All components use `ChangeDetectionStrategy.OnPush`. NodeViews extending `AteAngularNodeView` expose reactive signals for `attributes`, `node`, `editor`, and `selected`.
