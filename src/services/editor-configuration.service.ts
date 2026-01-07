import { Injectable, signal, computed, inject, effect } from "@angular/core";
import { Editor } from "@tiptap/core";
import {
  ToolbarConfig,
  BubbleMenuConfig,
  SlashCommandsConfig,
  TiptapI18nService,
  DEFAULT_TOOLBAR_CONFIG,
  DEFAULT_BUBBLE_MENU_CONFIG,
  SLASH_COMMAND_KEYS,
  DEFAULT_SLASH_COMMANDS_CONFIG,
  SlashCommandKey,
  filterSlashCommands,
  EditorCommandsService,
} from "angular-tiptap-editor";
import { EditorState, MenuState } from "../types/editor-config.types";
import { AppI18nService } from "./app-i18n.service";

@Injectable({
  providedIn: "root",
})
export class EditorConfigurationService {
  private i18nService = inject(TiptapI18nService);
  private appI18nService = inject(AppI18nService);
  private editorCommandsService = inject(EditorCommandsService);
  // Editor state
  private _editorState = signal<EditorState>({
    showSidebar: true,
    showCodeMode: false,
    isTransitioning: false,
    showToolbar: true,
    showBubbleMenu: true,
    enableSlashCommands: true,
    placeholder: "Start typing...", // Will be updated by the effect
    // Height configuration
    minHeight: 200,
    height: undefined,
    maxHeight: undefined,
    fillContainer: false,
    // Autofocus configuration
    autofocus: false,
    darkMode: false,
    activePanel: 'config',
  });

  // Menu state
  private _menuState = signal<MenuState>({
    showToolbarMenu: false,
    showBubbleMenuMenu: false,
    showSlashCommandsMenu: false,
    showHeightMenu: false,
  });

  // Editor content
  private _demoContent = signal("<p></p>");

  // Configurations - utilisent les configurations par défaut de la librairie
  private _toolbarConfig = signal<Partial<ToolbarConfig>>(
    DEFAULT_TOOLBAR_CONFIG
  );
  private _bubbleMenuConfig = signal<Partial<BubbleMenuConfig>>(
    DEFAULT_BUBBLE_MENU_CONFIG
  );
  // Changed _activeSlashCommands to _slashCommandsConfig and initialized with DEFAULT_SLASH_COMMANDS_CONFIG
  private _nativeSlashCommands = signal<Record<SlashCommandKey, boolean>>(
    DEFAULT_SLASH_COMMANDS_CONFIG
  );
  private _isMagicTemplateEnabled = signal<boolean>(false);
  private _magicTemplateTitle = signal<string>("");

  // Signaux publics (lecture seule)
  readonly editorState = this._editorState.asReadonly();
  readonly menuState = this._menuState.asReadonly();
  readonly demoContent = this._demoContent.asReadonly();
  readonly toolbarConfig = this._toolbarConfig.asReadonly();
  readonly bubbleMenuConfig = this._bubbleMenuConfig.asReadonly();
  
  // Slash commands config is now computed to be reactive to translations
  readonly slashCommandsConfig = computed<SlashCommandsConfig>(() => {
    const natives = this._nativeSlashCommands();
    const isMagicEnabled = this._isMagicTemplateEnabled();
    
    if (!isMagicEnabled) {
      return natives;
    }

    const t = this.appI18nService.translations().items;
    const customTitle = this._magicTemplateTitle() || t.customMagicTitle;

    return {
      ...natives,
      custom: [
        {
          title: customTitle,
          description: t.customMagicDesc,
          icon: 'auto_awesome',
          keywords: ['magic', 'template', 'structure'],
          command: (editor: Editor) => {
            editor.commands.insertContent(
              `<h3>✨ ${customTitle}</h3><p>This was inserted by a <strong>custom command</strong> using the <em>native editor API</em>!</p>`
            );
          }
        }
      ]
    };
  });

  // Computed values
  readonly toolbarActiveCount = computed(() => {
    const config = this._toolbarConfig();
    return Object.values(config).filter(Boolean).length;
  });

  readonly bubbleMenuActiveCount = computed(() => {
    const config = this._bubbleMenuConfig();
    return Object.values(config).filter(Boolean).length;
  });

  readonly slashCommandsActiveCount = computed(() => {
    const natives = this._nativeSlashCommands();
    const isMagicEnabled = this._isMagicTemplateEnabled();
    const nativeCount = Object.values(natives).filter(Boolean).length;
    return nativeCount + (isMagicEnabled ? 1 : 0);
  });

  constructor() {
    // Update content when language changes
    effect(() => {
      // Re-trigger when language changes
      this.i18nService.currentLocale();
      this.initializeDemoContent();
    });

    // Update editor placeholder based on language
    effect(() => {
      const editorTranslations = this.i18nService.editor();
      this._editorState.update((state) => ({
        ...state,
        placeholder: editorTranslations.placeholder,
      }));
    });

    this.initializeDemoContent();
  }

  // Methods for editor state
  updateEditorState(partialState: Partial<EditorState>) {
    this._editorState.update((state) => ({ ...state, ...partialState }));
  }

  updateMenuState(partialState: Partial<MenuState>) {
    this._menuState.update((state) => ({ ...state, ...partialState }));
  }

  updateDemoContent(content: string) {
    this._demoContent.set(content);
  }

