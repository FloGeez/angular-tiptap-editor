import {
  Component,
  ElementRef,
  input,
  output,
  OnDestroy,
  viewChild,
  effect,
  signal,
  computed,
  AfterViewInit,
  inject,
  DestroyRef,
  ChangeDetectionStrategy,
  untracked,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Editor, EditorOptions, Extension, Node, Mark, JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder, CharacterCount } from "@tiptap/extensions";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import OfficePaste from "@intevation/tiptap-extension-office-paste";

import { AteResizableImage } from "../../extensions/ate-resizable-image.extension";
import { AteUploadProgress } from "../../extensions/ate-upload-progress.extension";
import { AteTableExtension } from "../../extensions/ate-table.extension";
import { AteTiptapStateExtension } from "../../extensions/ate-tiptap-state.extension";
import { AteToolbarComponent } from "../toolbar/ate-toolbar.component";
import { AteBubbleMenuComponent } from "../bubble-menus/text/ate-bubble-menu.component";
import { AteImageBubbleMenuComponent } from "../bubble-menus/image/ate-image-bubble-menu.component";
import { AteTableBubbleMenuComponent } from "../bubble-menus/table/ate-table-bubble-menu.component";
import { AteCellBubbleMenuComponent } from "../bubble-menus/table/ate-cell-bubble-menu.component";
import { AteLinkBubbleMenuComponent } from "../bubble-menus/link/ate-link-bubble-menu.component";
import { AteColorBubbleMenuComponent } from "../bubble-menus/color/ate-color-bubble-menu.component";
import { AteSlashCommandsComponent } from "../slash-commands/ate-slash-commands.component";
import { AteCustomSlashCommands } from "../../models/ate-slash-command.model";
import { AteEditToggleComponent } from "../edit-toggle/ate-edit-toggle.component";
import { AteImageService } from "../../services/ate-image.service";
import { AteI18nService, SupportedLocale } from "../../services/ate-i18n.service";
import { AteEditorCommandsService } from "../../services/ate-editor-commands.service";
import { AteColorPickerService } from "../../services/ate-color-picker.service";
import { AteLinkService } from "../../services/ate-link.service";
import { AteNoopValueAccessorDirective } from "../../directives/ate-noop-value-accessor.directive";
import { AteStateCalculator } from "../../models/ate-editor-state.model";
import { NgControl } from "@angular/forms";
import {
  filterSlashCommands,
  AteSlashCommandsConfig,
} from "../../config/ate-slash-commands.config";
import { registerAngularComponent } from "../../node-view/ate-register-angular-component";
import { RegisterAngularComponentOptions } from "../../node-view/ate-node-view.models";
import { ATE_GLOBAL_CONFIG } from "../../config/ate-global-config.token";
import { Type, Injector } from "@angular/core";

import { AteSelectionCalculator } from "../../extensions/calculators/ate-selection.calculator";
import { AteMarksCalculator } from "../../extensions/calculators/ate-marks.calculator";
import { AteTableCalculator } from "../../extensions/calculators/ate-table.calculator";
import { AteImageCalculator } from "../../extensions/calculators/ate-image.calculator";
import { AteStructureCalculator } from "../../extensions/calculators/ate-structure.calculator";
import { AteDiscoveryCalculator } from "../../extensions/calculators/ate-discovery.calculator";

import { AteToolbarConfig } from "../../models/ate-toolbar.model";
import {
  AteBubbleMenuConfig,
  AteImageBubbleMenuConfig,
  AteTableBubbleMenuConfig,
  AteCellBubbleMenuConfig,
} from "../../models/ate-bubble-menu.model";
import { AteEditorConfig, AteAngularNode } from "../../models/ate-editor-config.model";
import { AteLinkClickBehavior } from "../../extensions/ate-link-click-behavior.extension";
import {
  ATE_DEFAULT_TOOLBAR_CONFIG,
  ATE_DEFAULT_BUBBLE_MENU_CONFIG,
  ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG,
  ATE_DEFAULT_IMAGE_UPLOAD_CONFIG,
  ATE_DEFAULT_TABLE_MENU_CONFIG,
  ATE_DEFAULT_CELL_MENU_CONFIG,
  ATE_DEFAULT_CONFIG,
} from "../../config/ate-editor.config";
import { concat, defer, Observable, of, tap } from "rxjs";
import { AteImageUploadHandler, AteImageUploadOptions } from "../../models/ate-image.model";

// Slash commands configuration is handled dynamically via slashCommandsConfigComputed

/**
 * The main rich-text editor component for Angular.
 *
 * Powered by Tiptap and built with a native Signal-based architecture, it provides
 * a seamless, high-performance editing experience. Supports automatic registration
 * of Angular components as interactive nodes ('Angular Nodes'), full Reactive Forms
 * integration, and extensive customization via the AteEditorConfig.
 */
