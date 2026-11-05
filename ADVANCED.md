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

### Replacing the content from code (`setContent`)

`setContent(content, options?)` is available on the component, on `AteEditorRef` and on `AteEditorCommandsService.setContent(editor, content, options?)`. The counters follow the new content even with `emitUpdate: false`.

```typescript
editorRef.setContent(html, {
  emitUpdate: false, // no `update` event / `contentChange` (default: true)
  preserveSelection: true, // keep the selection, clamped to the new document (default: false)
  preserveScroll: true, // restore the scroll position of the editor and of the page (default: false)
  resetHistory: true, // drop the undo/redo history (default: false)
});
```

The boolean form `setContent(html, false)` still works and means `{ emitUpdate: false }`. `resetHistory` re-creates the history plugin of the `undoRedo` extension, so it does nothing when `undoRedo` is disabled (for example with collaboration).

`content` is HTML by default. Pass `contentType: "markdown"` to parse Markdown, or a Tiptap `JSONContent` object:

```typescript
editorRef.setContent(markdown, { contentType: "markdown", resetHistory: true });
editorRef.setContent(json); // JSONContent, e.g. from editor.getJSON()
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

Extensions passed in `tiptapExtensions` take precedence over built-in extensions of the same `name` (both ATE's built-ins such as `highlight`, `textStyle`, `color`, `placeholder`, `superscript`, `subscript`, `taskList`, `taskItem`, `textAlign`, `resizableImage`, `tableExtension`, `ateTableSort`, `tableOfContents`, and extensions bundled in Tiptap's `StarterKit` such as `codeBlock`, `heading`, `link`, `undoRedo`, ...).

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

### Markdown

The editor registers the official `@tiptap/markdown` extension: `setContent(md, { contentType: "markdown" })` imports Markdown, and `getContent("markdown")`, the copy and the download export it with the same serializer (headings, marks, `==highlight==`, links, lists, task lists, code blocks, tables, images, rules). Markdown has no syntax for superscript, subscript, text alignment, text colors, highlight colors, fonts and font sizes: a paragraph or heading that uses one of them is written as HTML (`<p>E = mc<sup>2</sup></p>`), which `@tiptap/markdown` reads back and Markdown renderers such as GitHub display. Other blocks stay plain Markdown. A paragraph or heading passed in `tiptapExtensions` replaces the library one and writes its own Markdown: extend the exported `AteParagraph` / `AteHeading` to keep this behavior.

To configure it, pass your own instance in `tiptapExtensions`; it replaces the built-in one without a warning:

```typescript
import { Markdown } from "@tiptap/markdown";

