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
import { TiptapToolbarComponent } from "./index";
import { TiptapImageUploadComponent } from "./tiptap-image-upload.component";
import { TiptapBubbleMenuComponent } from "./tiptap-bubble-menu.component";
import { TiptapImageBubbleMenuComponent } from "./tiptap-image-bubble-menu.component";
import { TiptapTableBubbleMenuComponent } from "./tiptap-table-bubble-menu.component";
import {
  CellBubbleMenuConfig,
  TiptapCellBubbleMenuComponent,
} from "./tiptap-cell-bubble-menu.component";
import {
  TiptapSlashCommandsComponent,
  SlashCommandsConfig,
} from "./tiptap-slash-commands.component";
import {
  ImageService,
  ImageUploadHandler,
  ImageUploadResult,
} from "./services/image.service";
import { TiptapI18nService, SupportedLocale } from "./services/i18n.service";
import { EditorCommandsService } from "./services/editor-commands.service";
import { NoopValueAccessorDirective } from "./noop-value-accessor.directive";
import { NgControl } from "@angular/forms";
import {
  filterSlashCommands,
  SLASH_COMMAND_KEYS,
} from "./config/i18n-slash-commands";

import { ToolbarConfig } from "./tiptap-toolbar.component";
import {
  BubbleMenuConfig,
  ImageBubbleMenuConfig,
  TableBubbleMenuConfig,
} from "./models/bubble-menu.model";
import { concat, defer, of, tap } from "rxjs";

// Configuration par défaut de la toolbar
export const DEFAULT_TOOLBAR_CONFIG: ToolbarConfig = {
  bold: true,
  italic: true,
  underline: true,
  strike: true,
  code: true,
  superscript: false,
  subscript: false,
  highlight: true,
  heading1: true,
  heading2: true,
  heading3: true,
  bulletList: true,
  orderedList: true,
  blockquote: true,
  alignLeft: false,
  alignCenter: false,
  alignRight: false,
  alignJustify: false,
  link: true,
  image: true,
  horizontalRule: true,
  table: true,
  undo: true,
  redo: true,
  clear: false, // Désactivé par défaut (opt-in)
  textColor: true,
  separator: true,
};

// Configuration par défaut du bubble menu
export const DEFAULT_BUBBLE_MENU_CONFIG: BubbleMenuConfig = {
  bold: true,
  italic: true,
  underline: true,
  strike: true,
  code: true,
  superscript: false,
  subscript: false,
  highlight: true,
  textColor: true,
  link: true,
  separator: true,
};

// Configuration par défaut du bubble menu image
export const DEFAULT_IMAGE_BUBBLE_MENU_CONFIG: ImageBubbleMenuConfig = {
  changeImage: true,
  resizeSmall: true,
  resizeMedium: true,
  resizeLarge: true,
  resizeOriginal: true,
  deleteImage: true,
  separator: true,
};

// Configuration par défaut du menu de table
export const DEFAULT_TABLE_MENU_CONFIG: TableBubbleMenuConfig = {
  addRowBefore: true,
  addRowAfter: true,
  deleteRow: true,
  addColumnBefore: true,
  addColumnAfter: true,
  deleteColumn: true,
  toggleHeaderRow: true,
  toggleHeaderColumn: true,
  deleteTable: true,
  separator: true,
};

export const DEFAULT_CELL_MENU_CONFIG: CellBubbleMenuConfig = {
  mergeCells: true,
  splitCell: true,
};

export const DEFAULT_SLASH_COMMANDS: SlashCommandsConfig = {
  commands: [], // Sera rempli par filterSlashCommands
};

