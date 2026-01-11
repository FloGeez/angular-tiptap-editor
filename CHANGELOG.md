# Changelog

All notable changes to `@flogeez/angular-tiptap-editor` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-01-11

### Added
- **Reactive State Management**: New "Snapshot & Signal" architecture with optimized change detection.
- **Custom Extension Tracking**: Automatic state tracking for custom Tiptap Marks and Nodes (zero-config).
- **Extensible State**: New `stateCalculators` input to inject custom logic into the reactive editor state.

### Fixed
- **Multi-instance Support**: Full service isolation, allowing multiple editors on the same page without shared state.

### Changed
- **Public API Cleanup**: Exported all modular calculators and models for better extensibility.
- **Internal Refactoring**: Centralized configurations and models for a cleaner code structure.

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
- New `tiptapExtensions` and `tiptapOptions` inputs for deeper editor customization  (PR #6 by @nicolashimmelmann)


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
