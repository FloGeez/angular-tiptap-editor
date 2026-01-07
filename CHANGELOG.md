# Changelog

All notable changes to `@flogeez/angular-tiptap-editor` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
