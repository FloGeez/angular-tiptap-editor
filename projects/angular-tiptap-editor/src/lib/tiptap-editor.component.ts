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
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { Editor, EditorOptions, Extension, Node, Mark } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import Underline from "@tiptap/extension-underline";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import OfficePaste from "@intevation/tiptap-extension-office-paste";

import { ResizableImage } from "./extensions/resizable-image.extension";
import { UploadProgress } from "./extensions/upload-progress.extension";
import { TableExtension } from "./extensions/table.extension";
import { TiptapStateExtension } from "./extensions/tiptap-state.extension";
import { TiptapToolbarComponent } from "./tiptap-toolbar.component";
import { TiptapBubbleMenuComponent } from "./tiptap-bubble-menu.component";
import { TiptapImageBubbleMenuComponent } from "./tiptap-image-bubble-menu.component";
import { TiptapTableBubbleMenuComponent } from "./tiptap-table-bubble-menu.component";
import { TiptapCellBubbleMenuComponent } from "./tiptap-cell-bubble-menu.component";
import { TiptapLinkBubbleMenuComponent } from "./tiptap-link-bubble-menu.component";
import {
  TiptapSlashCommandsComponent,
  CustomSlashCommands,
} from "./tiptap-slash-commands.component";
import { ImageService, ImageUploadHandler } from "./services/image.service";
import { TiptapI18nService, SupportedLocale } from "./services/i18n.service";
import { EditorCommandsService } from "./services/editor-commands.service";
import { ColorPickerService } from "./services/color-picker.service";
import { NoopValueAccessorDirective } from "./noop-value-accessor.directive";
import {
  StateCalculator
} from "./models/editor-state.model";
import { NgControl } from "@angular/forms";
import {
  filterSlashCommands,
  SlashCommandsConfig,
} from "./config/slash-commands.config";

import { SelectionCalculator } from "./extensions/calculators/selection.calculator";
import { MarksCalculator } from "./extensions/calculators/marks.calculator";
import { TableCalculator } from "./extensions/calculators/table.calculator";
import { ImageCalculator } from "./extensions/calculators/image.calculator";
import { StructureCalculator } from "./extensions/calculators/structure.calculator";
import { DiscoveryCalculator } from "./extensions/calculators/discovery.calculator";

import { ToolbarConfig } from "./models/toolbar.model";
import {
  BubbleMenuConfig,
  ImageBubbleMenuConfig,
  TableBubbleMenuConfig,
  CellBubbleMenuConfig,
} from "./models/bubble-menu.model";
import {
  DEFAULT_TOOLBAR_CONFIG,
  DEFAULT_BUBBLE_MENU_CONFIG,
  DEFAULT_IMAGE_BUBBLE_MENU_CONFIG,
  DEFAULT_TABLE_MENU_CONFIG,
} from "./config/editor.config";
import { concat, defer, of, tap } from "rxjs";

// Slash commands configuration is handled dynamically via slashCommandsConfigComputed