@Component({
  selector: "angular-tiptap-editor",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [AteNoopValueAccessorDirective],
  host: {
    "[class.fill-container]": "finalFillContainer()",
    "[class.floating-toolbar]": "finalFloatingToolbar()",
    "[class.is-readonly]": "!finalEditable() && !mergedDisabled()",
    "[class.is-disabled]": "mergedDisabled()",
    "[style.--ate-border-width]": "finalSeamless() || mergedDisabled() ? '0' : null",
    "[style.--ate-background]":
      "finalSeamless() ? 'transparent' : (mergedDisabled() ? 'var(--ate-surface-tertiary)' : null)",
    "[style.--ate-toolbar-border-color]": "finalSeamless() ? 'transparent' : null",
    "[style.--ate-counter-background]": "finalSeamless() ? 'transparent' : null",
    "[style.--ate-counter-border-color]": "finalSeamless() ? 'transparent' : null",
    "[class.dark]": "config().theme === 'dark'",
    "[attr.data-theme]": "config().theme",
  },
  imports: [
    AteToolbarComponent,
    AteBubbleMenuComponent,
    AteImageBubbleMenuComponent,
    AteTableBubbleMenuComponent,
    AteCellBubbleMenuComponent,
    AteSlashCommandsComponent,
    AteLinkBubbleMenuComponent,
    AteColorBubbleMenuComponent,
    AteEditToggleComponent,
  ],
  providers: [AteEditorCommandsService, AteImageService, AteColorPickerService, AteLinkService],
  template: `
    <div class="ate-editor">
      <!-- Toolbar -->
      @if (finalEditable() && !mergedDisabled() && finalShowToolbar() && editor()) {
        <ate-toolbar
          [editor]="editor()!"
          [config]="finalToolbarConfig()"
          [imageUpload]="finalImageUploadConfig()"
          [floating]="finalFloatingToolbar()"
          (mouseenter)="hideBubbleMenus()"
          (mouseleave)="showBubbleMenus()" />
      }

      @if (finalShowEditToggle() && !mergedDisabled()) {
        <ate-edit-toggle
          [editable]="finalEditable()"
          [translations]="currentTranslations()"
          (editToggle)="toggleEditMode($event)" />
      }

      <!-- Editor Content -->
      <div
        #editorElement
        class="ate-content"
        [class.drag-over]="isDragOver()"
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event)"
        (click)="onEditorClick($event)"
        (keydown.enter)="onEditorClick($event)"
        (keydown.space)="onEditorClick($event)"
        tabindex="0"
        role="application"
        [attr.aria-label]="currentTranslations().editor.placeholder"></div>

      <!-- Text Bubble Menu -->
      @if (finalEditable() && finalShowBubbleMenu() && editor()) {
        <ate-bubble-menu
          [editor]="editor()!"
          [config]="finalBubbleMenuConfig()"
          [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-bubble-menu>
      }

      <!-- Image Bubble Menu -->
      @if (finalShowImageBubbleMenu() && editor()) {
        <ate-image-bubble-menu
          [editor]="editor()!"
          [config]="finalImageBubbleMenuConfig()"
          [imageUpload]="finalImageUploadConfig()"
          [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-image-bubble-menu>
      }

      <!-- Link Bubble Menu -->
      @if (finalEditable() && editor()) {
        <ate-link-bubble-menu
          [editor]="editor()!"
          [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-link-bubble-menu>
      }

      <!-- Color Bubble Menu -->
      @if (finalEditable() && editor()) {
        <ate-color-bubble-menu
          [editor]="editor()!"
          [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-color-bubble-menu>
      }

      <!-- Slash Commands -->
      @if (finalEditable() && finalEnableSlashCommands() && editor()) {
        <ate-slash-commands
          [editor]="editor()!"
          [config]="finalSlashCommandsConfig()"
          [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-slash-commands>
      }

      <!-- Table Menu -->
      @if (finalEditable() && finalShowTableBubbleMenu() && editor()) {
        <ate-table-bubble-menu
          [editor]="editor()!"
          [config]="finalTableBubbleMenuConfig()"
          [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-table-bubble-menu>
      }

      <!-- Cell Menu -->
      @if (finalEditable() && finalShowCellBubbleMenu() && editor()) {
        <ate-cell-bubble-menu
          [editor]="editor()!"
          [config]="finalCellBubbleMenuConfig()"
          [style.display]="editorFullyInitialized() ? 'block' : 'none'"></ate-cell-bubble-menu>
      }

      <!-- Counters -->
      @if (
        finalEditable() &&
        !mergedDisabled() &&
        finalShowFooter() &&
        (finalShowCharacterCount() || finalShowWordCount())
      ) {
        <div
          class="character-count"
          [class.limit-reached]="finalMaxCharacters() && characterCount() >= finalMaxCharacters()!">
          @if (finalShowCharacterCount()) {
            {{ characterCount() }}
            {{ currentTranslations().editor.character }}{{ characterCount() > 1 ? "s" : "" }}
            @if (finalMaxCharacters()) {
              / {{ finalMaxCharacters() }}
            }
          }

          @if (finalShowCharacterCount() && finalShowWordCount()) {
            ,
          }

          @if (finalShowWordCount()) {
            {{ wordCount() }}
            {{ currentTranslations().editor.word }}{{ wordCount() > 1 ? "s" : "" }}
          }
        </div>
      }
    </div>
  `,

  styles: [
    `
      /* ========================================
         CSS Custom Properties (Variables)
         Override these to customize the editor
         ======================================== */
      :host {
        /* ===== BASE TOKENS (customize these for easy theming) ===== */
        --ate-primary: #2563eb;
        --ate-primary-hover: #153ca9;
        --ate-primary-contrast: #ffffff;
        --ate-primary-light: color-mix(in srgb, var(--ate-primary), transparent 90%);
        --ate-primary-lighter: color-mix(in srgb, var(--ate-primary), transparent 95%);
        --ate-primary-light-alpha: color-mix(in srgb, var(--ate-primary), transparent 85%);

        --ate-surface: #ffffff;
        --ate-surface-secondary: #f8f9fa;
        --ate-surface-tertiary: #f1f5f9;

        --ate-text: #2d3748;
        --ate-text-secondary: #64748b;
        --ate-text-muted: #a0aec0;

        --ate-border: #e2e8f0;

        --ate-highlight-bg: #fef08a;
        --ate-highlight-color: #854d0e;

        --ate-button-hover: #f1f5f9;
        --ate-button-active: #e2e8f0;

        --ate-error-color: #c53030;
        --ate-error-bg: #fed7d7;
        --ate-error-border: #feb2b2;

        /* ===== COMPONENT TOKENS (use base tokens by default) ===== */
        /* Border & Container */
        --ate-border-color: var(--ate-border);
        --ate-border-width: 2px;
        --ate-border-radius: 12px;
        --ate-focus-color: var(--ate-primary);
        --ate-background: var(--ate-surface);
        --ate-sub-border-radius: 8px;

        /* Content */
        --ate-text-color: var(--ate-text);
        --ate-placeholder-color: var(--ate-text-muted);
        --ate-line-height: 1.6;
        --ate-content-padding: 16px;

        /* ===== MENUS (Slash/Bubble) ===== */
        --ate-menu-bg: var(--ate-surface);
        --ate-menu-border-radius: var(--ate-border-radius);
        --ate-menu-border: var(--ate-border);
        --ate-menu-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        --ate-menu-padding: 4px;
        --ate-menu-gap: 2px;

        /* Toolbar */
        --ate-toolbar-padding: var(--ate-menu-padding);
        --ate-toolbar-gap: var(--ate-menu-gap);
        --ate-toolbar-background: var(--ate-surface-secondary);
        --ate-toolbar-border-color: var(--ate-border);
        --ate-toolbar-button-color: var(--ate-text-secondary);
        --ate-toolbar-button-hover-background: transparent;
        --ate-toolbar-button-active-background: var(--ate-primary-light);
        --ate-toolbar-button-active-color: var(--ate-primary);

        /* Counter */
        --ate-counter-color: var(--ate-text-secondary);
        --ate-counter-background: var(--ate-surface-secondary);
        --ate-counter-border-color: var(--ate-border);

        /* Drag & Drop */
        --ate-drag-background: #f0f8ff;
        --ate-drag-border-color: var(--ate-primary);

        /* Blockquote */
        --ate-blockquote-border-color: var(--ate-border);
        --ate-blockquote-background: var(--ate-surface-secondary);

        /* Code */
        --ate-code-background: var(--ate-surface-secondary);
        --ate-code-color: var(--ate-text);
        --ate-code-border-color: var(--ate-border);

        --ate-code-block-background: #0f172a;
        --ate-code-block-color: #e2e8f0;
        --ate-code-block-border-color: var(--ate-border);

        /* Images */
        --ate-image-border-radius: 16px;
        --ate-image-selected-color: var(--ate-primary);

        /* Scrollbars */
        --ate-scrollbar-width: 10px;
        --ate-scrollbar-thumb: var(--ate-border);
        --ate-scrollbar-thumb-hover: var(--ate-text-muted);
        --ate-scrollbar-track: transparent;

        /* Tables */
        --ate-table-border-color: var(--ate-border);
        --ate-table-header-background: var(--ate-surface-secondary);
        --ate-table-header-color: var(--ate-text);
        --ate-table-cell-background: var(--ate-surface);
        --ate-table-cell-selected-background: var(--ate-primary-light);
        --ate-table-resize-handle-color: var(--ate-primary);
        --ate-table-row-hover-background: var(--ate-primary-lighter);

        /* Floating UI & Tooltips */
        --ate-tooltip-bg: var(--ate-code-block-background, #0f172a);
        --ate-tooltip-color: var(--ate-code-block-color, #e2e8f0);
      }

      /* Manual dark mode with class or data attribute */
      :host(.dark),
      :host([data-theme="dark"]) {
        /* ===== DARK BASE TOKENS ===== */
        --ate-primary: #3b82f6;
        --ate-primary-contrast: #ffffff;
        --ate-primary-light: color-mix(in srgb, var(--ate-primary), transparent 85%);
        --ate-primary-lighter: color-mix(in srgb, var(--ate-primary), transparent 92%);
        --ate-primary-light-alpha: color-mix(in srgb, var(--ate-primary), transparent 80%);

        --ate-surface: #020617;
        --ate-surface-secondary: #0f172a;
        --ate-surface-tertiary: #1e293b;

        --ate-text: #f8fafc;
        --ate-text-secondary: #94a3b8;
        --ate-text-muted: #64748b;

        --ate-border: #1e293b;

        --ate-highlight-bg: #854d0e;
        --ate-highlight-color: #fef08a;

        --ate-button-hover: #1e293b;
        --ate-button-active: #0f172a;

        /* ===== MENUS (Slash/Bubble) ===== */
        --ate-menu-border: rgba(255, 255, 255, 0.1);
        --ate-menu-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);

        --ate-error-color: #f87171;
        --ate-error-bg: #450a0a;
        --ate-error-border: #7f1d1d;

        /* ===== DARK COMPONENT OVERRIDES ===== */
        --ate-drag-background: var(--ate-surface-tertiary);
        --ate-drag-border-color: var(--ate-primary);
        --ate-blockquote-border-color: var(--ate-primary);
        --ate-toolbar-button-active-background: var(--ate-primary-light);
        --ate-toolbar-button-active-color: var(--ate-primary);
        --ate-button-hover: var(--ate-surface-tertiary);
        --ate-button-active: var(--ate-surface-secondary);
        --ate-scrollbar-thumb: var(--ate-surface-tertiary);
        --ate-scrollbar-thumb-hover: var(--ate-text-muted);
      }

      /* Host styles pour fillContainer */
      :host(.fill-container) {
        display: block;
        height: 100%;
      }

      /* Main editor container */
      .ate-editor {
        border: var(--ate-border-width) solid var(--ate-border-color);
        border-radius: var(--ate-border-radius);
        background: var(--ate-background);
        overflow: visible;
        transition: border-color 0.2s ease;
        position: relative;
      }

      /* Floating Toolbar Mode */
      :host(.floating-toolbar) .ate-editor {
        overflow: visible;
      }

      /* Fill container mode - editor fills its parent */
      :host(.fill-container) .ate-editor {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      :host(.fill-container) .ate-content-wrapper {
        flex: 1;
        min-height: 0;
      }

      :host(.fill-container) .ate-content {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
      }

      .ate-editor:focus-within {
        border-color: var(--ate-focus-color);
      }

      /* Editor content area */
      .ate-content {
        min-height: var(--editor-min-height, 200px);
        height: var(--editor-height, auto);
        max-height: var(--editor-max-height, none);
        overflow-y: var(--editor-overflow, visible);
        outline: none;
        position: relative;
        scrollbar-width: thin;
        scrollbar-color: var(--ate-scrollbar-thumb) var(--ate-scrollbar-track);
      }

      :host(.is-disabled) .ate-content {
        cursor: not-allowed;
        opacity: 0.7;
        user-select: none;
        pointer-events: none;
        background-color: var(--ate-surface-tertiary);
      }

      :host(.is-readonly) .ate-content {
        cursor: default;
        user-select: text;
      }

      :host(.is-readonly) .ate-content ::ng-deep .ate-link {
        cursor: pointer;
        pointer-events: auto;
      }

      .ate-content::-webkit-scrollbar {
        width: var(--ate-scrollbar-width);
      }

      .ate-content-wrapper {
        position: relative;
        display: flex;
        flex-direction: column;
        min-height: 0;
      }

      .ate-content-wrapper .ate-content {
        flex: 1;
      }

      .ate-content::-webkit-scrollbar-track {
        background: var(--ate-scrollbar-track);
      }

      .ate-content::-webkit-scrollbar-thumb {
        background: var(--ate-scrollbar-thumb);
        border: 3px solid transparent;
        background-clip: content-box;
        border-radius: 10px;
      }

      .ate-content::-webkit-scrollbar-thumb:hover {
        background: var(--ate-scrollbar-thumb-hover);
        background-clip: content-box;
      }

      .ate-content.drag-over {
        background: var(--ate-drag-background);
        border: 2px dashed var(--ate-drag-border-color);
      }

      /* Compteur de caractères */
      .character-count {
        padding: 6px 8px;
        font-size: 12px;
        color: var(--ate-counter-color);
        text-align: right;
        border-top: 1px solid var(--ate-counter-border-color);
        background: var(--ate-counter-background);
        transition: color 0.2s ease;
        border-bottom-left-radius: calc(var(--ate-border-radius) - var(--ate-border-width));
        border-bottom-right-radius: calc(var(--ate-border-radius) - var(--ate-border-width));
      }

      .character-count.limit-reached {
        color: var(--ate-error-color, #ef4444);
        font-weight: 600;
      }

      /* Styles ProseMirror avec :host ::ng-deep */
      :host ::ng-deep .ProseMirror {
        padding: var(--ate-content-padding);
        outline: none;
        line-height: var(--ate-line-height);
        color: var(--ate-text-color);
        min-height: 100%;
        height: 100%;
        /* S'assurer que le contenu s'étend correctement dans un conteneur scrollable */
        word-wrap: break-word;
        overflow-wrap: break-word;
      }

      /* Titres */
      :host ::ng-deep .ProseMirror h1 {
        font-size: 2em;
        font-weight: bold;
        margin-top: 0;
        margin-bottom: 0.5em;
      }

      :host ::ng-deep .ProseMirror h2 {
        font-size: 1.5em;
        font-weight: bold;
        margin-top: 1em;
        margin-bottom: 0.5em;
      }

      :host ::ng-deep .ProseMirror h3 {
        font-size: 1.25em;
        font-weight: bold;
        margin-top: 1em;
        margin-bottom: 0.5em;
      }

      /* Paragraphes et listes */
      :host ::ng-deep .ProseMirror p {
        margin: 0.5em 0;
      }

      :host ::ng-deep .ProseMirror ul,
      :host ::ng-deep .ProseMirror ol {
        padding-left: 2em;
        margin: 0.5em 0;
      }

      /* Citations */
      :host ::ng-deep .ProseMirror blockquote {
        border-left: 4px solid var(--ate-blockquote-border-color);
        padding-left: 1em;
        margin: 1em 0;
        background: var(--ate-blockquote-background);
        padding: 0.5em 1em;
        border-radius: 0 4px 4px 0;
      }

      /* Code */
      :host ::ng-deep .ProseMirror code {
        background: var(--ate-code-background);
        color: var(--ate-code-color);
        border: 1px solid var(--ate-code-border-color);
        padding: 0.15em 0.4em;
        border-radius: 4px;
        font-family: "JetBrains Mono", "Fira Code", "Monaco", "Consolas", monospace;
        font-size: 0.85em;
        font-weight: 500;
      }

      :host ::ng-deep .ProseMirror pre {
        background: var(--ate-code-block-background);
        color: var(--ate-code-block-color);
        border: 1px solid var(--ate-code-block-border-color);
        padding: 1em;
        border-radius: var(--ate-border-radius);
        overflow-x: auto;
        margin: 1em 0;
      }

      :host ::ng-deep .ProseMirror pre code {
        background: none;
        color: inherit;
        border: none;
        padding: 0;
      }

      /* Placeholder */
      :host ::ng-deep .ProseMirror p.is-editor-empty:first-child::before {
        content: attr(data-placeholder);
        color: var(--ate-placeholder-color);
        pointer-events: none;
        float: left;
        height: 0;
      }

      /* Mode lecture seule */
      :host ::ng-deep .ProseMirror[contenteditable="false"] {
        /* Allow interaction in read-only mode (links, node selection) */
      }

      :host ::ng-deep .ProseMirror[contenteditable="false"] img {
        cursor: pointer;
      }

      :host ::ng-deep .ProseMirror[contenteditable="false"] a {
        cursor: pointer;
      }

      :host ::ng-deep .ProseMirror[contenteditable="false"] img:hover {
        transform: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      :host ::ng-deep .ProseMirror[contenteditable="false"] img.ProseMirror-selectednode {
        outline: none;
      }

      /* Styles pour les images */
      :host ::ng-deep .ProseMirror img {
        position: relative;
        display: inline-block;
        max-width: 100%;
        height: auto;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid transparent;
        border-radius: var(--ate-image-border-radius);
      }

      :host ::ng-deep .ProseMirror img:hover {
        border-color: var(--ate-border-color);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      :host ::ng-deep .ProseMirror img.ProseMirror-selectednode,
      :host ::ng-deep .resizable-image-container.selected img {
        border-color: var(--ate-image-selected-color);
        transition: all 0.2s ease;
      }

      /* Alignment Support (ProseMirror / ATE Wrapper) */
      :host ::ng-deep .ProseMirror [data-text-align="center"],
      :host ::ng-deep .ProseMirror [data-align="center"] {
        text-align: center;
      }

      :host ::ng-deep .ProseMirror [data-text-align="right"],
      :host ::ng-deep .ProseMirror [data-align="right"] {
        text-align: right;
      }

      :host ::ng-deep .ProseMirror [data-text-align="left"],
      :host ::ng-deep .ProseMirror [data-align="left"] {
        text-align: left;
      }

      /* Conteneur pour les images redimensionnables */
      :host ::ng-deep .resizable-image-wrapper {
        display: block;
        width: 100%;
        margin: 0.5em 0;
      }

      :host ::ng-deep .resizable-image-container {
        position: relative;
        display: inline-block;
        max-width: 100%;
      }

      /* Conteneur des contrôles de redimensionnement */
      :host ::ng-deep .resize-controls {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      /* Afficher les poignées au hover (même si non sélectionné) - Uniquement si éditable */
      :host:not(.is-readonly):not(.is-disabled)
        ::ng-deep
        .resizable-image-container:hover
        .resize-controls,
      :host:not(.is-readonly):not(.is-disabled) ::ng-deep body.resizing .resize-controls {
        opacity: 1;
      }

      /* Poignées de redimensionnement */
      :host ::ng-deep .resize-handle {
        position: absolute;
        width: 0.35rem;
        height: 2rem;
        background: var(--ate-primary);
        border: 2px solid var(--ate-surface);
        border-radius: var(--ate-border-radius);
        pointer-events: all;
        cursor: pointer;
        z-index: 1001;
        transition: all 0.15s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      }

      :host ::ng-deep .resize-handle:hover {
        background: var(--ate-primary);
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
      }

      :host ::ng-deep .resize-handle:active {
        background: var(--ate-primary);
      }

      /* Poignées des côtés avec scale séparé pour centrage */
      :host ::ng-deep .resize-handle-w:hover,
      :host ::ng-deep .resize-handle-e:hover {
        background: var(--ate-primary-hover);
      }

      :host ::ng-deep .resize-handle-w:active,
      :host ::ng-deep .resize-handle-e:active {
        transform: translateY(-50%) scale(0.9);
        background: var(--ate-primary-hover);
      }

      /* Positions spécifiques pour chaque poignée */
      :host ::ng-deep .resize-handle-w {
        top: 50%;
        left: 0.35rem;
        transform: translateY(-50%);
        cursor: w-resize;
      }
      :host ::ng-deep .resize-handle-e {
        top: 50%;
        right: 0.35rem;
        transform: translateY(-50%);
        cursor: e-resize;
      }

      /* Styles pour le redimensionnement en cours */
      :host ::ng-deep body.resizing {
        user-select: none;
        cursor: crosshair;
      }

      :host ::ng-deep body.resizing .ProseMirror {
        pointer-events: none;
      }

      :host ::ng-deep body.resizing .ProseMirror .resizable-image-container {
        pointer-events: none;
      }

      /* Styles pour les informations de taille d'image */
      :host ::ng-deep .image-size-info {
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 11px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      :host ::ng-deep .resizable-image-container:hover .image-size-info {
        opacity: 1;
      }
      /* Styles pour les tables */
      :host ::ng-deep .ProseMirror table {
        border-collapse: separate;
        border-spacing: 0;
        margin: 0;
        table-layout: fixed;
        width: 100%;
        border-radius: 8px;
        overflow: hidden;
      }

      :host ::ng-deep .ProseMirror table td,
      :host ::ng-deep .ProseMirror table th {
        border: none;
        border-right: 1px solid var(--ate-table-border-color);
        border-bottom: 1px solid var(--ate-table-border-color);
        box-sizing: border-box;
        min-width: 1em;
        padding: 8px 12px;
        position: relative;
        vertical-align: top;
        text-align: left;
      }

      :host ::ng-deep .ProseMirror table td {
        background: var(--ate-table-cell-background);
      }

      /* Ajouter les bordures externes manquantes pour former la bordure du tableau */
      :host ::ng-deep .ProseMirror table td:first-child,
      :host ::ng-deep .ProseMirror table th:first-child {
        border-left: 1px solid var(--ate-table-border-color);
      }

      :host ::ng-deep .ProseMirror table tr:first-child td,
      :host ::ng-deep .ProseMirror table tr:first-child th {
        border-top: 1px solid var(--ate-table-border-color);
      }

      /* Coins arrondis */
      :host ::ng-deep .ProseMirror table tr:first-child th:first-child {
        border-top-left-radius: 8px;
      }

      :host ::ng-deep .ProseMirror table tr:first-child th:last-child {
        border-top-right-radius: 8px;
      }

      :host ::ng-deep .ProseMirror table tr:last-child td:first-child {
        border-bottom-left-radius: 8px;
      }

      :host ::ng-deep .ProseMirror table tr:last-child td:last-child {
        border-bottom-right-radius: 8px;
      }

      /* En-têtes de table */
      :host ::ng-deep .ProseMirror table th {
        background: var(--ate-table-header-background);
        font-weight: 600;
        color: var(--ate-table-header-color);
      }

      /* Cellules sélectionnées */
      :host ::ng-deep .ProseMirror table .selectedCell:after {
        background: var(--ate-table-cell-selected-background);
        content: "";
        left: 0;
        right: 0;
        top: 0;
        bottom: 0;
        pointer-events: none;
        position: absolute;
        z-index: 2;
      }

      /* Poignées de redimensionnement */
      :host ::ng-deep .ProseMirror table .column-resize-handle {
        position: absolute;
        right: -2px;
        top: 0;
        bottom: 0;
        width: 4px;
        background-color: var(--ate-table-resize-handle-color);
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      :host ::ng-deep .ProseMirror table:hover .column-resize-handle {
        opacity: 1;
      }

      :host ::ng-deep .ProseMirror table .column-resize-handle:hover {
        background-color: var(--ate-focus-color);
      }

      /* Container avec scroll horizontal */
      :host ::ng-deep .ProseMirror .tableWrapper {
        overflow-x: auto;
        margin: 1em 0;
        border-radius: 8px;
      }

      :host ::ng-deep .ProseMirror .tableWrapper table {
        margin: 0;
        border-radius: 8px;
        min-width: 600px;
        overflow: hidden;
      }

      /* Paragraphes dans les tables */
      :host ::ng-deep .ProseMirror table p {
        margin: 0;
      }

      /* Styles pour les lignes avec hover */
      :host ::ng-deep .ProseMirror table tbody tr:hover td {
        background-color: var(--ate-table-row-hover-background);
      }
    `,
  ],
})
export class AngularTiptapEditorComponent implements AfterViewInit, OnDestroy {
  /** Configuration globale de l'éditeur */
  config = input<AteEditorConfig>({});