config = { tiptapExtensions: [Markdown.configure({ indentation: { style: "space", size: 4 } })] };
```

The community `tiptap-markdown` package uses the same extension name, so it replaces `@tiptap/markdown` the same way, and the export then uses its serializer.

#### Images in Markdown

The built-in image node (`resizableImage`, also exported as `AteResizableImage`) serializes to `![alt](src "title")` and reads that syntax back:

```typescript
editorRef.getContent("markdown"); // ![A cat](https://assets.test/cat.png "My cat")
```

- It provides `markdownTokenName`, `parseMarkdown` and `renderMarkdown` for `@tiptap/markdown`, and `storage.markdown` for `tiptap-markdown`.
- A resized or aligned image is written as an HTML `<img>` with its `width`, `height` and alignment, since Markdown images have neither; the others stay `![alt](src "title")`.
- Combine with `imageSrcResolver` for images behind authentication: the Markdown keeps the original `src`.
- To customize the node, extend `AteResizableImage` (`AteResizableImage.extend({...})`) in `tiptapExtensions`: it replaces the built-in one (same `name`), so also pass `srcResolver` in `.configure()` if you use `imageSrcResolver`.

---

## 🔤 Font Family and Font Size

Two opt-in menus, for the toolbar and the text bubble menu:

```typescript
config: AteEditorConfig = {
  toolbar: { fontFamily: true, fontSize: true },
  bubbleMenu: { fontFamily: true, fontSize: true },
};
```

- **Font family**: an "Aa" button drawn in the font of the selection (its tooltip names it). It opens a grid of fonts, each name drawn in its font, starting with **Default**, which removes the font: the text then uses the editor's font, inherited from your app. A font of the selection missing from the list (pasted from Word, for instance) shows as an extra, current choice.
- **Font size**: `− 16 +` at rest, which turns into the neighbouring sizes `15 16 17` on hover. A click on a neighbour makes the selection one pixel larger or smaller, holding repeats, and dragging scrolls through the sizes. A click in the middle opens a row of sizes, **Default** (removes the size), a slider and a field to type any size (Enter applies). `Mod+Shift+.` and `Mod+Shift+,` step the size too, as in Google Docs, when the size menu is enabled.
- With an empty selection, the font or size applies to the text typed next.
- As for colors, a choice applies and keeps the dropdown open: the apply button, Enter, Escape or a click outside close it.

The choices are set with `fonts`:

```typescript
config: AteEditorConfig = {
  fonts: {
    families: [
      { label: "Inter", value: "Inter, sans-serif" }, // label shown, CSS font-family applied
      { label: "Georgia", value: "Georgia, serif" },
    ],
    sizes: ["12px", "14px", "16px", "20px", "28px"], // any CSS length
  },
};
```

Defaults: `ATE_DEFAULT_FONT_FAMILIES` (8 web-safe fonts) and `ATE_DEFAULT_FONT_SIZES` (12 to 64 px). The editor does not load fonts: list the ones your app loads or the user's system has. Fonts and sizes are `textStyle` attributes (`<span style="font-family: …; font-size: …">`), kept when pasting from other apps while the matching menu is shown (see `paste.fontFamilies` and `paste.fontSizes` below).

## 📊 Table Sorting

Every table with a header row shows a menu button in each header cell. The menu sorts the rows below the header by that column, ascending or descending:

- The column type comes from its values: dates (`dd/mm/yyyy` or `yyyy-mm-dd`, with an optional time), numbers (`1,234.5`, `1.234,5`, currency symbols, `%`) or text, compared without case or accents. Numbers with a leading zero or all of the same length (ids, postal codes) are compared as text. The decimal separator comes from the column (`1,5` or `0.500` settle it); when no value settles it, it follows the editor language (`,` for French, German, Portuguese and Spanish, `.` for English), so `1.500` is 1500 in Portuguese and 1.5 in English. Values grouped by thousands with the other separator are read as thousands only when one of them has two groups or more (`1.234.567`).
- Empty cells go last in both directions, and rows with equal values keep their order.
- The header row never moves. A table with a cell spanning several rows is not sorted (the menu options are disabled).
- Sorting replaces only the rows that move, in one step: a single undo (`Mod+Z`) restores the previous order.
- The sorted column shows ▲ or ▼ and `aria-sort` while the rows keep that order: edit a cell out of order and the arrow goes away.
- The button is in the Tab order: Enter opens the menu, Escape closes it and gives the focus back to the button.
- In a read-only editor the button is disabled, with a tooltip saying why.

Sorting changes the document (the new order is in `getHTML()` and the exports). From code:

```typescript
editor.commands.sortTableColumn(1, "desc"); // second column of the table holding the selection
editor.commands.sortTableColumn(0, "asc", tablePos); // first column of the table at `tablePos`
```

The command returns `false` in a read-only editor, for a table without a header row or body rows, and for a table with a cell spanning rows. Restyle the button with `.ate-table-column-button` and the arrow with `.ate-table-column-sort`.

## 🔎 Table Filtering

The column menu also filters the rows below the header by that column. The filter shown depends on the values of the column:

- Dates: a range from one day to another, both days included (the last day counts until its end, so `02/02/2024 18:30` is in a range ending on `2024-02-02`).
- Numbers: a minimum and a maximum, both included. Numbers are read as for sorting, with the decimal separator of the column (or of the editor language when the column does not settle it); the bounds you type are read, and the placeholders shown, with that same separator.
- Text with at most 20 different values: a checkbox per value with its number of rows, `(empty)` for empty cells and `All`.
- Other text: the rows containing what is typed, without case or accents.

Filters apply as they are typed or ticked, and filters of different columns combine (a row shows when it passes all of them). While a filter is set, a bar above the table says how many rows are shown ("Showing 3 of 10 rows", or a message when none is left) with a button that clears the filters of that table; the menu button of a filtered column is highlighted and "Clear column" removes its filter.

A filter only hides rows on screen (a decoration with `display: none` and `data-ate-table-hidden`): it is not part of the document, so `getHTML()`, the Markdown and JSON exports, the undo history and collaboration are the same with or without it, and it is lost when the content is replaced. The row holding the cursor stays visible while it is edited, even if it no longer passes the filter. When a filter hides the row holding the cursor, the cursor moves to the header cell of that column, so typing never lands in a hidden row. Adding a column, or merging cells across rows, removes the filters of that table.

While rows are hidden, editing reaches the visible rows only:

- Copy and cut take the visible rows; a selection that crosses no hidden row is copied as it is. Cut empties the visible cells and removes no row.
- Typing (including mobile keyboards, input methods and autocorrect), paste, Delete and Backspace over a selection that spans hidden rows change the visible cells only. A table pasted at the cursor fills the visible rows and adds rows for what is left right after the last filled row; those rows stay visible until the filters change. A pasted table wider than the cells right of the cursor is pasted as usual: the table grows, which removes its filters; when its rows would also land on hidden rows, the filters of that table are cleared first so the whole table is pasted.
- Formatting over a selection that spans hidden rows (marks, alignment, block types, cell attributes, from the toolbar, menus, shortcuts or commands) applies to the visible rows only, Enter over such a selection goes to the end of its visible part, and content inserted over it replaces its visible part, as typing does; the hidden rows stay unchanged and one undo reverts it. These visible-only changes are applied right after the command returns, not synchronously, so read the editor state after a microtask. Header toggles over such a selection are refused.
- ArrowUp, ArrowDown (with or without Shift), Tab and Shift-Tab jump over hidden rows; Tab in the last visible cell adds a row after it. ArrowDown from the last visible row of a table that ends the document keeps the cursor in place.
- While the selection covers hidden rows, deleting rows, merging or splitting cells and dragging the selection are blocked. While a table has hidden rows, deleting a column or the table, turning its header row into body cells and turning a column into header cells are blocked wherever the cursor is. The table and cell bubble menu buttons are disabled to match. Dragging a whole table with the block handle keeps all its rows.

From code:

```typescript
editor.commands.setTableColumnFilter(1, { kind: "values", values: ["Paris", ""] }, tablePos);
editor.commands.setTableColumnFilter(2, { kind: "number", min: 10, max: null }, tablePos);
editor.commands.setTableColumnFilter(
  3,
  { kind: "date", from: "2024-01-01", to: "2024-01-31" },
  tablePos
);
editor.commands.setTableColumnFilter(0, { kind: "text", query: "cafe" }, tablePos);
editor.commands.setTableColumnFilter(0, null, tablePos); // removes the filter of the first column
editor.commands.clearTableFilters(tablePos);
editor.commands.revealTableRow(pos); // removes the filters hiding the row at `pos`
```

`tablePos` defaults to the table holding the selection. `setTableColumnFilter` returns `false` for a table without a header row or body rows, for a table with a cell spanning rows and for a malformed filter (with a warning in development). Before scrolling to or selecting content inside a row a filter may hide, call `revealTableRow(pos)`. In an editable editor a selection set inside a hidden row shows that row while the selection stays there; in a read-only editor, a selection set from code with `scrollIntoView()` inside a hidden row removes the filters of that table. Restyle the status bar with `.ate-table-filter-status` and `.ate-table-filter-clear`, and the highlighted button with `.ate-table-column-button.is-filtered`.

## 📋 Paste Handling (`paste`)

`paste` (input, or `paste` in `[config]`) decides what is kept from HTML pasted or dropped from other apps:

```html
<angular-tiptap-editor [paste]="{ colors: false, highlights: false }" />
```

| Key             | Default            | Effect when `false`                                                     |
| --------------- | ------------------ | ----------------------------------------------------------------------- |
| `colors`        | `true`             | Removes text colors (`color`, `<font color>`)                           |
| `highlights`    | `true`             | Removes highlights and background colors (`<mark>`, `background-color`) |
| `fontFamilies`  | font family menu\* | Removes fonts (`font-family`, `<font face>`)                            |
| `fontSizes`     | font size menu\*   | Removes font sizes (`font-size`)                                        |
| `transformHTML` | none               | Your own last step (see below)                                          |
| `markdown`      | `true`             | Pastes Markdown text as plain text, line by line (see below)            |

\* `true` when the matching menu is shown (`toolbar.fontFamily` or `bubbleMenu.fontFamily`, `toolbar.fontSize` or `bubbleMenu.fontSize`), `false` otherwise: without a menu, a font pasted from Word could be neither seen nor removed. Set the key to keep or drop them either way.

The editor detects where the HTML comes from:

| Copied from                                                       | `source`   | Format keys                                             |
| ----------------------------------------------------------------- | ---------- | ------------------------------------------------------- |
| An Angular Tiptap Editor (this one or another one, in any app)    | `editor`   | Ignored: what the user formatted is kept                |
| Microsoft Word or Excel                                           | `office`   | Applied, after the Office cleanup (`enableOfficePaste`) |
| Anything else (Google Docs, web pages, Confluence, other editors) | `external` | Applied                                                 |

Plain-text paste (`Ctrl+Shift+V` / `Cmd+Shift+V`) is not affected.

### Pasting Markdown

Plain text that contains Markdown syntax (headings, lists, task lists, quotes, code fences, tables, rules, bold, strikethrough, highlights, inline code, links, images) is parsed with `@tiptap/markdown`. That covers text copied from a `.md` file, a terminal or a chat, and from VS Code, whose colored HTML is set aside for its text. Text without any of this syntax is pasted line by line as before, and so are a paste as plain text and a paste into a code block. HTML on the clipboard (web pages, Google Docs, Word) keeps going through the HTML path above. `markdown: false` turns the parsing off.

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
