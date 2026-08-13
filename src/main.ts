import { Component, inject, effect, computed, signal } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { Editor, Extension, Node, Mark } from "@tiptap/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import {
  AngularTiptapEditorComponent,
  AteEditorConfig,
  AteAngularNode,
  AteI18nService,
  provideAteEditor,
  AteImageUploadResult,
  AteTableOfContentsComponent,
} from "angular-tiptap-editor";

// Import of components
import { EditorActionsComponent } from "./components/editor-actions.component";
import { ConfigurationPanelComponent } from "./components/configuration-panel.component";
import { ContentViewComponent } from "./components/content-view.component";
import { ThemeCustomizerComponent } from "./components/theme-customizer.component";
import { StateDebugComponent } from "./components/state-debug.component";
import { ToastContainerComponent } from "./components/toast-container.component";
import { DiscoveryHintsComponent } from "./components/discovery-hints.component";
import { DecoupledChromeDemoComponent } from "./components/decoupled-chrome-demo.component";
import { TaskList, TaskItem } from "./extensions/task.extension";

// Showcase components configs
import {
  AI_LOADING_CONF,
  COUNTER_CONF,
  AI_BLOCK_CONF,
  WARNING_BOX_CONF,
} from "./extensions/angular-showcase.extensions";

// Import of services
import { EditorConfigurationService } from "./services/editor-configuration.service";
import { ToastService } from "./services/toast.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AngularTiptapEditorComponent,
    AteTableOfContentsComponent,
    EditorActionsComponent,
    ConfigurationPanelComponent,
    ContentViewComponent,
    ThemeCustomizerComponent,
    StateDebugComponent,
    ToastContainerComponent,
    DiscoveryHintsComponent,
    DecoupledChromeDemoComponent,
  ],
  template: `
    <div class="app" #appRef data-testid="app-root" [class.dark]="editorState().darkMode">
      <!-- Theme Customizer Panel (Left) - Self-managed -->
      <app-theme-customizer />

      <!-- Main layout -->
      <div
        class="container"
        [class.theme-panel-open]="editorState().activePanel === 'theme'"
        [class.config-panel-open]="
          editorState().activePanel === 'config' || editorState().isTransitioning
        ">
        <!-- Floating Table of Contents (Notion-style) -->
        @if (tocConfig().enabled && tocConfig().floating) {
          <ate-table-of-contents
            [floating]="true"
            [positionMode]="tocConfig().positionMode"
            [position]="tocConfig().position"
            [variant]="tocConfig().variant"
            [hoverExpand]="tocConfig().hoverExpand"
            [showTitle]="tocConfig().showTitle"
            [maxDepth]="tocConfig().maxDepth" />
        }

        <!-- Main editor -->
        <main class="editor-main">
          <!-- Editor actions - Always visible -->
          <app-editor-actions />

          <!-- Main content wrapper with smooth zoom-fade transition -->
          <div class="main-content-wrapper" [class.flipped]="editorState().showCodeMode">
            <!-- Front Face: Editor -->
            <div class="editor-pane">
              <div
                class="editor-view"
                [class.fill-container-active]="editorState().fillContainer"
                (mouseenter)="onEditorHover(true)"
                (mouseleave)="onEditorHover(false)">
                <!-- Inline Table of Contents (Document Mode) -->
                @if (tocConfig().enabled && !tocConfig().floating) {
                  <div class="inline-toc-wrapper">
                    <ate-table-of-contents
                      [floating]="false"
                      [position]="tocConfig().position"
                      [variant]="tocConfig().variant"
                      [hoverExpand]="tocConfig().hoverExpand"
                      [showTitle]="tocConfig().showTitle"
                      [maxDepth]="tocConfig().maxDepth" />
                  </div>
                }
                <angular-tiptap-editor
                  [editorId]="'main-doc'"
                  [content]="demoContent()"
                  [config]="editorConfig()"
                  (contentChange)="onContentChange($event)"
                  (editableChange)="onEditableChange($event)"
                  (editorFocus)="onFocusEvent($event)"
                  (editorBlur)="onBlurEvent($event)"
                  (imageUploaded)="onImageUploaded($event)" />

                <!-- Proof of concept: standalone chrome resolved via AteEditorRegistry,
                     no ATE_EDITOR_PROVIDERS ancestor. Hidden by default so it never
                     interferes with toolbar-button selectors in other e2e specs. -->
                <button
                  type="button"
                  class="decoupled-demo-toggle"
                  data-testid="toggle-decoupled-demo"
                  (click)="showDecoupledDemo.set(!showDecoupledDemo())">
                  {{ showDecoupledDemo() ? "Masquer" : "Afficher" }} la démo de toolbar autonome
                </button>
                @if (showDecoupledDemo()) {
                  <app-decoupled-chrome-demo editorId="main-doc" />
                }
              </div>
            </div>

            <!-- Back Face: Code & Preview -->
            <div class="preview-pane">
              <app-content-view />
            </div>
          </div>
        </main>

        <!-- Configuration panel -->
        <app-configuration-panel />
      </div>

      <!-- Live Inspector (Fixed Footer) -->
      <app-state-debug />

      <!-- Toast Notifications -->
      <app-toast-container />

      <!-- Discovery Hints -->
      <app-discovery-hints />
    </div>
  `,
  styles: [
    `
      @import "./styles/task-list.css";

      .decoupled-demo-toggle {
        margin-top: 0.75rem;
        padding: 0.4rem 0.75rem;
        font-size: 12px;
        border: 1px solid var(--ate-border-color, var(--border-color, #e2e8f0));
        border-radius: 8px;
        background: transparent;
        color: var(--text-secondary, #64748b);
        cursor: pointer;
      }

      /* Inline TOC wrapper at top of editor sheet */
      .inline-toc-wrapper {
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px dashed var(--ate-border-color, var(--border-color, #e2e8f0));
      }

      /* Adjust floating TOC positioning when right configuration panel is open */
      .config-panel-open ate-table-of-contents {
        --ate-toc-right: calc(var(--panel-width) + 3.5rem);
      }

      @media (max-width: 1200px) {
        ate-table-of-contents.ate-toc-host-floating {
          display: none !important; /* Hide floating TOC on smaller/mobile viewports */
        }
      }

      /* Base styles for the app */
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        line-height: 1.5;
        color: var(--text-main);
        background: var(--app-bg);
        font-size: 14px;
      }

      /* Main layout */
      .app {
        min-height: 100vh;
        background: var(--app-bg);
        position: relative;
        transition:
          background 0.3s ease,
          color 0.3s ease;
      }

      /* Dark mode - handled by global styles on root div or body */
      .app.dark .editor-main {
        background: var(--app-bg);
      }

      .container {
        display: block;
        min-height: 100vh;
      }

      /* Main editor */
      .editor-main {
        width: var(--editor-width);
        max-width: 800px;
        margin: 0 auto;
        padding: 1.5rem;
        box-sizing: border-box;
        background: var(--app-bg);
        min-height: 100vh;
        position: relative;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateX(0);
      }

      /* Adjust editor when config panel (right) is open */
      .config-panel-open .editor-main {
        width: var(--editor-width-with-panel);
        max-width: 800px;
        transform: translateX(calc((-2 * var(--panel-width)) + 50% + 4rem));
      }

      /* Adjust editor when theme panel (left) is open */
      .theme-panel-open .editor-main {
        width: var(--editor-width-with-panel);
        max-width: 800px;
        transform: translateX(calc((2 * var(--panel-width)) - 50% - 4rem));
      }

      /* Adjust editor for medium screens */
      @media (min-width: 769px) and (max-width: 1199px) {
        .config-panel-open .editor-main {
          transform: translateX(calc(-50vw + 50% + 2rem));
        }
        .theme-panel-open .editor-main {
          transform: translateX(calc(50vw - 50% - 2rem));
        }
      }

      /* Mobile: editor doesn't move, panel goes above */
      @media (max-width: 768px) {
        .editor-main {
          width: var(--editor-width);
          max-width: 100%;
          margin: 0 auto;
          transform: none;
          padding: 1rem;
        }

        .config-panel-open .editor-main,
        .theme-panel-open .editor-main {
          width: var(--editor-width);
          max-width: 100%;
          margin: 0 auto;
          transform: none;
          transition-delay: 0s;
        }
      }

      /* Circular wipe (clip-path sweep) Transition Layout */
      .main-content-wrapper {
        position: relative;
        width: 100%;
        margin-top: 3rem;
      }

      .editor-pane,
      .preview-pane {
        width: 100%;
        border-radius: 12px;
      }

      .preview-pane {
        transition: clip-path 0.75s cubic-bezier(0.4, 0, 0.2, 1);
      }

      /* When NOT flipped (Editor Mode): Editor is relative (defines height), Preview is absolute */
      .main-content-wrapper:not(.flipped) .editor-pane {
        position: relative;
        z-index: 1;
        pointer-events: auto;
        height: auto;
        overflow: visible;
      }
      .main-content-wrapper:not(.flipped) .preview-pane {
        position: absolute;
        inset: 0;
        z-index: 2;
        pointer-events: none;
        overflow: hidden;
        clip-path: polygon(150% 0, 150% 0, 100% 100%, 100% 100%);
      }

      /* When flipped (Code Mode): Preview is relative (defines height), Editor is absolute */
      .main-content-wrapper.flipped .editor-pane {
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        overflow: hidden;
      }
      .main-content-wrapper.flipped .preview-pane {
        position: relative;
        z-index: 2;
        pointer-events: auto;
        overflow: visible;
        clip-path: polygon(0 0, 150% 0, 100% 100%, -50% 100%);
      }

      .editor-view {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .editor-view > angular-tiptap-editor {
        flex: 1;
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      /* Highlight when fillContainer is activated */
      .editor-view.fill-container-active {
        position: relative;
        border: 2px dashed var(--primary-color);
        border-radius: 12px;
        padding: 8px;
        padding-top: 20px;
        background: rgba(99, 102, 241, 0.03);
        animation:
          fadeIn 0.15s cubic-bezier(0.4, 0, 0.2, 1),
          fillContainerPulse 2s ease-in-out infinite;
        /* Fixed height to demonstrate the fillContainer effect */
        height: 450px;
        margin-top: 16px;
      }

      .editor-view.fill-container-active::before {
        content: "fillContainer: true • height: 450px";
        position: absolute;
        top: -12px;
        left: 12px;
        background: var(--primary-gradient);
        color: white;
        font-size: 11px;
        font-weight: 600;
        padding: 4px 12px;
        border-radius: 10px;
        z-index: 10;
        letter-spacing: 0.3px;
        box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
      }

      @keyframes fillContainerPulse {
        0%,
        100% {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 0 rgba(var(--primary-color-rgb), 0.1);
        }
        50% {
          border-color: var(--primary-color);
          box-shadow: 0 0 0 4px rgba(var(--primary-color-rgb), 0.1);
        }
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class App {
  // Injection des services
  private configService = inject(EditorConfigurationService);
  private i18nService = inject(AteI18nService);
  private toastService = inject(ToastService);

  // Signaux depuis le service
  readonly editorState = this.configService.editorState;
  readonly demoContent = this.configService.demoContent;
  readonly toolbarConfig = this.configService.toolbarConfig;
  readonly bubbleMenuConfig = this.configService.bubbleMenuConfig;
  readonly slashCommandsConfig = this.configService.slashCommandsConfig;
  readonly tocConfig = this.configService.tocConfig;
  readonly currentLocale = this.i18nService.currentLocale;

  // Proof of concept toggle: standalone chrome (see decoupled-chrome-demo.component.ts)
  readonly showDecoupledDemo = signal(false);

  readonly finalAngularNodes = computed(
    () => {
      const nodes: AteAngularNode[] = [AI_LOADING_CONF];

      if (this.configService.isCounterEnabled()) {
        nodes.push(COUNTER_CONF);
      }
      if (this.configService.isWarningBoxEnabled()) {
        nodes.push(WARNING_BOX_CONF);
      }
      if (this.configService.isAiBlockEnabled()) {
        nodes.push(AI_BLOCK_CONF);
      }
      return nodes;
    },
    { equal: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]) }
  );

  readonly finalTiptapExtensions = computed(
    () => {
      const exts: (Extension | Node | Mark)[] = [];
      if (this.editorState().enableTaskExtension) {
        exts.push(TaskList, TaskItem);
      }
      return exts;
    },
    { equal: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]) }
  );

  readonly editorConfig = computed(() => {
    const state = this.editorState();

    const config: AteEditorConfig = {
      theme: state.darkMode ? "dark" : "light",
      mode: state.seamless ? "seamless" : "classic",
      height: state.height ? `${state.height}px` : undefined,
      autofocus: state.autofocus,
      placeholder: state.placeholder,
      editable: state.editable,
      minHeight: state.minHeight ? `${state.minHeight}px` : undefined,
      maxHeight: state.maxHeight ? `${state.maxHeight}px` : undefined,
      fillContainer: state.fillContainer,
      disabled: state.disabled,
      locale: this.currentLocale(),
      showToolbar: state.showToolbar,
      showFooter: state.showFooter,
      showCharacterCount: state.showCharacterCount,
      showWordCount: state.showWordCount,
      showEditToggle: state.showEditToggle,
      maxCharacters: state.maxCharacters,
      toolbar: this.toolbarConfig(),
      bubbleMenu: this.bubbleMenuConfig(),
      slashCommands: this.slashCommandsConfig(),
      floatingToolbar: state.floatingToolbar,
      showBubbleMenu: state.showBubbleMenu,
      showImageBubbleMenu: state.showImageBubbleMenu,
      showTableMenu: state.showTableBubbleMenu,
      showCellMenu: state.showCellBubbleMenu,
      enableSlashCommands: state.enableSlashCommands,
      angularNodes: this.finalAngularNodes(),
      tiptapExtensions: this.finalTiptapExtensions(),
      blockControls: state.blockControls,
    };
    return config;
  });

  constructor() {
    // Effet pour synchroniser la classe dark sur le body (pour les bubble menus)
    effect(() => {
      const isDark = this.editorState().darkMode;
      if (isDark) {
        document.body.classList.add("dark");
      } else {
        document.body.classList.remove("dark");
      }
    });
  }

  onContentChange(content: string) {
    this.configService.updateDemoContent(content);
  }

  onEditableChange(editable: boolean) {
    this.configService.updateEditorState({ editable });
  }

  onEditorHover(hovered: boolean) {
    this.configService.setEditorHovered(hovered);
  }

  onFocusEvent(_event: { editor: Editor; event: FocusEvent }) {
    console.log("Editor Focused!");
  }

  onBlurEvent(_event: { editor: Editor; event: FocusEvent }) {
    console.log("Editor Blurred!");
  }

  onImageUploaded(event: AteImageUploadResult) {
    this.toastService.success(`Image uploaded successfully: ${event.name || "image"}`);
  }
}

bootstrapApplication(App, {
  providers: [provideAteEditor()],
});