  content = input<string>("");
  placeholder = input<string | undefined>(undefined);
  editable = input<boolean | undefined>(undefined);
  disabled = input<boolean | undefined>(undefined);
  minHeight = input<number | string | undefined>(undefined);
  height = input<number | string | undefined>(undefined);
  maxHeight = input<number | string | undefined>(undefined);
  fillContainer = input<boolean | undefined>(undefined);
  showToolbar = input<boolean | undefined>(undefined);
  showFooter = input<boolean | undefined>(undefined);
  showCharacterCount = input<boolean | undefined>(undefined);
  showWordCount = input<boolean | undefined>(undefined);
  maxCharacters = input<number | undefined>(undefined);
  enableOfficePaste = input<boolean | undefined>(undefined);
  enableSlashCommands = input<boolean | undefined>(undefined);
  slashCommands = input<AteSlashCommandsConfig | undefined>(undefined);
  customSlashCommands = input<AteCustomSlashCommands | undefined>(undefined);
  locale = input<SupportedLocale | undefined>(undefined);
  autofocus = input<boolean | "start" | "end" | "all" | number | undefined>(undefined);
  seamless = input<boolean | undefined>(undefined);
  floatingToolbar = input<boolean | undefined>(undefined);
  showEditToggle = input<boolean | undefined>(undefined);
  spellcheck = input<boolean | undefined>(undefined);

