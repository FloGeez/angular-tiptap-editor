# Changelog

All notable changes to `@flogeez/angular-tiptap-editor` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html), with the exception that the major version is specifically aligned with the major version of [Tiptap](https://tiptap.dev).

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