  // Methods for configurations
  toggleToolbarItem(key: string) {
    this._toolbarConfig.update((config) => ({
      ...config,
      [key]: !(config as any)[key],
    }));
  }

  setActivePanel(panel: 'none' | 'config' | 'theme') {
    this._editorState.update((state) => ({
      ...state,
      activePanel: panel,
      showSidebar: panel === 'config',
    }));
  }

  togglePanel(panel: 'config' | 'theme') {
    const current = this._editorState().activePanel;
    if (current === panel) {
      this.setActivePanel('none');
    } else {
      this.setActivePanel(panel);
    }
  }


  toggleBubbleMenuItem(key: string) {
    this._bubbleMenuConfig.update((config) => ({
      ...config,
      [key]: !(config as any)[key],
    }));
  }

  // Updated toggleSlashCommand to work with separate states
  toggleSlashCommand(key: string) {
    if (key === 'custom_magic') {
      this._isMagicTemplateEnabled.update(v => !v);
      return;
    }

    this._nativeSlashCommands.update((config) => ({
      ...config,
      [key as SlashCommandKey]: !config[key as SlashCommandKey],
    }));
  }

  // Verification methods
  isToolbarItemActive(key: string): boolean {
    const config = this._toolbarConfig();
    return !!(config as any)[key];
  }

  isBubbleMenuItemActive(key: string): boolean {
    const config = this._bubbleMenuConfig();
    return !!(config as any)[key];
  }

  // Updated isSlashCommandActive to work with separate states
  isSlashCommandActive(key: string): boolean {
    if (key === 'custom_magic') {
      return this._isMagicTemplateEnabled();
    }
    return !!this._nativeSlashCommands()[key as SlashCommandKey];
  }

  // Magic template title management
  readonly magicTemplateTitle = computed(() => {
    return this._magicTemplateTitle() || this.appI18nService.translations().items.customMagicTitle;
  });

  updateMagicTemplateTitle(title: string) {
    this._magicTemplateTitle.set(title);
  }

  // Height configuration methods
  toggleHeightItem(key: string) {
    const currentState = this._editorState();

    switch (key) {
      case "enableScroll":
        // Activer le scroll en définissant une hauteur max par défaut
        this._editorState.update((state) => ({
          ...state,
          maxHeight: state.maxHeight ? undefined : 400,
        }));
        break;
      case "fixedHeight":
        // Toggle between fixed height and auto
        this._editorState.update((state) => ({
          ...state,
          height: state.height ? undefined : 300,
        }));
        break;
      case "maxHeight":
        // Toggle between max height and none
        this._editorState.update((state) => ({
          ...state,
          maxHeight: state.maxHeight ? undefined : 400,
        }));
        break;
    }
  }

  isHeightItemActive(key: string): boolean {
    const state = this._editorState();

    switch (key) {
      case "enableScroll":
        // Le scroll est actif si on a une hauteur ou hauteur max
        return state.height !== undefined || state.maxHeight !== undefined;
      case "fixedHeight":
        return state.height !== undefined;
      case "maxHeight":
        return state.maxHeight !== undefined;
      default:
        return false;
    }
  }

  // Fill container toggle
  toggleFillContainer() {
    this._editorState.update((state) => ({
      ...state,
      fillContainer: !state.fillContainer,
    }));
  }

  // Dark mode toggle
  toggleDarkMode() {
    this._editorState.update((state) => ({
      ...state,
      darkMode: !state.darkMode,
    }));
  }

  // Menu closing methods
  closeAllMenus() {
    this._menuState.set({
      showToolbarMenu: false,
      showBubbleMenuMenu: false,
      showSlashCommandsMenu: false,
      showHeightMenu: false,
    });
  }

  // Reset to default values - utilise les configurations de la librairie
  resetToDefaults() {
    this._toolbarConfig.set(DEFAULT_TOOLBAR_CONFIG);
    this._bubbleMenuConfig.set(DEFAULT_BUBBLE_MENU_CONFIG);
    // Updated to use DEFAULT_SLASH_COMMANDS_CONFIG
    this._nativeSlashCommands.set(DEFAULT_SLASH_COMMANDS_CONFIG);
    this._isMagicTemplateEnabled.set(false);

    this._editorState.update((state) => ({
      ...state,
      showToolbar: true,
      showBubbleMenu: true,
      enableSlashCommands: true,
    }));

    this.closeAllMenus();
  }

  // Référence à l'éditeur (pour les actions directes)
  private _editorReference = signal<Editor | null>(null);

  // Méthode pour définir la référence de l'éditeur
  setEditorReference(editor: Editor) {
    this._editorReference.set(editor);
  }

  // Vider le contenu
  clearContent() {
    const editor = this._editorReference();
    if (editor) {
      // Utiliser le service pour vider le contenu et déclencher les événements
      this.editorCommandsService.clearContent(editor);
    } else {
      // Fallback : mettre à jour le contenu via le signal
      this._demoContent.set("<p></p>");
    }
  }

  // updateSlashCommandsConfig deleted as it is now handled by the editor component internally

  // Initialize demo content with translations
  private initializeDemoContent() {
    const translatedContent = this.appI18nService.generateDemoContent();
    this._demoContent.set(translatedContent);
  }
}