@Component({
  selector: "angular-tiptap-editor",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  hostDirectives: [NoopValueAccessorDirective],
  host: {
    '[class.fill-container]': 'fillContainer()',
  },
  imports: [
    TiptapToolbarComponent,
    TiptapBubbleMenuComponent,
    TiptapImageBubbleMenuComponent,
    TiptapTableBubbleMenuComponent,
    TiptapCellBubbleMenuComponent,
    TiptapSlashCommandsComponent,
    TiptapLinkBubbleMenuComponent,
  ],
  providers: [
    EditorCommandsService,
    ImageService,
    TiptapI18nService,
    ColorPickerService,
  ],
  template: `
    <div class="tiptap-editor" [class.fill-container]="fillContainer()">
      <!-- Toolbar -->
      @if (showToolbar() && editor()) {
      <tiptap-toolbar 
        [editor]="editor()!" 
        [config]="toolbarConfig()"
        [imageUpload]="imageUploadConfig()"
        (mouseenter)="hideBubbleMenus()"
        (mouseleave)="showBubbleMenus()"
      />
      }

      <!-- Editor Content -->
      <div
        #editorElement
        class="tiptap-content"
        [class.drag-over]="isDragOver()"
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event)"
        (click)="onEditorClick($event)"
      ></div>

      <!-- Text Bubble Menu -->
      @if (showBubbleMenu() && editor()) {
      <tiptap-bubble-menu
        [editor]="editor()!"
        [config]="bubbleMenuConfig()"
        [style.display]="editorFullyInitialized() ? 'block' : 'none'"
      ></tiptap-bubble-menu>
      }

      <!-- Image Bubble Menu -->
      @if (showImageBubbleMenu() && editor()) {
      <tiptap-image-bubble-menu
        [editor]="editor()!"
        [config]="imageBubbleMenuConfig()"
        [style.display]="editorFullyInitialized() ? 'block' : 'none'"
      ></tiptap-image-bubble-menu>
      }

      <!-- Link Bubble Menu -->
      @if (editor()) {
      <tiptap-link-bubble-menu
        [editor]="editor()!"
        [style.display]="editorFullyInitialized() ? 'block' : 'none'"
      ></tiptap-link-bubble-menu>
      }

      <!-- Slash Commands -->
      @if (enableSlashCommands() && editor()) {
      <tiptap-slash-commands
        [editor]="editor()!"
        [config]="slashCommandsConfigComputed()"
        [style.display]="editorFullyInitialized() ? 'block' : 'none'"
      ></tiptap-slash-commands>
      }

      <!-- Table Menu -->
      @if (editor()) {
      <tiptap-table-bubble-menu
        [editor]="editor()!"
        [config]="tableBubbleMenuConfig()"
        [style.display]="editorFullyInitialized() ? 'block' : 'none'"
      ></tiptap-table-bubble-menu>
      }

      <!-- Cell Menu -->
      @if (editor()) {
      <tiptap-cell-bubble-menu
        [editor]="editor()!"
        [config]="cellBubbleMenuConfig()"
        [style.display]="editorFullyInitialized() ? 'block' : 'none'"
      ></tiptap-cell-bubble-menu>
      }

      <!-- Counters -->
      @if (showCharacterCount() || showWordCount()) {
      <div class="character-count" [class.limit-reached]="maxCharacters() && characterCount() >= maxCharacters()!">
        @if (showCharacterCount()) {
          {{ characterCount() }}
          {{ i18nService.editor().character }}{{ characterCount() > 1 ? "s" : "" }}
          @if (maxCharacters()) {
            / {{ maxCharacters() }}
          }
        }
        
        @if (showCharacterCount() && showWordCount()) {
          , 
        }

        @if (showWordCount()) {
          {{ wordCount() }}
          {{ i18nService.editor().word }}{{ wordCount() > 1 ? "s" : "" }}
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

        /* ===== MENUS (Slash/Bubble) ===== */
        --ate-menu-bg: rgba(255, 255, 255, 0.98);
        --ate-menu-border: var(--ate-border);
        --ate-menu-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        --ate-menu-blur: 16px;

        --ate-error-color: #c53030;
        --ate-error-bg: #fed7d7;
        --ate-error-border: #feb2b2;
        
        /* ===== COMPONENT TOKENS (use base tokens by default) ===== */
        /* Border & Container */
        --ate-border-color: var(--ate-border);
        --ate-border-width: 2px;
        --ate-border-radius: 8px;
        --ate-focus-color: var(--ate-primary);
        --ate-background: var(--ate-surface);
        
        /* Content */
        --ate-text-color: var(--ate-text);
        --ate-placeholder-color: var(--ate-text-muted);
        --ate-line-height: 1.6;
        --ate-content-padding: 16px;
        
        /* Toolbar */
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
        --ate-code-block-background: #181825;
        --ate-code-block-color: #e2e8f0;
        --ate-code-border-color: var(--ate-border);
        --ate-code-block-border-color: var(--ate-border);
        
        /* Images */
        --ate-image-border-radius: 8px;
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
        --ate-menu-bg: rgba(15, 23, 42, 0.95);
        --ate-menu-border: rgba(255, 255, 255, 0.1);
        --ate-menu-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
        --ate-menu-blur: 16px;

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
      .tiptap-editor {
        border: var(--ate-border-width) solid var(--ate-border-color);
        border-radius: var(--ate-border-radius);
        background: var(--ate-background);
        overflow: hidden;
        transition: border-color 0.2s ease;
        position: relative;
      }

      /* Fill container mode - editor fills its parent */
      .tiptap-editor.fill-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .tiptap-editor.fill-container .tiptap-content {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
      }

      .tiptap-editor:focus-within {
        border-color: var(--ate-focus-color);
      }

      /* Editor content area */
      .tiptap-content {
        padding: var(--ate-content-padding);
        min-height: var(--editor-min-height, 200px);
        height: var(--editor-height, auto);
        max-height: var(--editor-max-height, none);
        overflow-y: var(--editor-overflow, visible);
        outline: none;
        position: relative;
        scrollbar-width: thin;
        scrollbar-color: var(--ate-scrollbar-thumb) var(--ate-scrollbar-track);
      }

      .tiptap-content::-webkit-scrollbar {
        width: var(--ate-scrollbar-width);
        height: var(--ate-scrollbar-width);
      }

      .tiptap-content::-webkit-scrollbar-track {
        background: var(--ate-scrollbar-track);
      }

      .tiptap-content::-webkit-scrollbar-thumb {
        background: var(--ate-scrollbar-thumb);
        border: 3px solid transparent;
        background-clip: content-box;
        border-radius: 10px;
      }

      .tiptap-content::-webkit-scrollbar-thumb:hover {
        background: var(--ate-scrollbar-thumb-hover);
        background-clip: content-box;
      }

      .tiptap-content.drag-over {
        background: var(--ate-drag-background);
        border: 2px dashed var(--ate-drag-border-color);
      }

      /* Compteur de caractères */
      .character-count {
        padding: 8px var(--ate-content-padding);
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
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: "Monaco", "Consolas", monospace;
        font-size: 0.9em;
      }

      :host ::ng-deep .ProseMirror pre {
        background: var(--ate-code-block-background);
        color: var(--ate-code-block-color);
        border: 1px solid var(--ate-code-block-border-color);
        padding: 1em;
        border-radius: 6px;
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
        pointer-events: none;
      }

      :host ::ng-deep .ProseMirror[contenteditable="false"] img {
        cursor: default;
        pointer-events: none;
      }

      :host ::ng-deep .ProseMirror[contenteditable="false"] img:hover {
        transform: none;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      :host
        ::ng-deep
        .ProseMirror[contenteditable="false"]
        img.ProseMirror-selectednode {
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

      :host ::ng-deep .ProseMirror img.ProseMirror-selectednode {
        border-color: var(--ate-image-selected-color);
        box-shadow: 0 0 0 3px var(--ate-primary-light-alpha);
        transition: all 0.2s ease;
      }

      /* Images avec classe tiptap-image */
      :host ::ng-deep .ProseMirror .tiptap-image {
        max-width: 100%;
        height: auto;
        border-radius: 16px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        margin: 0.5em 0;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: block;
        filter: brightness(1) contrast(1);
      }

      :host ::ng-deep .ProseMirror .tiptap-image:hover {
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        filter: brightness(1.02) contrast(1.02);
      }

      :host ::ng-deep .ProseMirror .tiptap-image.ProseMirror-selectednode {
        outline: 2px solid var(--ate-primary);
        outline-offset: 2px;
        border-radius: 16px;
        box-shadow: 0 0 0 4px var(--ate-primary-light-alpha);
      }

      /* Conteneurs d'images avec alignement */
      :host ::ng-deep .image-container {
        margin: 0.5em 0;
        text-align: center;
        border-radius: 16px;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      :host ::ng-deep .image-container.image-align-left {
        text-align: left;
      }

      :host ::ng-deep .image-container.image-align-center {
        text-align: center;
      }

      :host ::ng-deep .image-container.image-align-right {
        text-align: right;
      }

      :host ::ng-deep .image-container img {
        display: inline-block;
        max-width: 100%;
        height: auto;
        border-radius: 16px;
      }

      /* Conteneur pour les images redimensionnables */
      :host ::ng-deep .resizable-image-container {
        position: relative;
        display: inline-block;
        margin: 0.5em 0;
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
      }

      /* Poignées de redimensionnement */
      :host ::ng-deep .resize-handle {
        position: absolute;
        width: 12px;
        height: 12px;
        background: var(--ate-primary);
        border: 2px solid var(--ate-surface);
        border-radius: 50%;
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

      /* Poignées du milieu avec scale séparé */
      :host ::ng-deep .resize-handle-n:hover,
      :host ::ng-deep .resize-handle-s:hover {
        transform: translateX(-50%) scale(1.2);
      }

      :host ::ng-deep .resize-handle-w:hover,
      :host ::ng-deep .resize-handle-e:hover {
        transform: translateY(-50%) scale(1.2);
      }

      :host ::ng-deep .resize-handle-n:active,
      :host ::ng-deep .resize-handle-s:active {
        transform: translateX(-50%) scale(0.9);
      }

      :host ::ng-deep .resize-handle-w:active,
      :host ::ng-deep .resize-handle-e:active {
        transform: translateY(-50%) scale(0.9);
      }

      /* Poignées des coins avec scale simple */
      :host ::ng-deep .resize-handle-nw:hover,
      :host ::ng-deep .resize-handle-ne:hover,
      :host ::ng-deep .resize-handle-sw:hover,
      :host ::ng-deep .resize-handle-se:hover {
        transform: scale(1.2);
      }

      :host ::ng-deep .resize-handle-nw:active,
      :host ::ng-deep .resize-handle-ne:active,
      :host ::ng-deep .resize-handle-sw:active,
      :host ::ng-deep .resize-handle-se:active {
        transform: scale(0.9);
      }

      /* Positions spécifiques pour chaque poignée */
      :host ::ng-deep .resize-handle-nw {
        top: 0;
        left: -6px;
        cursor: nw-resize;
      }
      :host ::ng-deep .resize-handle-n {
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        cursor: n-resize;
      }
      :host ::ng-deep .resize-handle-ne {
        top: 0;
        right: -6px;
        cursor: ne-resize;
      }
      :host ::ng-deep .resize-handle-w {
        top: 50%;
        left: -6px;
        transform: translateY(-50%);
        cursor: w-resize;
      }
      :host ::ng-deep .resize-handle-e {
        top: 50%;
        right: -6px;
        transform: translateY(-50%);
        cursor: e-resize;
      }
      :host ::ng-deep .resize-handle-sw {
        bottom: 0;
        left: -6px;
        cursor: sw-resize;
      }
      :host ::ng-deep .resize-handle-s {
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        cursor: s-resize;
      }
      :host ::ng-deep .resize-handle-se {
        bottom: 0;
        right: -6px;
        cursor: se-resize;
      }

      /* Styles pour le redimensionnement en cours */
      :host ::ng-deep body.resizing {
        user-select: none;
        cursor: crosshair;
      }

      :host ::ng-deep body.resizing .ProseMirror {
        pointer-events: none;
      }

      :host ::ng-deep body.resizing .ProseMirror .tiptap-image {
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

      :host ::ng-deep .image-container:hover .image-size-info {
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
  content = input<string>("");
  placeholder = input<string>("");
  editable = input<boolean>(true);
  minHeight = input<number>(200);
  height = input<number | undefined>(undefined);
  maxHeight = input<number | undefined>(undefined);
  fillContainer = input<boolean>(false);
  showToolbar = input<boolean>(true);
  showCharacterCount = input<boolean>(true);
  showWordCount = input<boolean>(true);
  maxCharacters = input<number | undefined>(undefined);
  enableOfficePaste = input<boolean>(true);
  enableSlashCommands = input<boolean>(true);
  slashCommands = input<SlashCommandsConfig>({});
  customSlashCommands = input<CustomSlashCommands | undefined>(undefined);
  locale = input<SupportedLocale | undefined>(undefined);
  autofocus = input<boolean | 'start' | 'end' | 'all' | number>(false);

  tiptapExtensions = input<(Extension | Node | Mark)[]>([]);
  tiptapOptions = input<Partial<EditorOptions>>({});

  // Nouveaux inputs pour les bubble menus
  showBubbleMenu = input<boolean>(true);
  bubbleMenu = input<Partial<BubbleMenuConfig>>(DEFAULT_BUBBLE_MENU_CONFIG);
  showImageBubbleMenu = input<boolean>(true);
  imageBubbleMenu = input<Partial<ImageBubbleMenuConfig>>(
    DEFAULT_IMAGE_BUBBLE_MENU_CONFIG
  );

  // Nouveau input pour la configuration de la toolbar
  toolbar = input<Partial<ToolbarConfig>>({});

  /**
   * Additionnal state calculators to extend the reactive editor state.
   */
  stateCalculators = input<StateCalculator[]>([]);

  // Nouveau input pour la configuration de l'upload d'images
  imageUpload = input<Partial<any>>({});

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
  imageUploadHandler = input<ImageUploadHandler | undefined>(undefined);

  // Nouveaux outputs
  contentChange = output<string>();
  editorCreated = output<Editor>();
  editorUpdate = output<{ editor: Editor; transaction: any }>();
  editorFocus = output<{ editor: Editor; event: FocusEvent }>();
  editorBlur = output<{ editor: Editor; event: FocusEvent }>();

  // ViewChild avec signal
  editorElement = viewChild.required<ElementRef>("editorElement");

  // Signaux pour les menus (Références vers les composants)
  private textMenuComp = viewChild(TiptapBubbleMenuComponent);
  private imageMenuComp = viewChild(TiptapImageBubbleMenuComponent);
  private tableMenuComp = viewChild(TiptapTableBubbleMenuComponent);
  private cellMenuComp = viewChild(TiptapCellBubbleMenuComponent);
  private slashMenuComp = viewChild(TiptapSlashCommandsComponent);
  private linkMenuComp = viewChild(TiptapLinkBubbleMenuComponent);

  hideBubbleMenus() {
    this.textMenuComp()?.setToolbarInteracting(true);
    this.imageMenuComp()?.setToolbarInteracting(true);
    this.tableMenuComp()?.setToolbarInteracting(true);
    this.cellMenuComp()?.setToolbarInteracting(true);
    this.slashMenuComp()?.setToolbarInteracting(true);
    this.linkMenuComp()?.setToolbarInteracting(true);
  }

  showBubbleMenus() {
    this.textMenuComp()?.setToolbarInteracting(false);
    this.imageMenuComp()?.setToolbarInteracting(false);
    this.tableMenuComp()?.setToolbarInteracting(false);
    this.cellMenuComp()?.setToolbarInteracting(false);
    this.slashMenuComp()?.setToolbarInteracting(false);
    this.linkMenuComp()?.setToolbarInteracting(false);
  }

  // Signals privés pour l'état interne
  private _editor = signal<Editor | null>(null);
  private _characterCount = signal<number>(0);
  private _wordCount = signal<number>(0);
  private _isDragOver = signal<boolean>(false);
  private _editorFullyInitialized = signal<boolean>(false);

  // Accès en lecture seule aux signaux
  readonly editor = this._editor.asReadonly();
  readonly characterCount = this._characterCount.asReadonly();
  readonly wordCount = this._wordCount.asReadonly();
  readonly isDragOver = this._isDragOver.asReadonly();
  readonly editorFullyInitialized = this._editorFullyInitialized.asReadonly();

  // Computed pour les états de l'éditeur
  isEditorReady = computed(() => this.editor() !== null);

  // Computed pour la configuration de la toolbar
  toolbarConfig = computed(() =>
    Object.keys(this.toolbar()).length === 0
      ? DEFAULT_TOOLBAR_CONFIG
      : this.toolbar()
  );

  // Computed pour la configuration du bubble menu
  bubbleMenuConfig = computed(() =>
    Object.keys(this.bubbleMenu()).length === 0
      ? DEFAULT_BUBBLE_MENU_CONFIG
      : { ...DEFAULT_BUBBLE_MENU_CONFIG, ...this.bubbleMenu() }
  );

  // Computed pour la configuration du bubble menu image
  imageBubbleMenuConfig = computed(() =>
    Object.keys(this.imageBubbleMenu()).length === 0
      ? DEFAULT_IMAGE_BUBBLE_MENU_CONFIG
      : { ...DEFAULT_IMAGE_BUBBLE_MENU_CONFIG, ...this.imageBubbleMenu() }
  );

  // Computed pour la configuration du bubble menu table
  tableBubbleMenuConfig = computed(() => ({
    addRowBefore: true,
    addRowAfter: true,
    deleteRow: true,
    addColumnBefore: true,
    addColumnAfter: true,
    deleteColumn: true,
    deleteTable: true,
    toggleHeaderRow: true,
    toggleHeaderColumn: true,
  }));

  // Computed pour la configuration du menu de cellules
  cellBubbleMenuConfig = computed(() => ({
    mergeCells: true,
    splitCell: true,
  }));

  // Computed pour la configuration de l'upload d'images
  imageUploadConfig = computed(() => ({
    maxSize: 5,
    maxWidth: 1920,
    maxHeight: 1080,
    allowedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    enableDragDrop: true,
    showPreview: true,
    multiple: false,
    compressImages: true,
    quality: 0.8,
    ...this.imageUpload(),
  }));

  // Computed pour la configuration des slash commands
  slashCommandsConfigComputed = computed(() => {
    const customConfig = this.customSlashCommands();
    if (customConfig) {
      return customConfig;
    }

    // Utilise l'utilitaire filterSlashCommands qui gère maintenant 
    // les défauts, le filtrage et l'ajout de commandes personnalisées
    return {
      commands: filterSlashCommands(this.slashCommands(), this.i18nService, this.editorCommandsService, this.imageUploadConfig()),
    };
  });

  private _destroyRef = inject(DestroyRef);
  // NgControl pour gérer les FormControls
  private ngControl = inject(NgControl, { self: true, optional: true });

  readonly i18nService = inject(TiptapI18nService);
  readonly editorCommandsService = inject(EditorCommandsService);
  readonly editorState = this.editorCommandsService.editorState;

  constructor() {
    // Effet pour gérer le changement de langue
    effect(() => {
      const locale = this.locale();
      if (locale) {
        this.i18nService.setLocale(locale);
      }
    });

    // Effet pour mettre à jour le contenu de l'éditeur
    effect(() => {
      const editor = this.editor();
      const content = this.content();
      const hasFormControl = !!(this.ngControl as any)?.control;

      // Ne pas écraser le contenu si on a un FormControl et que le content est vide
      if (editor && content !== undefined && content !== editor.getHTML()) {
        if (hasFormControl && !content) {
          return;
        }
        this.setContent(content, false);
      }
    });

    // Effet pour mettre à jour les propriétés de hauteur
    effect(() => {
      const minHeight = this.minHeight();
      const height = this.height();
      const maxHeight = this.maxHeight();
      const element = this.editorElement()?.nativeElement;

      // Calculer automatiquement si le scroll est nécessaire
      const needsScroll = height !== undefined || maxHeight !== undefined;

      if (element) {
        element.style.setProperty("--editor-min-height", `${minHeight}px`);
        element.style.setProperty(
          "--editor-height",
          height ? `${height}px` : "auto"
        );
        element.style.setProperty(
          "--editor-max-height",
          maxHeight ? `${maxHeight}px` : "none"
        );
        element.style.setProperty(
          "--editor-overflow",
          needsScroll ? "auto" : "visible"
        );
      }
    });

    // Effect to monitor editability changes
    effect(() => {
      const currentEditor = this.editor();
      const isEditable = this.editable();

      if (currentEditor) {
        this.editorCommandsService.setEditable(currentEditor, isEditable);
      }
    });

    // Effect to synchronize image upload handler with the service
    effect(() => {
      const handler = this.imageUploadHandler();
      this.editorCommandsService.uploadHandler = handler || null;
    });

    // Effect for table hover detection
    effect(() => {
      const currentEditor = this.editor();
      if (!currentEditor) return;

      // Table hover detection removed (replaced by bubble menu)
    });

    // Effect to update character count limit dynamically
    effect(() => {
      const editor = this.editor();
      const limit = this.maxCharacters();

      if (editor && editor.extensionManager) {
        const characterCountExtension = editor.extensionManager.extensions.find(
          (ext) => ext.name === "characterCount"
        );

        if (characterCountExtension) {
          characterCountExtension.options.limit = limit;
          // Force TipTap to recognize the option change if possible
          // Some extensions need re-creation, but characterCount plugin 
          // reads this.options.limit in its filterTransaction.
        }
      }
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
      StarterKit,
      TextStyle,
      Color.configure({
        types: ["textStyle"],
      }),
      Placeholder.configure({
        placeholder:
          this.placeholder() || this.i18nService.editor().placeholder,
      }),
      Underline,
      Superscript,
      Subscript,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "tiptap-link",
        },
      }),
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: "tiptap-highlight",
        },
      }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }),
      UploadProgress.configure({
        isUploading: () => this.editorCommandsService.isUploading(),
        uploadProgress: () => this.editorCommandsService.uploadProgress(),
        uploadMessage: () => this.editorCommandsService.uploadMessage(),
      }),
      TableExtension,
      TiptapStateExtension.configure({
        onUpdate: (state) => this.editorCommandsService.updateState(state),
        calculators: [
          SelectionCalculator,
          MarksCalculator,
          TableCalculator,
          ImageCalculator,
          StructureCalculator,
          DiscoveryCalculator,
          ...this.stateCalculators(),
        ]
      }),
    ];

    // Ajouter l'extension Office Paste si activée
    if (this.enableOfficePaste()) {
      extensions.push(
        OfficePaste.configure({
          // Configuration par défaut pour une meilleure compatibilité
          transformPastedHTML: true,
          transformPastedText: true,
        })
      );
    }

    if (this.showCharacterCount() || this.showWordCount()) {
      extensions.push(
        CharacterCount.configure({
          limit: this.maxCharacters(),
        })
      );
    }

    // Allow addition of custom extensions, but avoid duplicates by filtering by name
    const customExtensions = this.tiptapExtensions();
    if (customExtensions.length > 0) {
      const existingNames = new Set(
        extensions
          .map((ext) => (ext as any)?.name as string | undefined)
          .filter((name): name is string => !!name)
      );

      const filteredCustom = customExtensions.filter((ext) => {
        const name = (ext as any)?.name as string | undefined;
        return !name || !existingNames.has(name);
      });

      extensions.push(...filteredCustom);
    }

    // Also allow any tiptap user options
    const userOptions = this.tiptapOptions();

    const newEditor = new Editor({
      ...userOptions,
      element: this.editorElement().nativeElement,
      extensions,
      content: this.content(),
      editable: this.editable(),
      autofocus: this.autofocus(),
      onUpdate: ({ editor, transaction }) => {
        const html = editor.getHTML();
        this.contentChange.emit(html);
        // Mettre à jour le FormControl si il existe
        if ((this.ngControl as any)?.control) {
          (this.ngControl as any).control.setValue(html, {
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
        if ((this.ngControl as any)?.control) {
          (this.ngControl as any).control.markAsTouched();
        }
        this.editorBlur.emit({ editor, event });
      },
    });

    // Stocker la référence de l'éditeur immédiatement
    this._editor.set(newEditor);
  }

  private updateCharacterCount(editor: Editor) {
    if ((this.showCharacterCount() || this.showWordCount()) && editor.storage["characterCount"]) {
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
        const config = this.imageUploadConfig();
        await this.editorCommandsService.uploadImage(currentEditor, file, {
          quality: config.quality,
          maxWidth: config.maxWidth,
          maxHeight: config.maxHeight
        });
      } catch (error) {
        // Gérer l'erreur silencieusement ou afficher une notification
      }
    }
  }

  // Public methods
  getHTML(): string {
    return this.editor()?.getHTML() || "";
  }

  getJSON(): any {
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
    const control = (this.ngControl as any)?.control;
    if (control) {
      const formValue$ = concat(
        defer(() => of(control.value)),
        control.valueChanges
      );

      formValue$
        .pipe(
          tap((value: any) => {
            const editor = this.editor();
            if (editor) {
              this.setContent(value, false);
            }
          }),
          takeUntilDestroyed(this._destroyRef)
        )
        .subscribe();
    }
  }

  // Méthode pour gérer l'état disabled
  setDisabledState(isDisabled: boolean): void {
    const currentEditor = this.editor();
    if (currentEditor) {
      this.editorCommandsService.setEditable(currentEditor, !isDisabled);
    }
  }

  onEditorClick(event: MouseEvent) {
    const editor = this.editor();
    if (!editor) return;

    // Vérifier si on clique sur l'élément conteneur et non sur le contenu
    const target = event.target as HTMLElement;
    const editorElement = this.editorElement()?.nativeElement;

    if (
      target === editorElement ||
      target.classList.contains("tiptap-content")
    ) {
      // On clique dans l'espace vide, positionner le curseur à la fin
      setTimeout(() => {
        const { doc } = editor.state;
        const endPos = doc.content.size;
        editor.commands.setTextSelection(endPos);
        editor.commands.focus();
      }, 0);
    }
  }

  // Méthodes pour le bouton d'édition de table - Supprimées car remplacées par le menu bubble
}
