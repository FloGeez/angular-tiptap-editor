# Changelog

All notable changes to `@flogeez/angular-tiptap-editor` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html), with the exception that the major version is specifically aligned with the major version of [Tiptap](https://tiptap.dev).

## [Unreleased]

### Added

- **Multi-Block Drag**: When the selection spans several blocks and the handle of one of them is dragged, all the selected blocks now move together and keep their order (previously only the grabbed block moved and the selection collapsed to it).
- **Block Drop Indicator**: Dragging a block shows a line (`.ate-block-drop-before` / `.ate-block-drop-after`) at the top-level block boundary where it will land, and the native drop cursor is hidden during the drag.

### Fixed

- **Keys Typed Right After a Slash Command**: Picking a slash command removed the `/` text, then ran the command 10 ms later, so keys typed in between (fast typing, automation, a slow machine) went to the paragraph the `/` was typed in instead of the inserted block (e.g. the first cell of a new table). The command now runs right away. (#90)
- **"Change Image" on WebKit**: Replacing an image from the image bubble menu failed on WebKit (Safari): the upload succeeded but the old image stayed, with `TypeError: null is not an object (evaluating 'node.nodeSize')` in the console. Opening the file picker moved the selection off the image, and the result was applied to the selection as it was after the upload. The image to replace is now the one selected when "Change Image" is clicked, followed through document changes during the upload; if it was removed in the meantime, the new image is inserted at the cursor. Inserting an image no longer throws when the position after it holds no node. (#87)
- **Block Dropped Inside Another Block**: The drag handle used to drop a block wherever the pointer was, so it could end up inside a list item, blockquote or table cell. Drops now always resolve to the nearest top-level boundary, chosen by the upper or lower half of the hovered top-level block.
- **Leftover Drag State**: A drag started from the handle that ended without a drop on the editor (Escape, drop outside the editor) left the editor in a "dragging" state, so the next external drop (text from another window, for example) was handled as a move of the stale block instead of inserting the dropped content. The state is now cleared on `dragend`, drop and when a foreign drag enters the editor.

## [3.8.0] - 2026-10-27

### Security

- **CSS Injection Through Color Values**: A text color or highlight color carrying extra CSS declarations (e.g. `red; position: fixed; inset: 0`) reached the inline `style` of the rendered marks, from HTML or JSON content, pasted HTML, or `setColor` / `setHighlight` called with untrusted values, and was re-emitted by `getHTML()`. Tiptap fixed it in 3.31.4 by rejecting style values containing `;`, `{` or `}`, and the library now requires that version (see below). Regression tests cover HTML, JSON and command inputs. (#85)

### Changed

- **Tiptap 3.31.4 or Later Required**: Every `@tiptap/*` peer dependency now requires `^3.31.4` (previously `^3.0.0`), so apps cannot install the library with a Tiptap version vulnerable to the CSS injection above. Apps that pin an older Tiptap 3 must update it: npm 7+ refuses the install until then, pnpm and yarn warn. It stays within Tiptap 3, so no other change is needed. (#85)

## [3.7.0] - 2026-10-26

### Added

- **`imageSrcResolver` Input**: New input (also available as `imageSrcResolver` in `AteEditorConfig`) typed `AteImageSrcResolver` (`(src: string) => string | Promise<string> | Observable<string>`) that maps the `src` stored in the document to the URL the editor displays, for images a plain `<img src>` cannot load (e.g. behind an `Authorization` header: fetch the image and resolve to a `blob:` URL). The document, `getHTML()`, `getJSON()`, exports, copy and paste keep the original `src`. It is applied to initial content, uploaded, pasted and replaced images and re-applied when a `src` changes; an older resolution never overwrites a newer `src`, and the original `src` is displayed when the resolver throws, rejects or returns an empty value. "Download Image" and the "Original" size use the resolved URL. Setting or replacing the resolver after the editor is created re-resolves the images already displayed, each keeping its current URL until the new one is ready. The editor never revokes the URLs the resolver returns. (#82)
- **`paste` Input**: New input (also available as `paste` in `AteEditorConfig`, typed `AtePasteConfig`) that controls what is kept from HTML pasted or dropped from other apps. `colors: false` removes text colors and `highlights: false` removes highlights and background colors, so hard-coded black text or white backgrounds from Google Docs, Word or web pages stay readable in dark themes; both default to `true`, so nothing changes unless you opt in. Each paste gets a source: `editor` (copied from an Angular Tiptap Editor, marked on copy, which always keeps its formatting), `office` (Word/Excel) or `external` (everything else, including other ProseMirror-based editors such as Confluence). `transformHTML(html, { source })` runs last, after the Office cleanup and the format keys, and returns the HTML to insert. Settings are read at paste time. New public types: `AtePasteConfig`, `AtePasteContext`, `AtePasteSource`. (#80)

### Fixed

- **Placeholder Not Following Runtime Changes**: The placeholder was only read when the Tiptap editor was created, so changing the `placeholder` input, `config.placeholder`, the `locale` input / `config.locale` or the global locale (`AteI18nService.setLocale()`) left the old text visible until the editor was re-created. The placeholder now updates immediately without re-creating the editor (the document and undo history are untouched), and the source order (`placeholder` input, then `config.placeholder`, then the translated default) is unchanged. (#78)
- **Per-instance `locale` Now Applies to the Whole Editor**: The `locale` input (and `AteEditorConfig.locale`) only reached the placeholder, the counters and part of the slash menu, while the toolbar, bubble menus (text, color, link, image, table, cell), block controls and image upload messages kept following the global locale. Every part of an editor instance now uses that instance's translations, so editors with different locales can share a page and `AteI18nService.setLocale()` is no longer needed as a workaround. Editors without `locale` keep following the global locale. (#76)

## [3.6.1] - 2026-10-26

### Changed

- **Tooltips Stay Warm Across Controls**: Once a tooltip is open, moving the pointer to another control shows its tooltip at once, without the show delay or fade-in, and the previous one disappears immediately so only one tooltip is visible at a time. The warm state lasts 300 ms after the last tooltip closes, so a short gap between two buttons keeps it. The first tooltip still waits for its `ateTooltipDelay`; keyboard and touch behavior are unchanged.

## [3.6.0] - 2026-10-26

### Added

- **`starterKitOptions` Input**: New input (also available as `starterKitOptions` in `AteEditorConfig`) typed `Partial<StarterKitOptions>`, forwarded to `StarterKit.configure()` and merged over the library defaults (the default `link` options are kept). It lets apps disable or tune bundled extensions, e.g. `{ undoRedo: false }` to use `@tiptap/extension-collaboration` (Yjs) without the local history conflicting with Yjs' undo manager. Changing it at runtime re-creates the editor. (#61)
- **`imageRejected` Output**: Emits an `AteImageRejection` (`{ reason: 'invalid-type' | 'too-large' | 'upload-failed', file, source: 'paste' | 'drop' | 'picker' | 'api' }`) when an image file is not inserted, so apps can tell the user why. Covers clipboard files, drag-and-drop, the toolbar, slash-menu and bubble-menu pickers, and `uploadImage`. (#64)
- **`AteImageValidationError`**: Typed error (`reason: 'invalid-type' | 'too-large'`, translated `message`) thrown by the upload pipeline when `allowedTypes` or `maxSize` validation fails. (#64)
- **Brazilian Portuguese and Spanish Translations**: Built-in `pt` (Brazilian wording) and `es` locales covering every `AteTranslations` key, including slash command titles, descriptions and search keywords (English keywords are kept, so typing English still finds the command). (#68)
- **Block Keyboard Shortcuts**: `Mod+D` duplicates the current block right after it, and `Mod+Shift+ArrowUp` / `Mod+Shift+ArrowDown` move it up or down by one sibling, keeping the selection inside the moved block. Inside a list the block is the list or task item and it moves within its list. At the edges and in read-only editors the key event is not consumed. Enabled by default and controlled by the new `enableBlockShortcuts` input / config option. (#66)

### Changed

- **Browser Language Detection**: Detection now matches any built-in or registered locale from `navigator.language`, so `pt-BR`, `es-MX` and `de-DE` pick `pt`, `es` and `de` automatically (previously only `fr` was auto-detected and all other browsers fell back to `en`). A regional tag such as `pt-BR` passed to `locale` or `setLocale()` resolves to its language translations. (#68)
- **Custom Extensions in `tiptapExtensions` Override Built-ins**: An extension passed in `tiptapExtensions` whose `name` matches a built-in ATE extension (`highlight`, `textStyle`, `textAlign`, `placeholder`, `resizableImage`, ...) or a `StarterKit` extension (`link`, `codeBlock`, `heading`, ...) now replaces the built-in extension instead of being silently dropped or duplicating the `StarterKit` extension. If the same `StarterKit` extension is also configured in `starterKitOptions`, the custom extension in `tiptapExtensions` takes precedence. In Angular development mode (`isDevMode()`), a one-time `[ATE]` `console.warn` per editor instance lists the replaced extensions, the ATE UI features and state calculators that depend on them, and any ignored `starterKitOptions` keys. (#70)

### Fixed

- **Silent Image Validation Failures**: A file rejected for its type or size used to disappear with only a `console.error`, and file paste and drop turned the failure into an unhandled promise rejection. Failures are now reported through `imageRejected`, and paste, drop and the fire-and-forget commands (`execute('insertImage' | 'uploadImage')`, `AteEditorRef.insertImage` / `uploadImage`) no longer leak unhandled rejections. Awaited `uploadImage()` calls still reject. (#64)
- **`pastedImageRejected` Reasons**: A base64 image in pasted HTML rejected by validation now reports `invalid-type` or `too-large` instead of `upload-failed`, which stays reserved for upload handler failures. (#64)

## [3.5.5] - 2026-10-26

### Fixed

- **Color Picker Anchor in Seamless Mode**: The text color and highlight pickers opened from the bubble menu are now anchored to the selected text even when `seamless` is enabled. The colored-element lookup is now bounded to the elements inside the editor content. (#72)
- **Editor Re-created on Unrelated `config` Changes**: Any change to the `[config]` input (for example switching `theme` between `dark` and `light`) destroyed and re-created the Tiptap editor, losing the caret, selection, undo history and node views. The effective extensions, Tiptap options and Angular nodes are now compared by value, so a new array or object with the same content no longer re-initializes the editor. Changing the actual extension list, Tiptap options, Angular nodes or `blockControls` still does. (#62)

## [3.5.4] - 2026-10-21

### Added

- **`Mod+K` Link Shortcut**: `Cmd+K` / `Ctrl+K` opens the link editor when text is selected or the cursor is on a link (when the selection allows links). With an empty selection outside a link the event is not consumed, so host-level `Mod+K` shortcuts (search, command palettes) keep working. (#58)

### Fixed

- **Link URL Field Focus**: Opening the link editor (bubble menu button, toolbar or `Mod+K`) now moves focus to the URL field, so the URL can be typed or pasted right away instead of clicking the input first. (#58)

## [3.5.3] - 2026-10-21

### Added

- **`pastedImageRejected` Output**: Emits an `AtePastedImageRejection` (`unreachable` | `upload-failed`) for each image from pasted HTML that could not be kept, so apps can tell the user. (#56)

### Fixed

- **Base64 Images in Pasted HTML Bypassing `imageUploadHandler`**: Images embedded as `data:` URIs in pasted HTML (Google Docs, Office, web pages) are now validated, compressed and sent to `imageUploadHandler`, then swapped for the hosted URL, like clipboard files already were. Without a handler they stay base64, as before. (#56)
- **Broken Images from Pasted HTML**: Images whose source the page cannot load (Notion `attachment:`, `file:`, `cid:`, foreign `blob:`) are dropped from the pasted content instead of being inserted as broken images. (#56)

## [3.5.2] - 2026-10-21

### Added

- **List Marker Color Token**: New `--ate-list-marker-color` CSS variable applied to `.ProseMirror li::marker` (defaults to `--ate-text-color`, so the current look is unchanged) to theme bullet and number colors without `::ng-deep` overrides (#54).

### Fixed

- **Nested Ordered List Styles**: Extended the 3.4.7 list normalization so nested `ol` levels render `lower-alpha` then `lower-roman` instead of repeating `decimal` under host CSS resets, mirroring the existing `disc → circle → square` for `ul` (#54).
- **Task List Bullets**: `ul[data-type="taskList"]` (Tiptap `TaskList`) no longer inherits the normalized `disc`/`circle`/`square` bullets next to its checkboxes (#54).

## [3.5.1] - 2026-10-21

### Fixed

- **Click Below the Fold Jumping to Document End**: Removed `height: 100%` from `.ProseMirror` (kept `min-height: 100%`) so the editable area grows with its content. Previously, in a scrollable editor (`fillContainer`, `height` or `maxHeight`), clicking a gap between blocks below the first screen of content (table margin, space between paragraphs) hit-tested to `.ate-content`, and `onEditorClick` moved the caret to the end of the document and scrolled there (#52).

## [3.5.0] - 2026-10-20

### Added

- **SVG Icons**: The library now ships its icons as inline SVG (Material Symbols Outlined, weight 400, optical size 24, Apache 2.0), about 4 KB gzipped instead of the ~300 KB icon font, as well as the custom `/ATE` stroke icon set (`ATE_STROKE_ICONS`, 24px grid, 2px stroke, round caps).
- **Semantic Icon Names**: Library icons are keyed by what they do (`bold`, `bulletList`, `unsetLink`, `addRowBefore`, `deleteTable`…), typed as `AteIconName`, so each action can get its own icon independently of the drawing set.
- **Icon Registry**: `AteIconRegistry` service and `provideAteIcons()` provider to override default icons or register custom SVG icons for toolbar items, bubble menus and slash commands (`icon` fields now autocomplete library icon names).
- **`<ate-icon>` Component**: Public component rendering a registered icon, sized with `1em` and colored with `currentColor`.

### Changed

- **Icon Styling Selector**: Built-in icons are now rendered as `<ate-icon class="ate-icon">` with an inline SVG. Custom CSS targeting `.material-symbols-outlined` inside the editor should target `.ate-icon` instead.
- **Material Symbols Font Now Optional**: Icons not found in the registry fall back to the Material Symbols font ligature, so existing custom icon names keep working as long as the font is loaded. The `@fontsource/material-symbols-outlined` peer dependency is now optional.
- **Third-Party Licenses**: The package now ships a `THIRD_PARTY_LICENSES` file with the Apache 2.0 license of the bundled Material Symbols icons.

## [3.4.7] - 2026-08-05

### Fixed

- **CSS Reset Isolation & Normalization**: Added scoped CSS normalization inside `.ProseMirror` for `ul`, `ol`, `h4-h6`, and `hr` elements to protect document styling (bullet points, decimal numbering, nested list styles, heading hierarchy) against aggressive host application CSS resets (e.g. Tailwind Preflight, Bootstrap, enterprise CSS resets).
- **Material Symbols Font Protection**: Reinforced `.material-symbols-outlined` with `!important` declarations on `font-family`, `text-transform`, and `font-feature-settings` to prevent host application CSS resets (e.g. `* { font-family: Arial !important; }`) from overriding icon fonts into plain text.

## [3.4.6] - 2026-08-04

### Fixed

- **Readonly Toolbar Hiding (`editable="false"`)**: Fixed toolbar visibility so that setting `editable="false"` (or `[editable]="false"`) correctly hides the top toolbar in all display modes.
- **Boolean Input Coercion**: Applied Angular `booleanAttribute` transform to boolean inputs (`editable`, `disabled`, `showToolbar`, `showTitle`, `floating`, etc.) across `AngularTiptapEditorComponent`, `AteTableOfContentsComponent`, and `AteButtonComponent` so HTML string attributes are correctly parsed as booleans.
- **Mode Input**: Declared missing `mode` signal input (`'classic'` | `'seamless'`) on `AngularTiptapEditorComponent`.

## [3.4.5] - 2026-08-04

### Fixed

- **Styles Export Path**: Exported styles to both `styles/` and `src/lib/styles/` in `ng-package.json` to fix README path alignment while maintaining backward compatibility.
- **Package Manifest**: Added `"style"` field and updated `"sideEffects"` in `package.json` for CSS compatibility.

## [3.4.4] - 2026-08-03

### Added

- **TOC `positionMode` Input**: Added `positionMode` (`'fixed'` | `'absolute'`) to `AteTableOfContentsComponent` for container-relative positioning.

## [3.4.3] - 2026-07-31

### Added

- **Slash Commands Inline Suggestion Decoration**: Added native ProseMirror inline suggestion decoration badge (`.ate-slash-decoration`)

## [3.4.2] - 2026-07-31

### Added

- **`maxDepth` Heading Filtering (`AteTableOfContentsComponent`)**: Added `maxDepth` input (1 to 6, default: `6`) to filter extracted headings up to a specific level (e.g. H1 to H4). Supported across `AteTableOfContentsComponent`, `AteTocNodeComponent`, and `AteEditorConfig`.

### Refactored

- **TOC Models & Configuration Architecture**: Extracted `AteTocConfig`, `AteTocItem`, and `AteTocVariant` into `lib/models/ate-toc.model.ts` and `ATE_DEFAULT_TOC_CONFIG` into `lib/config/ate-toc.config.ts`.
- **Cleaned Public Exports**: Cleaned up duplicate re-exports in `public-api.ts` to export all TOC types and configurations directly from the unified models and config modules.

## [3.4.1] - 2026-07-31

### Added

- **Table of Contents Slash Command & NodeView (`AteTocNodeExtension`)**: Integrated inline Table of Contents insertion via Slash Commands (`/tableOfContents` / `/toc`).
  - Rendered inline inside ProseMirror using an Angular NodeView (`AteTocNodeComponent`).
  - Full i18n search keyword support for English, French, and German.
  - Exported `AteTocNodeComponent`, `AteTocNodeOptions`, and `getAteTocNodeExtension` for easy customization.
- **`AteAngularNodeView.attributes` Helper Signal**: Added a reactive `public attributes: Signal<Record<string, unknown>>` signal on `AteAngularNodeView` for clean, direct access to node attributes in custom Angular NodeView components (`this.attributes()['key']`).

### Fixed

- **Angular 18 NodeView Renderer Input Syncing**: Fixed an Angular `NG0303` runtime error in `AteNodeViewRenderer` when syncing dynamic Tiptap node attributes by checking declared component inputs metadata (`ɵcmp.inputs`) before invoking `setInput()`.
- **Inline TOC Scroll Highlight Guard**: Disabled active heading scroll tracking in `AteTableOfContentsComponent` when rendered inline (`floating: false`), keeping inline TOC summaries static within the document flow.
- **Opt-in Slash Command Defaults**: Configured `tableOfContents: false` by default in `ATE_DEFAULT_SLASH_COMMANDS_CONFIG` to maintain a lightweight default slash menu while enabling easy opt-in activation.

## [3.4.0] - 2026-07-30

### Added

- **Table of Contents Component (`AteTableOfContentsComponent`)**: Introduced a Notion-style, responsive Table of Contents component (`ate-table-of-contents`).
  - **Collapsible Notion Mode**: Dynamically collapses heading items into level-proportional SVG dashes (H1–H6) and expands smoothly on hover or keyboard focus.
  - **Directional Hitbox**: Outer container (`.ate-toc-wrapper`) with directional hitbox padding (`16px`/`8px`) ensuring effortless hover activation without visual shift.
  - **Layouts & Variants**: Supports floating (`left`/`right` fixed positioning) and inline modes, alongside `card`, `minimal`, and `transparent` visual variants.
  - **Tiptap & Scroll Integration**: Auto-extracts document headings, scroll-syncs active heading detection, and smoothly navigates to selected sections on click.

### Fixed

- **SSR Compatibility**: Added `typeof window !== 'undefined'` safety guard when evaluating window height in `checkActiveHeading()` for seamless Server-Side Rendering support.

## [3.3.0] - 2026-07-27

### Added

- **German Support**: Added full German language (`de`) translation and support.
- **Dynamic Plurals**: Switched character and word counters to use dynamic translations for plurals instead of static `"s"`.
- **Globe Dropdown Switcher**: Replaced the binary language toggle with a beautiful, custom-designed dropdown globe selector.

### Refactored

- **I18n Restructuring**: Extracted translation JSON objects into standalone files for better maintainability and modularity.

## [3.2.2] - 2026-07-27

### Fixed

- **Image Resizing**: Fixed a bug where resizing a replaced or uploaded image would revert it to the old image source.

## [3.2.1] - 2026-06-18

### Added

- **Image Upload Hook**: Introduced `imageUploaded` output (emits `AteImageUploadResult` when an image is successfully uploaded and inserted).

## [3.2.0] - 2026-06-09

### Added

- **Global Editor Registry**: Introduced `AteEditorRegistry` and `AteEditorRef` to control and track editor instances anywhere in the application via standard Dependency Injection. Exposes direct facade commands (formatting, tables, exports) without raw Tiptap manipulation.

## [3.1.5] - 2026-06-09

### Added

- **Content Export**: Introduced `AteExportService` for robust editor content extraction. Supports HTML to Markdown and Plain Text conversions, as well as direct exports to clipboard and file downloads. Exposed via `AteEditorCommandsService`.

## [3.1.4] - 2026-05-20

### Fixed

- **Angular 18 Compatibility**: Reverted library APIs from Angular 19+ back to Angular 18 standards:
  - Replaced `provideEnvironmentInitializer()` with `APP_INITIALIZER` in `provideAteEditor()` to prevent crashes on Angular 18 environments.
  - Added `{ allowSignalWrites: true }` to all `effect()` blocks to fix signal write errors at runtime.
  - Fixed TypeScript compiler and builder errors under TypeScript 5.4.

## [3.1.3] - 2026-04-27

### Added

- **Selection Customization**: Introduced `--ate-selection-bg` CSS variable to customize the editor's text selection color.
- **Refined Selection**: Standardized the selection background to use `--ate-primary-light-alpha` by default, providing a subtle blue tint that respects the current primary color without obscuring the text.

## [3.1.2] - 2026-04-24

### Fixed

- **Image Upload Handler**: `imageUploadHandler` is now invoked for pasted image files, matching toolbar and drag-and-drop upload behavior.
- **Image Insertion**: Resolved a regression where images failed to insert when the cursor was positioned within existing text.

## [3.1.1] - 2026-02-13

### Fixed

- **Image Resizing**: Resolved a bug where multiple selected images were resized simultaneously. The update now precisely targets the intended node.

## [3.1.0] - 2026-02-13

### Added

- **Block Controls (Plus + Drag)**: Introduced new Notion-like block controls accessible via the `blockControls` property in `AteEditorConfig`.
  - **Modes**: Supports `inside` (fixed space reserved inside the editor) and `outside` (floating outside the editor for a full-width look).
  - **Customization**: Introduced `--ate-content-gutter` CSS variable (defaults to `54px` in `inside` mode) to allow precise control over the reserved width.
  - **Drag Handle**: A 6-dots handle for native ProseMirror drag-and-drop block reordering.
  - **Quick Add**: A plus button that instantly triggers the slash commands menu at the current block position.

### Changed

- **Padding Logic**: Refactored `--ate-content-padding` into `--ate-content-padding-block` (vertical) and `--ate-content-padding-inline` (horizontal). This avoids calculation errors when using multi-value shorthands and allows more granular theme customization.

## [3.0.3] - 2026-02-09

### Added

- **Multi-line Tooltips**: Added `AteTooltipDirective`, a directive leveraging signals and `tippy.js` for lightweight, high-performance tooltips.
- **Platform-aware Shortcuts**: Automatic detection of macOS to replace 'Ctrl' with the native '⌘' symbol in tooltips for a premium OS-native experience.
- **Tooltip Design Tokens**: New CSS variables `--ate-tooltip-bg` and `--ate-tooltip-color` synchronized with code-block colors for a consistent high-contrast floating UI.

## [3.0.2] - 2026-02-09

### Added

- **Image Alignment**: Introduced support for block-level image alignment (left, center, right) accessible directly from the image bubble menu.
- **Alignment Configuration**: New `alignLeft`, `alignCenter`, and `alignRight` options in `AteImageBubbleMenuConfig` to control the availability of alignment buttons.
- **Image Resize Handles**: Reduced the number of resize handles to 2 (sides only) and changed visibility to appear on hover (even if not selected), providing a minimalist and modern UI. Restricted to editable mode.
- **Image Download**: Added a new download button to the image bubble menu, allowing users to save images directly from the editor. Supports both editable and read-only modes.
- **UI Refinement**: Optimized the visual density of the toolbar and bubble menus by reducing gaps (from 4px/6px to 2px) and paddings (from 6px to 4px) for a sharper, more modern appearance.

### Changed

- **Configuration Centralization**: Optimized the internal configuration system by synchronizing all bubble menus (`Image`, `Table`, `Cell`, `Text`) with a single source of truth in `ate-editor.config.ts`.
- **Image Upload Defaults**: Centralized default image upload settings (maximum size, dimensions, and quality) into `ATE_DEFAULT_IMAGE_UPLOAD_CONFIG` for better global management.
- **Improved Design Tokens**: Introduced `--ate-primary-hover` for consistent interaction states across links and interactive UI elements. Introduced also `--ate-menu-gap` and `--ate-toolbar-gap` that now drive the visual density of the entire editor.

## [3.0.1] - 2026-02-06

### Fixed

- **Link & Underline extensions**: Native `Link` and `Underline` extensions are now utilized directly from `StarterKit` instead of being loaded as separate extensions.

## [3.0.0] - 2026-02-05

### Changed

- **Upgrade to Tiptap v3**: Full migration from Tiptap v2 to v3, aligning with the latest stable ecosystem.
- **Consolidated Dependencies**: Transitioned to the unified `@tiptap/extensions` package instead of individual packages, simplifying dependency management and improving performance.
- **Refined Configuration Hierarchy**: Implemented a more intuitive configuration cascade: **Component Inputs > [config] Object > Global Configuration > Defaults**. Direct inputs now have absolute priority for better DX.
- **Flexible Height Types**: `height`, `minHeight`, and `maxHeight` inputs now accept both `number` (pixels) and `string` (CSS values like '80vh') interchangeably.

### Breaking Changes

- **Peer Dependencies**: The library now requires `@tiptap/core`, `@tiptap/pm`, and associated extensions to be at version `^3.0.0`.
- **Input Defaults**: All optional component inputs (except `content`) now default to `undefined` to allow proper inheritance from global or instance-level configurations.
- **Removal of Deprecated Aliases**: Definitive removal of legacy exported names (without the `Ate` prefix) that were deprecated in v2.2.0.
- **Office Paste**: Updated `@intevation/tiptap-extension-office-paste` to `^0.1.2` for Tiptap v3 compatibility.

## [2.4.1] - 2026-05-19

### Fixed

- **Angular 18 Compatibility**: Reverted library APIs from Angular 19+ back to Angular 18 standards:
  - Replaced `provideEnvironmentInitializer()` with `APP_INITIALIZER` in `provideAteEditor()` to prevent crashes on Angular 18 environments.
  - Added `{ allowSignalWrites: true }` to all `effect()` blocks to fix signal write errors at runtime.
  - Fixed TypeScript compiler and builder errors under TypeScript 5.4.

## [2.4.0] - 2026-01-29

### Added

- **Seamless Angular Integration**: Drastically simplified editor setup and component registration.
  - **Global Provider**: Added `provideAteEditor()` for automatic injector capture and application-wide configuration defaults.
  - **Declarative Angular Nodes**: Support for registering Angular components directly within the `angularNodes` configuration property.
  - **Exhaustive Configuration**: All editor inputs (extensions, options, state calculators) are now part of `AteEditorConfig` for centralized management.
  - **Config Inheritance**: Intelligent merging of global, instance, and input-level configurations.

### Fixed

- **NodeView Stability**: Enhanced initialization and lifecycle management for embedded Angular components.

## [2.3.0] - 2026-01-28

### Added

- **Advanced Angular Component Engine**: A powerful, unified engine to embed any Angular component directly into the editor as a custom TipTap node.
  - **Universal Integration**: Seamlessly register both standard library components and TipTap-aware interactive components.
  - **Modern Reactive Support**: Full out-of-the-box compatibility with Angular 18+ Signal-based `input()` and `output()`.
  - **Editable Content Zones**: Turn any part of your Angular component into a nested, editable rich-text area.
  - **Robustness**: Build-in protection against naming collisions and reserved TipTap nodes.

## [2.2.3] - 2026-01-27

### Added

- **Link Navigation**: Added support for opening links via `Ctrl + Click` (Windows/Linux) or `Cmd + Click` (macOS), allowing users to follow links directly from the editor even in edit mode.

## [2.2.2] - 2026-01-26

### Refactored

- **Sub-Bubble Menus**: Introduced a new dedicated base class `AteBaseSubBubbleMenu` for specialized menus (link and color). This refactoring centralizes common Tippy.js logic and transition behaviors while preserving the unique anchoring and state-locking requirements of each sub-menu.

## [2.2.1] - 2026-01-25

### Added

- **Custom Menu Items**: Added support for custom items in both the `Toolbar` and the `Bubble Menu` via the `custom` property in `AteToolbarConfig` and `AteBubbleMenuConfig`. This allows developers to easily extend the editor's UI with project-specific actions.

## [2.2.0] - 2026-01-21

### Changed

- **Internal Ecosystem Prefixing**: Systemic renaming of all internal classes, services, models, and constants to use the `Ate` or `ATE_` prefix (e.g., `AteI18nService`, `AteEditorCommandsService`, `ATE_INITIAL_EDITOR_STATE`). This provides better library identification and avoids collisions with third-party extensions.
- **UI Branding Refactoring**: Refactored internal component selectors and CSS classes to use the new `ate-` prefix (e.g., `ate-button`, `ate-toolbar`). The main editor selector remains `angular-tiptap-editor`.
- **Project Standards**: Enforced Unix-style line endings (**LF**) across the entire repository via `.gitattributes` to ensure cross-platform consistency.

### Breaking Changes

- **Renamed Public Exports**: Systemal renaming of internal library exports to use the `Ate` prefix. **Backward compatibility is maintained** via deprecated aliases for all renamed items, which will be removed in v3.0.0.
  - `EditorCommandsService` -> `AteEditorCommandsService`
  - `TiptapI18nService` -> `AteI18nService`
  - `EditorStateSnapshot` -> `AteEditorStateSnapshot`
  - `INITIAL_EDITOR_STATE` -> `ATE_INITIAL_EDITOR_STATE`
  - `ToolbarConfig` -> `AteToolbarConfig`, etc.
  - All TipTap extensions (e.g., `AteResizableImage`, `AteTiptapStateExtension`).
- **Internal Component Selectors**: If you were using internal library components directly in your templates (outside of the main editor), they now use the `ate-` prefix:
  - `tiptap-toolbar` -> `ate-toolbar`
  - `tiptap-button` -> `ate-button`
  - `tiptap-bubble-menu` -> `ate-bubble-menu`
- **Main Editor Selector**: Unchanged (`angular-tiptap-editor`), preserving the existing facade.

## [2.1.3] - 2026-01-21

### Fixed

- **Linting & Code Quality**: Systematically resolved all remaining lint errors across the library and demo app.
- **Improved Type Safety**: Replaced numerous `any` types with specific interfaces or `unknown`, and added explicit `eslint-disable` comments where dynamic logic (like Tiptap chaining) requires it.
- **Accessibility (A11y)**: Enhanced interactive components with appropriate ARIA roles, `tabindex`, and keyboard event handlers (`keydown.enter`, `keydown.space`, `keydown.escape`) to meet modern accessibility standards.
- **Output Naming Consistency**: Renamed several `@Output()` properties to avoid conflicts with native DOM events and `on-` prefixes (e.g., `onClick` -> `buttonClick`).
- **Regular Expressions**: Fixed redundant escape characters in slash command patterns.
- **Case Declarations**: Wrapped switch case blocks with curly braces to properly scope lexical declarations.

## [2.1.2] - 2026-01-21

### Fixed

- **Editable State Synchronization**: Fixed an issue where the `editable` state from the `[config]` input was ignored in favor of the standalone `[editable]` input. Both are now correctly merged, with `config.editable` taking precedence.

## [2.1.1] - 2026-01-20

### Fixed

- **Height Units**: Fixed a bug where `minHeight` would result in a double "px" unit (e.g., `200pxpx`) in the DOM.
- **Character Count Styling**: Improved the footer readability by adding padding to the character/word count area.

## [2.1.0] - 2026-01-20

### Added

- **Unified Configuration**: Introduced `AteEditorConfig`, a single flatter interface to manage all editor settings (fundamentals, display options, and modules) via a new `[config]` input.
- **Enhanced Image Upload Config**: Restructured image upload settings with dedicated `AteImageUploadConfig`, supporting quality, dimensions, max size (in MB), and allowed types.
- **Menu Visibility Controls**: Added root-level boolean flags to toggle specific bubble menus (`showBubbleMenu`, `showTableMenu`, `showCellMenu`, `showImageBubbleMenu`) and slash commands (`enableSlashCommands`).
- **Improved Developer Experience**: Updated the demo's code generator to produce consolidated `AteEditorConfig` boilerplate, making it easier for developers to copy-paste configurations.

### Changed

- **Configuration Precedence**: Standardized the merging logic across all components, ensuring individual inputs correctly override global configuration values while maintaining sensible defaults.
- **Public API**: Exported `AteEditorConfig` in the public API for better type safety in host applications.

## [2.0.3] - 2026-01-19

### Added

- **Edit Toggle**: Added an optional toggle button to switch between editable and view-only modes.
- **Design Tokens Improvements**: Refined menu border-radius and image styling for a more consistent visual experience.

## [2.0.2] - 2026-01-18

### Added

- **Peer Dependencies Optimization**: Added `@tiptap/pm` to `peerDependencies`. This ensures a single shared instance of ProseMirror across the application.

### Fixed

- **Slash Commands**: Migrated internal ProseMirror imports (`state`, `view`) to the official `@tiptap/pm` bridge. This aligns the library with Tiptap's recommended architecture and improves compatibility with modern bundlers.

## [2.0.1] - 2026-01-17

### Added

- **Global Footer Toggle**: Added `[showFooter]` input to easily toggle the entire editor footer (counters and limits).

### Changed

- **Enhanced Slash Commands**: Complete visual overhaul of the slash command menu with improved padding and consistent token-based styling.

## [2.0.0] - 2026-01-17

🚀 **Major Release**

> **Note:** I decided to skip v1.0.0 to align the version number with **Tiptap v2**.
> This structure prepares the project for the upcoming migration to **Tiptap v3** (which will correspond to my v3.0.0).

### Added

- **Extensible I18n**: The translation system is now open. You can add any language (e.g., `es`, `it`) via `addTranslations()`, and the `SupportedLocale` type now accepts any string with autocomplete for default languages.
- **Per-Instance I18n Override**: Added ability to define a specific language for a given editor instance via the `[locale]` input, without affecting the global language of other editors.
- **Global I18n Singleton**: The translation service is now a global singleton (`providedIn: 'root'`), allowing for application-wide language switching with a single call.
- **Seamless Mode**: Added `[seamless]` input to remove borders, backgrounds, and paddings.
- **Floating Toolbar**: Added `[floatingToolbar]` option for a sticky, auto-hiding toolbar with glassmorphism that only appears on focus or hover.
- **Improved Read-Only**: Refined the `[editable]="false"` behavior. Clicking in the empty space of a read-only editor no longer forces focus or moves the cursor. The toolbar and footer now correctly reflect the read-only state.
- **Code Block Support**: Added dedicated `CodeBlock` button to the toolbar and slash commands.
- **Precise Inline Code**: Separated "Inline Code" and "Code Block" in menus and translations for better clarity.

### Fixed

- **Inline Code Toggle**: Fixed a reactivity bug where the "Code" button in the toolbar became disabled when already inside a code mark, preventing it from being toggled off.

### Changed

- **Service Isolation**: `EditorCommandsService`, `LinkService`, `ColorPickerService`, and `ImageService` are no longer global (`root`). They are now provided at the component level for each editor instance, ensuring perfect isolation in multi-editor scenarios.
- **Internal Refactoring**: Systemic use of `currentTranslations` (computed signal) across all internal components for perfect reactivity to language changes.

### Breaking Changes

- **Service Injection**: If you were injecting `EditorCommandsService` (or other internal services) directly into your own global services/components, it will no longer work. You must now interact with the editor via its public API (`@ViewChild or viewChild()`).

## [0.6.0] - 2026-01-14

### Added

- **Reactive State Management**: New "Snapshot & Signal" architecture with optimized change detection (OnPush).
- **Custom Extension Tracking**: Automatic state tracking for custom Tiptap Marks and Nodes (zero-config).
- **Extensible State**: New `stateCalculators` input to inject custom logic into the reactive editor state.
- **Intelligent Color Detection**: The editor state now computes the actual visible text and background colors by inspecting the DOM (computed styles). This ensures the color picker accurately reflects the current formatting even when derived from CSS themes or inherited from parent elements.
- **Link & Color Bubble Menus**: Completely refactored management with dedicated bubble menus.
- **LinkService**: New dedicated service to manage link state and lifecycle independently.
- **Improved Visual Feedback**: Menus now preserve the editor's blue selection highlight while choosing colors or preparing to type a link.
- **Improved Image Selection**: Automatic node selection after insertion or replacement, ensuring resize handles and bubble menus appear instantly.
- **Danger Button Variant**: New `danger` variant for actions like "Reset Color" or "Remove Link", providing clear visual feedback for destructive operations.

### Fixed

- **Multi-instance Support**: Full service isolation, allowing multiple editors on the same page without shared state.
- **Bubble Menu Conflicts**: Fixed overlapping menus by implementing a strict priority system (specialized menus now hide the main text menu).
- **Image Bubble Menu Persistence**: Corrected Tippy.js behavior to prevent menus from disappearing when re-clicking an already-selected image.
- **Toolbar-Menu Harmony**: Bubbles now reactively hide when interacting with the main toolbar via a centralized signal.
- **Anti-Echo Loop**: Implemented a robust "lastEmittedHtml" logic combined with `untracked()` to prevent infinite loops and cursor reset when using two-way binding or FormControls.
- **Atomic Image Replacement**: Refactored image service to perform atomic updates, fixing the "extra space" bug and preventing layout shifts during asynchronous uploads.

### Changed

- **Architectural Refactoring**: `EditorCommandsService` is now a clean facade/proxy for specialized services (`ImageService`, `ColorPickerService`, `LinkService`).
- **Optimized State Performance**: Refactored state calculators (notably `MarksCalculator`) to minimize DOM access and avoid unnecessary layout recalculations (reflow).
- **Centralized Color Utilities**: Consolidated color normalization, luminance, and contrast calculations into a shared utility for perfect consistency.
- **Public API Cleanup**: Exported all modular calculators, services, and models for better extensibility.
- **Color Picker Stability**: Integrated selection capture and locked modes to ensure 100% reliability in color application.

## [0.5.5] - 2026-01-09

### Added

- **Bubble Menus Confinement**: Menus now properly respect the editor's boundaries and are clipped by the container when scrolling, specifically optimized for `fillContainer` mode.
- **Unified Command Execution**: Centralized all editor operations within `EditorCommandsService`, ensuring consistent behavior between the toolbar and bubble menus.

### Fixed

- **Bubble Menus Positionning**: Refactored positioning logic for all bubble menus (Text, Image, Table, Cell, Slash) using Tippy's `sticky` plugin for real-time tracking during resizing and scrolling.
- **Bubble Menus Performances**: Significant performance boost in `getImageRect` and `getTableRect` using direct ProseMirror DOM lookups.
- **Performance Optimization**: Implemented `ChangeDetectionStrategy.OnPush` across all library components to minimize change detection cycles. Improved resource management by enabling Tippy's sticky polling only while menus are visible.

## [0.5.4] - 2026-01-08

### Added

- **Enhanced Color Pickers**: Refactored text and highlight pickers with a curated palette of predefined colors for faster styling.
- **Intelligent Bubble Menus**: Automatic hiding when approaching the toolbar and smart restoration when leaving, ensuring a non-obstructive editing experience.

## [0.5.3] - 2026-01-08

### Added

- **Unified Color Picker**: Refactored text and highlight color pickers into a single, generic `TiptapColorPickerComponent` for better maintainability (DRY).
- **Advanced Highlight Picker**: The highlight button now displays the selected color as its background, with automatic icon contrast (black/white) for perfect visibility.
- **Improved Text Color Picker**: Added an adaptive contrast background to the text color button when a very light color is selected, ensuring the icon remains visible.
- **Highlight Toggle vs Picker**: Separated the quick "Yellow Highlight" toggle (binary) from the advanced "Color Picker" (precision), allowing both to be configured independently.
- **New Default Configuration**: The editor now enables the advanced Color Picker and Text Color picker by default in both the toolbar and bubble menu.

## [0.5.2] - 2026-01-07

### Added

- **Word Count Toggle**: Added `showWordCount` input to independently control the visibility of the word counter.
- **Character Limit**: Added `maxCharacters` support with visual feedback and dynamic blocking.
- **Footer Configuration Section**: New section in the demo to manage counters and limits with a design consistent with other panels.

## [0.5.1] - 2026-01-07

### Fixed

- **Library Dependencies**: Added missing `@tiptap/extension-color` and `@tiptap/extension-text-style` to peerDependencies.

## [0.5.0] - 2026-01-07

### Added

- **Full Theming System**: Introduced a complete set of CSS variables (`--ate-*`) for deep editor customization.
- **Dark Mode Support**: Native support for dark mode via `.dark` class or `[data-theme="dark"]` attribute on the editor component.
- **Theme Customizer**: New interactive panel in the demo application to customize and export CSS themes in real-time.
- **Improved Slash Menu**: Refactored slash menu with better UI, keyboard navigation, and easier command filtering.

### Breaking Changes

- **Slash Commands API**: The `slashCommands` input now takes a `SlashCommandsConfig` object (a set of boolean flags) to toggle default commands, instead of a list of command items.
- **Custom Slash Commands**: To provide your own commands, you must now use the new `customSlashCommands` input.
- **CSS Variables**: The editor now relies heavily on CSS variables. If you had deep CSS overrides, you might need to update them to use the new `--ate-*` tokens.

### Fixed

- **Text Color Picker**: Improved initial color detection using computed styles and refined UI behavior to accurately reflect text color even when using theme defaults.

### Changed

- Renamed several internal components and services for better consistency.

## [0.4.0] - 2026-01-07

### Added

- Text color picker extension (PR #6 by @nicolashimmelmann)
- Integrated color picker into the main toolbar and bubble menu
- New `tiptapExtensions` and `tiptapOptions` inputs for deeper editor customization (PR #6 by @nicolashimmelmann)

## [0.3.7] - 2025-12-19

### Added

- `fillContainer` input to make the editor fill the full height of its parent container

## [0.3.6] - 2025-12-19

### Added

- Custom image upload handler (`imageUploadHandler` input)
- Support for both `Promise` and `Observable` return types in upload handler

## [0.3.5] - 2025-12-19

### Added

- `autofocus` input with multiple options (`false`, `'start'`, `'end'`, `'all'`, or position number)
- Autofocus property support (PR #5 by @elirov)

## [0.3.4] - 2025-12-19

### Fixed

- Removed console.log statements

## [0.3.3] - 2025-09-05

### Fixed

- Slash commands functionality improvements

## [0.3.2] - 2025-09-05

### Fixed

- Table functionality in slash commands

## [0.3.1] - 2025-09-03

### Added

- Table extension with bubble menu for cell editing

## [0.3.0] - 2025-09-01

### Added

- Table extension (insert, delete rows/columns, merge cells)
- Cell bubble menu for table editing

## [0.2.7] - 2025-08-22

### Fixed

- FormControls now fully Angular 18+ compliant

## [0.2.6] - 2025-08-21

### Fixed

- FormControl update when editor is not ready yet

## [0.2.5] - 2025-08-21

### Changed

- Updated README with StackBlitz demo link

## [0.2.4] - 2025-08-21

### Fixed

- FormControls improvements

## [0.2.3] - 2025-08-20

### Fixed

- Text alignment controls
- Image positioning
- Placeholder display

## [0.2.2] - 2025-08-20

### Fixed

- Material Symbols font loading

## [0.2.1] - 2025-08-20

### Fixed

- Peer dependencies versions
- Library package name

## [0.2.0] - 2025-08-20

### Fixed

- Angular version compatibility
- GitHub Pages deployment path

## [0.1.0] - 2025-08-20

### Added

- Initial release
- Rich text editing with Tiptap
- Toolbar with formatting options (bold, italic, underline, strike, code)
- Heading support (H1, H2, H3)
- Lists (bullet, ordered)
- Blockquote and horizontal rule
- Image upload with drag & drop and progress indicator
- Resizable images
- Character and word count
- Bubble menu for text formatting
- Image bubble menu with resize controls
- Slash commands with keyword filtering
- Highlight extension
- Customizable toolbar and bubble menu configuration
- Internationalization support (English, French)
- Angular 18+ standalone components
- Reactive Forms support (ControlValueAccessor)
