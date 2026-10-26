# Contributing

Thanks for helping out. This page covers how to set up the project, what a PR should contain, and the conventions the library follows.

## Before you start

- **Bugs and small fixes**: open a PR directly (or an issue first if the cause is unclear).
- **Features and larger changes**: open an issue first so the API can be discussed before you write code.
- **Bug reports**: include the library version, the browser and a reproduction (StackBlitz, repository or a minimal snippet). The bug report form asks for them.
- **Questions**: open an issue; no template needed.

## Setup

Node 24 is what CI uses.

```bash
npm ci
npm start                          # demo app on http://localhost:4200
npm exec playwright install        # once, to download the test browsers
```

The library lives in `projects/angular-tiptap-editor/`, the demo app in `src/`, and the end-to-end tests in `tests/`.

## Checks before opening a PR

CI runs the build, lint and Playwright steps below on every PR (`deploy.yml`, `lint.yml`, `playwright.yml`):

```bash
npm run build:lib    # builds the library with ng-packagr
npm run lint         # lints the demo and the library
npm run test:e2e     # Playwright, in Chromium, Firefox and WebKit
npm run format       # Prettier (not a CI check, but keeps diffs clean)
```

Run one browser or one file while iterating:

```bash
npm run test:e2e -- --project=chromium tests/paste.spec.ts
```

Playwright reuses a server already running on port 4200 outside CI. Stop any `ng serve` from another branch before running the suite, or the tests run against the wrong code.

## Conventions

**Public API**

- Export only what consumers need (for example an option type, not internal helpers). Check `projects/angular-tiptap-editor/src/public-api.ts`.
- Group related options in a config object (for example `paste: { colors, highlights }`) instead of adding one top-level boolean per format.
- New options are available both as an input and as a key of `AteEditorConfig` (as `paste` and `imageSrcResolver` are).
- If an option can change at runtime, make it reactive instead of reading it only when the editor is created. Document when a value must be a stable reference (for example `imageSrcResolver`: an inline arrow recreated on every change re-resolves every image).

**Code**

- Console messages for developers go behind `isDevMode()`.
- Do not rely on ProseMirror's `data-pm-slice` to detect copies from the editor. Every ProseMirror editor sets it; the library has its own copy marker (see `ate-paste.extension.ts`).

**Translations**

- A new user-facing string goes into every built-in locale: `en`, `fr`, `de`, `pt` and `es` (`projects/angular-tiptap-editor/src/lib/i18n/`). `AteTranslations` is the source of truth for the keys.

## Tests

Every fix or feature comes with Playwright tests in `tests/` that fail without the change.

- Cover every entry point the change touches. An image change covers paste, drop, the file picker (`page.waitForEvent("filechooser")`) and the programmatic API.
- The suite must pass in Chromium, Firefox and WebKit.
- Simulate pastes with `view.pasteHTML()`. Firefox does not populate synthetic `ClipboardEvent`s.
- Drive the editor through Angular's debug API inside `page.evaluate` (`window.ng.getComponent(...)`, `window.ng.applyChanges(...)`) instead of adding demo controls that only exist for tests.
- Prefer retrying assertions (`expect.poll`, `toHaveText`) over one-shot DOM reads, and wait for a deterministic state before pressing shortcuts.

## Documentation

Update the docs that describe the behavior you changed:

- `README.md`, `API.md` and `ADVANCED.md` where relevant.
- **Both** skill files, kept in sync: `skills/angular-tiptap-editor/SKILL.md` and `.agents/skills/angular-tiptap-editor/SKILL.md`.
- `CHANGELOG.md`: add an entry under `## [Unreleased]` in the matching `Added`, `Changed` or `Fixed` section, following the existing style (a bold title, then what changed and why it matters to users). Do not bump the version or add a release header, and do not worry about the PR number: the maintainer adds it.

## Commits and pull requests

- Use conventional prefixes in commit messages and PR titles: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`.
- PRs are squash-merged, so the PR title becomes the commit message.
- Reference the issue (`Fixes #N`) and list what you tested. The PR template has a checklist.
- Keep PRs focused: one fix or feature per PR.

## Releases

Releases are made by the maintainer, so contributors do not touch the version. The major version follows Tiptap's major version; minor and patch follow [Semantic Versioning](https://semver.org/). Pushing a `v*` tag runs `publish.yml`, which builds the library, creates the GitHub release from the matching `CHANGELOG.md` section and publishes to npm.