  tiptapExtensions = input<(Extension | Node | Mark)[] | undefined>(undefined);
  tiptapOptions = input<Partial<EditorOptions> | undefined>(undefined);

  // Nouveaux inputs pour les bubble menus
  showBubbleMenu = input<boolean | undefined>(undefined);
  bubbleMenu = input<Partial<AteBubbleMenuConfig> | undefined>(undefined);
  showImageBubbleMenu = input<boolean | undefined>(undefined);
  imageBubbleMenu = input<Partial<AteImageBubbleMenuConfig> | undefined>(undefined);

  // Configuration de la toolbar
  toolbar = input<Partial<AteToolbarConfig> | undefined>(undefined);

  // Configuration des menus de table
  showTableBubbleMenu = input<boolean | undefined>(undefined);
  tableBubbleMenu = input<Partial<AteTableBubbleMenuConfig> | undefined>(undefined);
  showCellBubbleMenu = input<boolean | undefined>(undefined);
  cellBubbleMenu = input<Partial<AteCellBubbleMenuConfig> | undefined>(undefined);

  /**
   * Additionnal state calculators to extend the reactive editor state.
   */
  stateCalculators = input<AteStateCalculator[] | undefined>(undefined);

  // Nouveau input pour la configuration de l'upload d'images
  imageUpload = input<Partial<AteImageUploadOptions> | undefined>(undefined);

