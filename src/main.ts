import { Component, inject, viewChild, effect, computed, Injector } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { Extension, Node, Mark } from "@tiptap/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import {
  AngularTiptapEditorComponent,
  AteEditorConfig,
  AteI18nService,
} from "angular-tiptap-editor";

// Import of components
import { EditorActionsComponent } from "./components/editor-actions.component";
import { CodeViewComponent } from "./components/code-view.component";
import { ConfigurationPanelComponent } from "./components/configuration-panel.component";
import { ThemeCustomizerComponent } from "./components/theme-customizer.component";
import { StateDebugComponent } from "./components/state-debug.component";
import { ToastContainerComponent } from "./components/toast-container.component";
import { TaskList, TaskItem } from "./extensions/task.extension";
import { AiLoadingExtension } from "./extensions/angular-showcase.extensions";

// Showcase components
import {
  CounterExtension,
  AiBlockExtension,
  WarningBoxExtension,
} from "./extensions/angular-showcase.extensions";

// Import of services
import { EditorConfigurationService } from "./services/editor-configuration.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AngularTiptapEditorComponent,
    EditorActionsComponent,
    CodeViewComponent,
    ConfigurationPanelComponent,
    ThemeCustomizerComponent,
    StateDebugComponent,
    ToastContainerComponent,
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
        <!-- Main editor -->
        <main class="editor-main">
          <!-- Editor actions - Always visible -->
          <app-editor-actions />

          <!-- Main content -->
          <div class="main-content">
            <!-- Mode éditeur -->
            @if (!editorState().showCodeMode) {
              <div class="editor-view" [class.fill-container-active]="editorState().fillContainer">
                <angular-tiptap-editor
                  #editorRef
                  [content]="demoContent()"
                  [config]="editorConfig()"
                  [tiptapExtensions]="extraExtensions()"
                  (contentChange)="onContentChange($event)"
                  (editableChange)="onEditableChange($event)" />
              </div>
            } @else {
              <!-- Code mode -->
              <app-code-view />
            }
          </div>
        </main>

        <!-- Configuration panel -->
        <app-configuration-panel />
      </div>

      <!-- Live Inspector (Fixed Footer) -->
      <app-state-debug />

      <!-- Toast Notifications -->
      <app-toast-container />
    </div>
  `,
  styles: [
    `
      @import "./styles/task-list.css";

      /* Reset et base */
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

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
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem;
        background: var(--app-bg);
        min-height: 100vh;
        position: relative;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        transform: translateX(0);
      }

      /* Adjust editor when config panel (right) is open */
      .config-panel-open .editor-main {
        width: var(--editor-width-with-panel);
        max-width: 900px;
        transform: translateX(calc((-2 * var(--panel-width)) + 50%));
      }

      /* Adjust editor when theme panel (left) is open */
      .theme-panel-open .editor-main {
        width: var(--editor-width-with-panel);
        max-width: 900px;
        transform: translateX(calc((2 * var(--panel-width)) - 50%));
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

      /* Main content */
      .main-content {
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        padding-top: 5rem; /* Space for actions (80px) */
      }

      .editor-view {
        animation: fadeIn 0.15s cubic-bezier(0.4, 0, 0.2, 1);
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
  // Inject injector for passing to extensions
  private injector = inject(Injector);

  // Computed extra extensions
  readonly extraExtensions = computed(() => {
    const exts: (Extension | Node | Mark)[] = [AiLoadingExtension(this.injector)];

    if (this.configService.isCounterEnabled()) {
      exts.push(CounterExtension(this.injector)); // Approach 1: TipTap-aware
    }

    if (this.configService.isWarningBoxEnabled()) {
      exts.push(WarningBoxExtension(this.injector)); // Approach 2: Library component variant
    }

    if (this.configService.isAiBlockEnabled()) {
      exts.push(AiBlockExtension(this.injector)); // AI Block extension
    }

    if (this.editorState().enableTaskExtension) {
      exts.push(TaskList, TaskItem);
    }
    return exts;
  });

  // ViewChild pour l'éditeur
  private editorRef = viewChild<AngularTiptapEditorComponent>("editorRef");

  // Injection des services
  private configService = inject(EditorConfigurationService);
  private i18nService = inject(AteI18nService);

  // Signaux depuis le service
  readonly editorState = this.configService.editorState;
  readonly demoContent = this.configService.demoContent;
  readonly toolbarConfig = this.configService.toolbarConfig;
  readonly bubbleMenuConfig = this.configService.bubbleMenuConfig;
  readonly slashCommandsConfig = this.configService.slashCommandsConfig;
  readonly currentLocale = this.i18nService.currentLocale;

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
    };
    return config;
  });

  constructor() {
    // Effet pour passer les références de l'éditeur au service
    effect(() => {
      const editor = this.editorRef()?.editor();
      const commands = this.editorRef()?.editorCommandsService;
      if (editor && commands) {
        this.configService.setEditorReferences(editor, commands);
      }
    });

    // Effet pour synchroniser l'état réactif live
    effect(() => {
      const state = this.editorRef()?.editorState();
      if (state) {
        this.configService.setLiveEditorState(state);
      }
    });

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
}

bootstrapApplication(App, {
  providers: [],
});