@Component({
  selector: "angular-tiptap-editor",
  standalone: true,
  hostDirectives: [NoopValueAccessorDirective],
  host: {
    '[class.fill-container]': 'fillContainer()',
  },
  imports: [
    TiptapToolbarComponent,
    TiptapImageUploadComponent,
    TiptapBubbleMenuComponent,
    TiptapImageBubbleMenuComponent,
    TiptapTableBubbleMenuComponent,
    TiptapCellBubbleMenuComponent,
    TiptapSlashCommandsComponent,
  ],
  template: `
    <div class="tiptap-editor" [class.fill-container]="fillContainer()">
      <!-- Toolbar -->
      @if (showToolbar() && editor()) {
      <tiptap-toolbar [editor]="editor()!" [config]="toolbarConfig()">
        <div image-upload class="image-upload-container">
          <tiptap-image-upload
            [config]="imageUploadConfig()"
            (imageSelected)="onImageUploaded($event)"
            (error)="onImageUploadError($event)"
          />
        </div>
      </tiptap-toolbar>
      }

      <!-- Contenu de l'éditeur -->
      <div
        #editorElement
        class="tiptap-content"
        [class.drag-over]="isDragOver()"
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event)"
        (click)="onEditorClick($event)"
      ></div>

      <!-- Bubble Menu pour le texte -->
      @if (showBubbleMenu() && editor()) {
      <tiptap-bubble-menu
        [editor]="editor()!"
        [config]="bubbleMenuConfig()"
        [style.display]="editorFullyInitialized() ? 'block' : 'none'"
      ></tiptap-bubble-menu>
      }

      <!-- Bubble Menu pour les images -->
      @if (showImageBubbleMenu() && editor()) {
      <tiptap-image-bubble-menu
        [editor]="editor()!"
        [config]="imageBubbleMenuConfig()"
        [style.display]="editorFullyInitialized() ? 'block' : 'none'"
      ></tiptap-image-bubble-menu>
      }

      <!-- Slash Commands -->
      @if (enableSlashCommands() && editor()) {
      <tiptap-slash-commands
        [editor]="editor()!"
        [config]="slashCommandsConfigComputed()"
        [style.display]="editorFullyInitialized() ? 'block' : 'none'"
        (imageUploadRequested)="onSlashCommandImageUpload($event)"
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

      <!-- Table Edit Button - Supprimé car remplacé par le menu bubble -->

      <!-- Compteur de caractères -->
      @if (showCharacterCount()) {
      <div class="character-count">
        {{ characterCount() }}
        {{ i18nService.editor().character
        }}{{ characterCount() > 1 ? "s" : "" }}, {{ wordCount() }}
        {{ i18nService.editor().word }}{{ wordCount() > 1 ? "s" : "" }}
        @if (maxCharacters()) { /
        {{ maxCharacters() }}
        }
      </div>
      }
    </div>
  `,

  styles: [
    `
      /* Styles de base pour l'éditeur Tiptap */

      /* Host styles pour fillContainer */
      :host(.fill-container) {
        display: block;
        height: 100%;
      }

      /* Conteneur principal de l'éditeur */
      .tiptap-editor {
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        background: white;
        overflow: hidden;
        transition: border-color 0.2s ease;
      }

      /* Mode fill container - l'éditeur remplit son parent */
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
        border-color: #3182ce;
      }

      /* Contenu de l'éditeur */
      .tiptap-content {
        padding: 16px;
        min-height: var(--editor-min-height, 200px);
        height: var(--editor-height, auto);
        max-height: var(--editor-max-height, none);
        overflow-y: var(--editor-overflow, visible);
        outline: none;
        position: relative;
      }

      .tiptap-content.drag-over {
        background: #f0f8ff;
        border: 2px dashed #3182ce;
      }

      /* Compteur de caractères */
      .character-count {
        padding: 8px 16px;
        font-size: 12px;
        color: #718096;
        text-align: right;
        border-top: 1px solid #e2e8f0;
        background: #f8f9fa;
      }

      /* Styles spécifiques au composant */
      .image-upload-container {
        position: relative;
        display: inline-block;
      }

      /* Styles ProseMirror avec :host ::ng-deep */
      :host ::ng-deep .ProseMirror {
        outline: none;
        line-height: 1.6;
        color: #2d3748;
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
        border-left: 4px solid #e2e8f0;
        padding-left: 1em;
        margin: 1em 0;
        font-style: italic;
        background: #f8f9fa;
        padding: 0.5em 1em;
        border-radius: 0 4px 4px 0;
      }

      /* Code */
      :host ::ng-deep .ProseMirror code {
        background: #f1f5f9;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: "Monaco", "Consolas", monospace;
        font-size: 0.9em;
      }

      :host ::ng-deep .ProseMirror pre {
        background: #1a202c;
        color: #e2e8f0;
        padding: 1em;
        border-radius: 6px;
        overflow-x: auto;
        margin: 1em 0;
      }

      :host ::ng-deep .ProseMirror pre code {
        background: none;
        color: inherit;
        padding: 0;
      }

      /* Placeholder */
      :host ::ng-deep .ProseMirror p.is-editor-empty:first-child::before {
        content: attr(data-placeholder);
        color: #a0aec0;
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
        border-radius: 8px;
      }

      :host ::ng-deep .ProseMirror img:hover {
        border-color: #e2e8f0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      :host ::ng-deep .ProseMirror img.ProseMirror-selectednode {
        border-color: #3182ce;
        box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
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
        outline: 2px solid #6366f1;
        outline-offset: 2px;
        border-radius: 16px;
        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
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
        background: #3b82f6;
        border: 2px solid white;
        border-radius: 50%;
        pointer-events: all;
        cursor: pointer;
        z-index: 1001;
        transition: all 0.15s ease;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      }

      :host ::ng-deep .resize-handle:hover {
        background: #2563eb;
        box-shadow: 0 3px 8px rgba(0, 0, 0, 0.3);
      }

      :host ::ng-deep .resize-handle:active {
        background: #1d4ed8;
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
        border-right: 1px solid #e2e8f0;
        border-bottom: 1px solid #e2e8f0;
        box-sizing: border-box;
        min-width: 1em;
        padding: 8px 12px;
        position: relative;
        vertical-align: top;
        background: white;
      }

      /* Ajouter les bordures externes manquantes pour former la bordure du tableau */
      :host ::ng-deep .ProseMirror table td:first-child,
      :host ::ng-deep .ProseMirror table th:first-child {
        border-left: 1px solid #e2e8f0;
      }

      :host ::ng-deep .ProseMirror table tr:first-child td,
      :host ::ng-deep .ProseMirror table tr:first-child th {
        border-top: 1px solid #e2e8f0;
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
        background: #f8f9fa;
        font-weight: 600;
        color: #374151;
      }

      /* Cellules sélectionnées */
      :host ::ng-deep .ProseMirror table .selectedCell:after {
        background: rgba(200, 200, 255, 0.4);
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
        background-color: #6366f1;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      :host ::ng-deep .ProseMirror table:hover .column-resize-handle {
        opacity: 1;
      }

      :host ::ng-deep .ProseMirror table .column-resize-handle:hover {
        background-color: #4f46e5;
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

      /* Styles pour les cellules sélectionnées */
      :host ::ng-deep .ProseMirror table .selectedCell {
        background-color: rgba(99, 102, 241, 0.1);
      }

      /* Styles pour les en-têtes de table */
      :host ::ng-deep .ProseMirror table th {
        background-color: #f8f9fa;
        font-weight: 600;
        color: #374151;
        text-align: left;
      }

      /* Styles pour les lignes alternées (optionnel) */
      :host ::ng-deep .ProseMirror table tbody tr:nth-child(even) {
        background-color: #fafbfc;
      }

      :host ::ng-deep .ProseMirror table tbody tr:hover {
        background-color: #f1f5f9;
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
  maxCharacters = input<number | undefined>(undefined);
  enableOfficePaste = input<boolean>(true);
  enableSlashCommands = input<boolean>(true);
  slashCommandsConfig = input<SlashCommandsConfig | undefined>(undefined);
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
    const config = this.slashCommandsConfig();
    if (config) {
      return config;
    }

    // Configuration par défaut avec toutes les commandes
    const allCommands = filterSlashCommands(
      new Set(SLASH_COMMAND_KEYS),
      this.i18nService
    );
    return { commands: allCommands };
  });

  private _destroyRef = inject(DestroyRef);
  // NgControl pour gérer les FormControls
  private ngControl = inject(NgControl, { self: true, optional: true });

  readonly i18nService = inject(TiptapI18nService);
  readonly imageService = inject(ImageService);
  readonly editorCommandsService = inject(EditorCommandsService);

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

    // Effect pour surveiller les changements d'édition
    effect(() => {
      const currentEditor = this.editor();
      const isEditable = this.editable();

      if (currentEditor) {
        this.editorCommandsService.setEditable(currentEditor, isEditable);
      }
    });

    // Effect pour synchroniser le handler d'upload d'images avec le service
    effect(() => {
      const handler = this.imageUploadHandler();
      this.imageService.uploadHandler = handler || null;
    });

    // Effect pour la détection du survol des tables
    effect(() => {
      const currentEditor = this.editor();
      if (!currentEditor) return;

      // Table hover detection supprimée car remplacée par le menu bubble
    });
  }

  ngAfterViewInit() {
    // La vue est déjà complètement initialisée dans ngAfterViewInit
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
        isUploading: () => this.imageService.isUploading(),
        uploadProgress: () => this.imageService.uploadProgress(),
        uploadMessage: () => this.imageService.uploadMessage(),
      }),
      TableExtension,
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

    if (this.showCharacterCount()) {
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
        // Mettre à jour le FormControl si il existe (dans le prochain cycle)
        if ((this.ngControl as any)?.control) {
          setTimeout(() => {
            (this.ngControl as any).control.setValue(html, {
              emitEvent: false,
            });
          }, 0);
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
    if (this.showCharacterCount() && editor.storage["characterCount"]) {
      const storage = editor.storage["characterCount"];
      this._characterCount.set(storage.characters());
      this._wordCount.set(storage.words());
    }
  }

  // Méthodes pour l'upload d'images
  onImageUploaded(result: ImageUploadResult) {
    const currentEditor = this.editor();
    if (currentEditor) {
      this.imageService.insertImage(currentEditor, {
        src: result.src,
        alt: result.name,
        title: `${result.name} (${result.width}×${result.height})`,
        width: result.width,
        height: result.height,
      });
    }
  }

  onImageUploadError(error: string) {
    // Ici vous pourriez afficher une notification à l'utilisateur
  }

  // Gestion de l'upload d'image depuis les slash commands
  async onSlashCommandImageUpload(file: File) {
    const currentEditor = this.editor();
    if (currentEditor) {
      try {
        await this.imageService.uploadAndInsertImage(currentEditor, file);
      } catch (error) {
        // Gérer l'erreur silencieusement ou afficher une notification
      }
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
        await this.imageService.uploadAndInsertImage(currentEditor, file);
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