  /**
   * Custom handler for image uploads.
   * When provided, images will be processed through this handler instead of being converted to base64.
   * This allows you to upload images to your own server/storage and use the returned URL.
   *
   * @example
   * ```typescript
   * myUploadHandler: ImageUploadHandler = async (context) => {
   *   const formData = new FormData();
   *   formData.append('image', context.file);
   *   const response = await fetch('/api/upload', { method: 'POST', body: formData });
   *   const data = await response.json();
   *   return { src: data.imageUrl };
   * };
   *
   * // In template:
   * // <angular-tiptap-editor [imageUploadHandler]="myUploadHandler" />
   * ```
   */
  imageUploadHandler = input<AteImageUploadHandler | undefined>(undefined);

  // Nouveaux outputs
  contentChange = output<string>();
  editorCreated = output<Editor>();
  editorUpdate = output<{ editor: Editor; transaction: unknown }>();
  editorFocus = output<{ editor: Editor; event: FocusEvent }>();
  editorBlur = output<{ editor: Editor; event: FocusEvent }>();
  editableChange = output<boolean>();

  // ViewChild with signal
  editorElement = viewChild.required<ElementRef>("editorElement");

  // ============================================
  // Toolbar / Bubble Menu Coordination
  // ============================================
  hideBubbleMenus(): void {
    this.editorCommandsService.setToolbarInteracting(true);
  }

  showBubbleMenus(): void {
    this.editorCommandsService.setToolbarInteracting(false);
  }

  // Private signals for internal state
  private _editor = signal<Editor | null>(null);
  private _characterCount = signal<number>(0);
  private _wordCount = signal<number>(0);
  private _isDragOver = signal<boolean>(false);
  private _editorFullyInitialized = signal<boolean>(false);

  // Anti-echo: track last emitted HTML to prevent cursor reset on parent echo
  private lastEmittedHtml: string | null = null;

  // Read-only access to signals
  readonly editor = this._editor.asReadonly();
  readonly characterCount = this._characterCount.asReadonly();
  readonly wordCount = this._wordCount.asReadonly();
  readonly isDragOver = this._isDragOver.asReadonly();
  readonly editorFullyInitialized = this._editorFullyInitialized.asReadonly();

  private _isFormControlDisabled = signal<boolean>(false);
  readonly isFormControlDisabled = this._isFormControlDisabled.asReadonly();

  // Combined disabled state (Input + FormControl)
  readonly mergedDisabled = computed(
    () => (this.disabled() ?? this.effectiveConfig().disabled) || this.isFormControlDisabled()
  );

  // Computed for editor states
  isEditorReady = computed(() => this.editor() !== null);

  // ============================================
  // UNIFIED CONFIGURATION COMPUTED PROPERTIES
  // ============================================

  // Appearance & Fundamentals
  readonly finalSeamless = computed(() => {
    const inputVal = this.seamless();
    if (inputVal !== undefined) {
      return inputVal;
    }

    const fromConfig = this.effectiveConfig().mode;
    return fromConfig === "seamless";
  });

  readonly finalEditable = computed(
    () => this.editable() ?? this.effectiveConfig().editable ?? true
  );
  readonly finalPlaceholder = computed(
    () =>
      this.placeholder() ??
      this.effectiveConfig().placeholder ??
      this.currentTranslations().editor.placeholder
  );
  readonly finalFillContainer = computed(
    () => this.fillContainer() ?? this.effectiveConfig().fillContainer
  );
  readonly finalShowFooter = computed(
    () => this.showFooter() ?? this.effectiveConfig().showFooter ?? true
  );
  readonly finalShowEditToggle = computed(
    () => this.showEditToggle() ?? this.effectiveConfig().showEditToggle ?? false
  );

  readonly finalHeight = computed(() => {
    const h = this.height() ?? this.effectiveConfig().height;
    return typeof h === "number" ? `${h}px` : h;
  });
  readonly finalMinHeight = computed(() => {
    const mh = this.minHeight() ?? this.effectiveConfig().minHeight;
    return typeof mh === "number" ? `${mh}px` : mh;
  });
  readonly finalMaxHeight = computed(() => {
    const mh = this.maxHeight() ?? this.effectiveConfig().maxHeight;
    return typeof mh === "number" ? `${mh}px` : mh;
  });

  readonly finalSpellcheck = computed(
    () => this.spellcheck() ?? this.effectiveConfig().spellcheck ?? true
  );
  readonly finalEnableOfficePaste = computed(
    () => this.enableOfficePaste() ?? this.effectiveConfig().enableOfficePaste ?? true
  );

  // Features
  readonly finalShowToolbar = computed(
    () => this.showToolbar() ?? this.effectiveConfig().showToolbar ?? true
  );

  readonly finalToolbarConfig = computed(() => {
    const fromInput = this.toolbar();
    const fromConfig = this.effectiveConfig().toolbar;
    const base = ATE_DEFAULT_TOOLBAR_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalFloatingToolbar = computed(
    () => this.floatingToolbar() ?? this.effectiveConfig().floatingToolbar ?? false
  );

  readonly finalShowBubbleMenu = computed(
    () => this.showBubbleMenu() ?? this.effectiveConfig().showBubbleMenu ?? true
  );

  readonly finalBubbleMenuConfig = computed(() => {
    const fromInput = this.bubbleMenu();
    const fromConfig = this.effectiveConfig().bubbleMenu;
    const base = ATE_DEFAULT_BUBBLE_MENU_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalShowImageBubbleMenu = computed(
    () => this.showImageBubbleMenu() ?? this.effectiveConfig().showImageBubbleMenu ?? true
  );

  readonly finalImageBubbleMenuConfig = computed(() => {
    const fromInput = this.imageBubbleMenu();
    const fromConfig = this.effectiveConfig().imageBubbleMenu;
    const base = ATE_DEFAULT_IMAGE_BUBBLE_MENU_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalShowTableBubbleMenu = computed(
    () => this.showTableBubbleMenu() ?? this.effectiveConfig().showTableMenu ?? true
  );

  readonly finalTableBubbleMenuConfig = computed(() => {
    const fromInput = this.tableBubbleMenu();
    const fromConfig = this.effectiveConfig().tableBubbleMenu;
    const base = ATE_DEFAULT_TABLE_MENU_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalShowCellBubbleMenu = computed(
    () => this.showCellBubbleMenu() ?? this.effectiveConfig().showCellMenu ?? true
  );

  readonly finalCellBubbleMenuConfig = computed(() => {
    const fromInput = this.cellBubbleMenu();
    const fromConfig = this.effectiveConfig().cellBubbleMenu;
    const base = ATE_DEFAULT_CELL_MENU_CONFIG;

    if (fromInput && Object.keys(fromInput).length > 0) {
      return { ...base, ...fromInput };
    }
    if (fromConfig) {
      return { ...base, ...fromConfig };
    }
    return base;
  });

  readonly finalEnableSlashCommands = computed(
    () => this.enableSlashCommands() ?? this.effectiveConfig().enableSlashCommands ?? true
  );

  readonly finalSlashCommandsConfig = computed(() => {
    const fromInputComponent = this.customSlashCommands();
    const fromConfigComponent = this.effectiveConfig().customSlashCommands;
    const customConfig = fromInputComponent ?? fromConfigComponent;

    if (customConfig) {
      return customConfig;
    }

    const fromInputOptions = this.slashCommands();
    const fromConfigOptions = this.effectiveConfig().slashCommands;
    const baseConfig =
      fromInputOptions && Object.keys(fromInputOptions).length > 0
        ? fromInputOptions
        : fromConfigOptions;

    return {
      commands: filterSlashCommands(
        baseConfig || {},
        this.i18nService,
        this.editorCommandsService,
        this.finalImageUploadConfig()
      ),
    };
  });

  // Behavior
  readonly finalAutofocus = computed(() => this.autofocus() ?? this.effectiveConfig().autofocus);
  readonly finalMaxCharacters = computed(
    () => this.maxCharacters() ?? this.effectiveConfig().maxCharacters
  );
  readonly finalShowCharacterCount = computed(
    () => this.showCharacterCount() ?? this.effectiveConfig().showCharacterCount ?? true
  );
  readonly finalShowWordCount = computed(
    () => this.showWordCount() ?? this.effectiveConfig().showWordCount ?? true
  );
  readonly finalLocale = computed(
    () => (this.locale() as SupportedLocale) ?? (this.effectiveConfig().locale as SupportedLocale)
  );

  // Extensions & Options
  readonly finalTiptapExtensions = computed(
    () => this.tiptapExtensions() ?? this.effectiveConfig().tiptapExtensions ?? []
  );

  readonly finalTiptapOptions = computed(
    () => this.tiptapOptions() ?? this.effectiveConfig().tiptapOptions ?? {}
  );

  readonly finalStateCalculators = computed(
    () => this.stateCalculators() ?? this.effectiveConfig().stateCalculators ?? []
  );

  readonly finalAngularNodesConfig = computed(() => this.effectiveConfig().angularNodes ?? []);

  // Image Upload
  readonly finalImageUploadConfig = computed(() => {
    const fromInput = this.imageUpload();
    const fromConfig = this.effectiveConfig().imageUpload;
    const base = ATE_DEFAULT_IMAGE_UPLOAD_CONFIG;

    const merged = {
      ...base,
      ...fromConfig,
      ...fromInput,
    };

    return {
      ...merged,
      maxSize: (merged.maxSize ?? 5) * 1024 * 1024, // Convert MB to bytes for internal service
    };
  });

  readonly finalImageUploadHandler = computed(
    () => this.imageUploadHandler() ?? this.effectiveConfig().imageUpload?.handler
  );

  // Computed for current translations (allows per-instance override via config or input)
  readonly currentTranslations = computed(() => {
    const localeOverride = this.finalLocale();
    if (localeOverride) {
      const allTranslations = this.i18nService.allTranslations();
      return allTranslations[localeOverride] || this.i18nService.translations();
    }
    return this.i18nService.translations();
  });

  private _destroyRef = inject(DestroyRef);
  // NgControl for management of FormControls
  private ngControl = inject(NgControl, { self: true, optional: true });

  readonly i18nService = inject(AteI18nService);
  readonly editorCommandsService = inject(AteEditorCommandsService);
  // Access editor state via service
  readonly editorState = this.editorCommandsService.editorState;
  private injector = inject(Injector);
  private globalConfig = inject(ATE_GLOBAL_CONFIG, { optional: true });

  /**
   * Final merged configuration.
   * Priority: Input [config] > Global config via provideAteEditor()
   */
  readonly effectiveConfig = computed(() => {
    const fromInput = this.config();
    const fromGlobal = this.globalConfig || {};
    return { ...ATE_DEFAULT_CONFIG, ...fromGlobal, ...fromInput };
  });

  constructor() {
    // Effect to update editor content (with anti-echo)
    effect(() => {
      const content = this.content(); // Sole reactive dependency

      untracked(() => {
        const editor = this.editor();
        const hasFormControl = !!(this.ngControl as { control?: unknown })?.control;

        if (!editor || content === undefined) {
          return;
        }

        // Anti-écho : on ignore ce qu'on vient d'émettre nous-mêmes
        if (content === this.lastEmittedHtml) {
          return;
        }

        // Double sécurité : on vérifie le contenu actuel de l'éditeur
        if (content === editor.getHTML()) {
          return;
        }

        // Do not overwrite content if we have a FormControl and content is empty
        if (hasFormControl && !content) {
          return;
        }

        editor.commands.setContent(content, { emitUpdate: false });
      });
    });

    // Effect to update height properties
    effect(() => {
      const minHeight = this.finalMinHeight();
      const height = this.finalHeight();
      const maxHeight = this.finalMaxHeight();
      const element = this.editorElement()?.nativeElement;

      // Automatically calculate if scroll is needed
      const needsScroll = height !== undefined || maxHeight !== undefined;

      if (element) {
        element.style.setProperty("--editor-min-height", minHeight ?? "auto");
        element.style.setProperty("--editor-height", height ?? "auto");
        element.style.setProperty("--editor-max-height", maxHeight ?? "none");
        element.style.setProperty("--editor-overflow", needsScroll ? "auto" : "visible");
      }
    });

    // Effect to monitor editability changes
    effect(() => {
      const currentEditor = this.editor();
      // An editor is "editable" if it's not disabled and editable mode is ON
      const isEditable = this.finalEditable() && !this.mergedDisabled();
      // An editor is "readonly" if it's explicitly non-editable and not disabled
      // const isReadOnly = !this.finalEditable() && !this.mergedDisabled(); // Unused variable

      if (currentEditor) {
        this.editorCommandsService.setEditable(currentEditor, isEditable);
      }
    });

    // Effect to synchronize image upload handler with the service
    effect(() => {
      const handler = this.finalImageUploadHandler();
      this.editorCommandsService.uploadHandler = handler || null;
    });

    // Effect to update character count limit dynamically
    effect(() => {
      const editor = this.editor();
      const limit = this.finalMaxCharacters();

      if (editor && editor.extensionManager) {
        const characterCountExtension = editor.extensionManager.extensions.find(
          ext => ext.name === "characterCount"
        );

        if (characterCountExtension) {
          characterCountExtension.options.limit = limit;
        }
      }
    });

    // Effect to re-initialize editor when technical configuration changes
    effect(() => {
      // Monitor technical dependencies
      this.finalTiptapExtensions();
      this.finalTiptapOptions();
      this.finalAngularNodesConfig();

      untracked(() => {
        // Only if already initialized (post AfterViewInit)
        if (this.editorFullyInitialized()) {
          const currentEditor = this.editor();
          if (currentEditor) {
            currentEditor.destroy();
            this._editorFullyInitialized.set(false);
            this.initEditor();
          }
        }
      });
    });
  }

  ngAfterViewInit() {
    // La vue est déjà complètement initialisée dans ngAfterViewInit
    // Initialiser l'éditeur
    this.initEditor();

    // S'abonner aux changements du FormControl
    this.setupFormControlSubscription();
  }

  ngOnDestroy() {
    const currentEditor = this.editor();
    if (currentEditor) {
      currentEditor.destroy();
    }
    this._editorFullyInitialized.set(false);
  }

  private initEditor() {
    const extensions: (Extension | Node | Mark)[] = [
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: "ate-link",
          },
        },
      }),
      TextStyle,
      Color.configure({
        types: ["textStyle"],
      }),
      Placeholder.configure({
        placeholder: this.finalPlaceholder(),
      }),
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ["heading", "paragraph", "resizableImage"],
      }),
      AteLinkClickBehavior,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: "ate-highlight",
        },
      }),
      AteResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "ate-image",
        },
      }),
      AteUploadProgress.configure({
        isUploading: () => this.editorCommandsService.isUploading(),
        uploadProgress: () => this.editorCommandsService.uploadProgress(),
        uploadMessage: () => this.editorCommandsService.uploadMessage(),
      }),
      AteTableExtension,
      AteTiptapStateExtension.configure({
        onUpdate: state => this.editorCommandsService.updateState(state),
        calculators: [
          AteSelectionCalculator,
          AteMarksCalculator,
          AteTableCalculator,
          AteImageCalculator,
          AteStructureCalculator,
          AteDiscoveryCalculator,
          ...this.finalStateCalculators(),
        ],
      }),
    ];

    // Ajouter l'extension Office Paste si activée
    if (this.finalEnableOfficePaste()) {
      extensions.push(
        OfficePaste.configure({
          // Configuration par défaut pour une meilleure compatibilité
          transformPastedHTML: true,
          transformPastedText: true,
        })
      );
    }

    if (this.finalShowCharacterCount() || this.finalShowWordCount()) {
      extensions.push(
        CharacterCount.configure({
          limit: this.finalMaxCharacters(),
        })
      );
    }

    // Register automatic node views from config
    const autoNodeViews = this.finalAngularNodesConfig();
    autoNodeViews.forEach((reg: AteAngularNode) => {
      const options =
        typeof reg === "function"
          ? { component: reg as Type<unknown> }
          : (reg as RegisterAngularComponentOptions<unknown>);

      try {
        const extension = registerAngularComponent(this.injector, options);
        extensions.push(extension);
      } catch (e) {
        console.error("[ATE] Failed to auto-register node view:", e);
      }
    });

    // Allow addition of custom extensions, but avoid duplicates by filtering by name
    const customExtensions = this.finalTiptapExtensions();
    if (customExtensions.length > 0) {
      const existingNames = new Set(
        extensions
          .map((ext: Extension | Node | Mark) => (ext as { name?: string })?.name)
          .filter((name): name is string => !!name)
      );

      const toAdd = customExtensions.filter((ext: Extension | Node | Mark) => {
        const name = (ext as { name?: string })?.name;
        return !name || !existingNames.has(name);
      });

      extensions.push(...toAdd);
    }

    // Also allow any tiptap user options
    const userOptions = this.finalTiptapOptions();

    const newEditor = new Editor({
      ...userOptions,
      element: this.editorElement().nativeElement,
      extensions: extensions,
      content: this.content(),
      editable: this.finalEditable() && !this.mergedDisabled(),
      autofocus: this.finalAutofocus(),
      editorProps: {
        attributes: {
          spellcheck: this.finalSpellcheck().toString(),
        },
      },
      onUpdate: ({ editor, transaction }) => {
        const html = editor.getHTML();

        // Anti-écho : mémoriser ce qu'on émet pour éviter la boucle
        this.lastEmittedHtml = html;

        this.contentChange.emit(html);
        // Mettre à jour le FormControl si il existe
        if (
          (
            this.ngControl as {
              control?: { setValue: (value: string, options: { emitEvent: boolean }) => void };
            }
          )?.control
        ) {
          (
            this.ngControl as {
              control: { setValue: (value: string, options: { emitEvent: boolean }) => void };
            }
          ).control.setValue(html, {
            emitEvent: false,
          });
        }
        this.editorUpdate.emit({ editor, transaction });
        this.updateCharacterCount(editor);
      },
      onCreate: ({ editor }) => {
        this.editorCreated.emit(editor);
        this.updateCharacterCount(editor);

        // Marquer l'éditeur comme complètement initialisé après un court délai
        // pour s'assurer que tous les plugins et extensions sont prêts
        setTimeout(() => {
          this._editorFullyInitialized.set(true);
        }, 100);
      },
      onFocus: ({ editor, event }) => {
        this.editorFocus.emit({ editor, event });
      },
      onBlur: ({ editor, event }) => {
        // Marquer le FormControl comme touché si il existe
        if ((this.ngControl as { control?: { markAsTouched: () => void } })?.control) {
          (this.ngControl as { control: { markAsTouched: () => void } }).control.markAsTouched();
        }
        this.editorBlur.emit({ editor, event });
      },
    });

    // Stocker la référence de l'éditeur immédiatement
    this._editor.set(newEditor);
  }

  toggleEditMode(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const newEditable = !this.finalEditable();
    this.editableChange.emit(newEditable);
  }

  private updateCharacterCount(editor: Editor) {
    if (
      (this.finalShowCharacterCount() || this.finalShowWordCount()) &&
      editor.storage["characterCount"]
    ) {
      const storage = editor.storage["characterCount"];
      this._characterCount.set(storage.characters());
      this._wordCount.set(storage.words());
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this._isDragOver.set(true);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this._isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        this.insertImageFromFile(file);
      }
    }
  }

  private async insertImageFromFile(file: File) {
    const currentEditor = this.editor();
    if (currentEditor) {
      try {
        const config = this.finalImageUploadConfig();
        await this.editorCommandsService.uploadImage(currentEditor, file, {
          quality: config.quality,
          maxWidth: config.maxWidth,
          maxHeight: config.maxHeight,
        });
      } catch (_e) {
        /* ignore */
      }
    }
  }

  // Public methods
  getHTML(): string {
    return this.editor()?.getHTML() || "";
  }

  getJSON(): JSONContent | undefined {
    return this.editor()?.getJSON();
  }

  getText(): string {
    return this.editor()?.getText() || "";
  }

  setContent(content: string, emitUpdate = true) {
    const editor = this.editor();
    if (editor) {
      this.editorCommandsService.setContent(editor, content, emitUpdate);
    }
  }

  focus() {
    const editor = this.editor();
    if (editor) {
      this.editorCommandsService.focus(editor);
    }
  }

  blur() {
    const editor = this.editor();
    if (editor) {
      this.editorCommandsService.blur(editor);
    }
  }

  clearContent() {
    const editor = this.editor();
    if (editor) {
      this.editorCommandsService.clearContent(editor);
    }
  }

  // Méthode publique pour obtenir l'éditeur
  getEditor(): Editor | null {
    return this.editor();
  }

  private setupFormControlSubscription(): void {
    const control = (
      this.ngControl as {
        control?: {
          value: string;
          valueChanges: Observable<string>;
          status: string;
          statusChanges: Observable<string>;
        };
      }
    )?.control;
    if (control) {
      // Synchronize form control value with editor content
      const formValue$: Observable<string> = concat(
        defer(() => of(control.value)),
        control.valueChanges
      );

      formValue$
        .pipe(
          tap((value: string) => {
            const editor = this.editor();
            if (editor) {
              this.setContent(value, false);
            }
          }),
          takeUntilDestroyed(this._destroyRef)
        )
        .subscribe();

      // Synchronize form control status with editor disabled state
      const formStatus$: Observable<string> = concat(
        defer(() => of(control.status)),
        control.statusChanges
      );

      formStatus$
        .pipe(
          tap((status: string) => {
            this._isFormControlDisabled.set(status === "DISABLED");
          }),
          takeUntilDestroyed(this._destroyRef)
        )
        .subscribe();
    }
  }

  onEditorClick(event: Event) {
    const editor = this.editor();
    if (!editor) {
      return;
    }

    // In read-only mode, handle clearing of node selection
    if (!this.finalEditable()) {
      const target = event.target as HTMLElement;
      const editorElement = this.editorElement()?.nativeElement;
      if (target === editorElement || target.classList.contains("ate-content")) {
        // Clear selection to hide bubble menus
        editor.commands.setTextSelection(0);
      }
      return;
    }

    // Verify if interaction is on the container element and not on the content
    const target = event.target as HTMLElement;
    const editorElement = this.editorElement()?.nativeElement;

    if (target === editorElement || target.classList.contains("ate-content")) {
      // Interaction in the empty space, position the cursor at the end
      setTimeout(() => {
        const { doc } = editor.state;
        const endPos = doc.content.size;
        editor.commands.setTextSelection(endPos);
        editor.commands.focus();
      }, 0);
    }
  }

  // Methods for table edit button - Removed as replaced by bubble menu
}
