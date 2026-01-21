import { Injectable, signal, computed, inject, effect } from "@angular/core";
import { Editor } from "@tiptap/core";
import {
  AteToolbarConfig,
  AteBubbleMenuConfig,
  AteSlashCommandsConfig,
  AteI18nService,
  ATE_DEFAULT_TOOLBAR_CONFIG,
  ATE_DEFAULT_BUBBLE_MENU_CONFIG,
  ATE_DEFAULT_SLASH_COMMANDS_CONFIG,
  AteSlashCommandKey,
  AteEditorCommandsService,
  AteEditorStateSnapshot,
  ATE_INITIAL_EDITOR_STATE,
} from "angular-tiptap-editor";
import { EditorState, MenuState } from "../types/editor-config.types";
import { AppI18nService } from "./app-i18n.service";

@Injectable({
  providedIn: "root",
})
export class EditorConfigurationService {
  private ateI18nService = inject(AteI18nService);
  private appI18nService = inject(AppI18nService);
  // Editor state
  private _editorState = signal<EditorState>({
    showSidebar: true,
    showCodeMode: false,
    isTransitioning: false,
    showToolbar: true,
    showFooter: true,
    showBubbleMenu: true,
    showCharacterCount: true,
    showWordCount: true,
    showImageBubbleMenu: true,
    showTableBubbleMenu: true,
    showCellBubbleMenu: true,
    enableSlashCommands: true,
    placeholder: "Start typing...", // Will be updated by the effect
    locale: undefined,
    // Height configuration
    minHeight: undefined,
    height: undefined,
    maxHeight: undefined,
    fillContainer: false,
    // Autofocus configuration
    autofocus: false,
    darkMode: false,
    activePanel: "config",
    showInspector: false,
    enableTaskExtension: false,
    maxCharacters: undefined,
    editable: true,
    seamless: false,
    notionMode: false,
    floatingToolbar: false,
    disabled: false,
    showEditToggle: false,
  });

  private _isTaskTestSession = false;

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
  private _toolbarConfig = signal<Partial<AteToolbarConfig>>(ATE_DEFAULT_TOOLBAR_CONFIG);
  private _bubbleMenuConfig = signal<Partial<AteBubbleMenuConfig>>(ATE_DEFAULT_BUBBLE_MENU_CONFIG);
  // Changed _activeSlashCommands to _slashCommandsConfig and initialized with DEFAULT_SLASH_COMMANDS_CONFIG
  private _nativeSlashCommands = signal<Record<AteSlashCommandKey, boolean>>(ATE_DEFAULT_SLASH_COMMANDS_CONFIG);
  private _isMagicTemplateEnabled = signal<boolean>(false);
  private _magicTemplateTitle = signal<string>("");

  // Signaux publics (lecture seule)
  readonly editorState = this._editorState.asReadonly();
  readonly menuState = this._menuState.asReadonly();
  readonly demoContent = this._demoContent.asReadonly();
  readonly toolbarConfig = this._toolbarConfig.asReadonly();
  readonly bubbleMenuConfig = this._bubbleMenuConfig.asReadonly();

  // Slash commands config is now computed to be reactive to translations
  readonly slashCommandsConfig = computed<AteSlashCommandsConfig>(() => {
    const natives = this._nativeSlashCommands();
    const isMagicEnabled = this._isMagicTemplateEnabled();

    const customs = [];

    if (isMagicEnabled) {
      const t = this.appI18nService.translations().items;
      const customTitle = this._magicTemplateTitle() || t.customMagicTitle;
      customs.push({
        title: customTitle,
        description: t.customMagicDesc,
        icon: "auto_awesome",
        keywords: ["magic", "template", "structure"],
        command: (editor: Editor) => {
          editor.commands.insertContent(
            `<h3>✨ ${customTitle}</h3><p>This was inserted by a <strong>custom command</strong> using the <em>native editor API</em>!</p>`
          );
        },
      });
    }

    // Task is only there if extension is enabled
    if (this._editorState().enableTaskExtension) {
      const et = this.appI18nService.translations().items;
      customs.push({
        title: et.task,
        description: et.taskDesc,
        icon: "task_alt",
        keywords: ["task", "custom", "node"],
        command: (editor: Editor) => {
          editor
            .chain()
            .focus()
            .insertContent('<ul data-type="taskList"><li data-type="taskItem" data-checked="false"></li></ul>')
            .run();
        },
      });
    }

    return {
      ...natives,
      custom: customs,
    } as AteSlashCommandsConfig;
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
    // Check for URL parameters to enable extensions on reload
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("tasks") === "true") {
        this._isTaskTestSession = true;
        this._editorState.update(state => ({ ...state, enableTaskExtension: true }));

        // Clean URL to keep it pretty
        const url = new URL(window.location.href);
        url.searchParams.delete("tasks");
        window.history.replaceState({}, "", url.toString());
      }
    }

    // Update content when language changes
    effect(() => {
      // Re-trigger when language changes
      const locale = this.ateI18nService.currentLocale();

      this._editorState.update(state => ({
        ...state,
        locale: locale === "fr" ? "fr" : undefined,
      }));
      this.initializeDemoContent();
    });

    // Update editor placeholder based on language
    effect(() => {
      const editorTranslations = this.ateI18nService.editor();
      this._editorState.update(state => ({
        ...state,
        placeholder: editorTranslations.placeholder,
      }));
    });

    this.initializeDemoContent();
  }

  // Methods for editor state
  updateEditorState(partialState: Partial<EditorState>) {
    this._editorState.update(state => ({ ...state, ...partialState }));
  }

  updateMenuState(partialState: Partial<MenuState>) {
    this._menuState.update(state => ({ ...state, ...partialState }));
  }

  updateDemoContent(content: string) {
    this._demoContent.set(content);
  }

  // Methods for configurations
  toggleToolbarItem(key: string) {
    this._toolbarConfig.update(config => ({
      ...config,
      [key]: !(config as Record<string, boolean>)[key],
    }));
  }

  setActivePanel(panel: "none" | "config" | "theme") {
    this._editorState.update(state => ({
      ...state,
      activePanel: panel,
      showSidebar: panel === "config",
    }));
  }

  togglePanel(panel: "config" | "theme") {
    const current = this._editorState().activePanel;
    if (current === panel) {
      this.setActivePanel("none");
    } else {
      this.setActivePanel(panel);
    }
  }

  toggleBubbleMenuItem(key: string) {
    this._bubbleMenuConfig.update(config => ({
      ...config,
      [key]: !(config as Record<string, boolean>)[key],
    }));
  }

  // Updated toggleSlashCommand to work with separate states
  toggleSlashCommand(key: string) {
    if (key === "custom_magic") {
      this._isMagicTemplateEnabled.update(v => !v);
      return;
    }

    this._nativeSlashCommands.update(config => ({
      ...config,
      [key as AteSlashCommandKey]: !config[key as AteSlashCommandKey],
    }));
  }

  // Verification methods
  isToolbarItemActive(key: string): boolean {
    const config = this._toolbarConfig() as Record<string, boolean>;
    return !!config[key];
  }

  isBubbleMenuItemActive(key: string): boolean {
    const config = this._bubbleMenuConfig() as Record<string, boolean>;
    return !!config[key];
  }

  // Updated isSlashCommandActive to work with separate states
  isSlashCommandActive(key: string): boolean {
    if (key === "custom_magic") {
      return this._isMagicTemplateEnabled();
    }
    return !!this._nativeSlashCommands()[key as AteSlashCommandKey];
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
    switch (key) {
      case "enableScroll":
        // Activer le scroll en définissant une hauteur max par défaut
        this._editorState.update(state => ({
          ...state,
          maxHeight: state.maxHeight ? undefined : 400,
        }));
        break;
      case "fixedHeight":
        // Toggle between fixed height and auto
        this._editorState.update(state => ({
          ...state,
          height: state.height ? undefined : 300,
        }));
        break;
      case "maxHeight":
        // Toggle between max height and none
        this._editorState.update(state => ({
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
    this._editorState.update(state => ({
      ...state,
      fillContainer: !state.fillContainer,
    }));
  }

  // Dark mode toggle
  toggleDarkMode() {
    this._editorState.update(state => ({
      ...state,
      darkMode: !state.darkMode,
    }));
  }

  // Seamless mode toggle
  toggleSeamless() {
    this._editorState.update(state => ({
      ...state,
      seamless: !state.seamless,
    }));
  }

  // Notion mode toggle
  toggleNotionMode() {
    const isNotion = !this._editorState().notionMode;

    this._editorState.update(state => ({
      ...state,
      notionMode: isNotion,
      // On synchronise l'état pour que le panneau de config reflète le mode
      showToolbar: !isNotion,
      showFooter: !isNotion,
      showBubbleMenu: true,
      showSlashCommandsMenu: true,
      showCharacterCount: !isNotion,
      showWordCount: !isNotion,
      seamless: isNotion,
      floatingToolbar: false,
    }));
  }

  // Floating Toolbar toggle
  toggleFloatingToolbar() {
    this._editorState.update(state => ({
      ...state,
      floatingToolbar: !state.floatingToolbar,
    }));
  }

  // Footer toggle
  toggleFooter() {
    this._editorState.update(state => ({
      ...state,
      showFooter: !state.showFooter,
    }));
  }

  // Disabled toggle
  toggleDisabled() {
    this._editorState.update(state => ({
      ...state,
      disabled: !state.disabled,
    }));
  }

  // Edit toggle toggle (the toggle that shows the toggle!)
  toggleEditToggle() {
    this._editorState.update(state => ({
      ...state,
      showEditToggle: !state.showEditToggle,
    }));
  }

  // Inspector toggle
  toggleInspector() {
    this._editorState.update(state => ({
      ...state,
      showInspector: !state.showInspector,
    }));
  }

  toggleEnableTaskExtension() {
    this._editorState.update(state => ({
      ...state,
      enableTaskExtension: !state.enableTaskExtension,
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
    this._toolbarConfig.set(ATE_DEFAULT_TOOLBAR_CONFIG);
    this._bubbleMenuConfig.set(ATE_DEFAULT_BUBBLE_MENU_CONFIG);
    // Updated to use DEFAULT_SLASH_COMMANDS_CONFIG
    this._nativeSlashCommands.set(ATE_DEFAULT_SLASH_COMMANDS_CONFIG);
    this._isMagicTemplateEnabled.set(false);

    this._editorState.update(state => ({
      ...state,
      showToolbar: true,
      showFooter: true,
      showBubbleMenu: true,
      showCharacterCount: true,
      showWordCount: true,
      enableSlashCommands: true,
      enableTaskExtension: false,
      maxCharacters: undefined,
      editable: true,
      seamless: false,
      notionMode: false,
      floatingToolbar: false,
      disabled: false,
      showEditToggle: true,
    }));

    this.closeAllMenus();
  }

  // Référence à l'éditeur et à son service de commandes (pour les actions directes)
  private _editorReference = signal<Editor | null>(null);
  private _commandsService = signal<AteEditorCommandsService | null>(null);

  // Méthode pour définir les références de l'éditeur
  setEditorReferences(editor: Editor, commands: AteEditorCommandsService) {
    this._editorReference.set(editor);
    this._commandsService.set(commands);
  }

  // Vider le contenu
  clearContent() {
    const editor = this._editorReference();
    const service = this._commandsService();

    if (editor && service) {
      // On utilise à nouveau le service de la librairie !
      service.clearContent(editor);
    } else if (editor) {
      editor.commands.clearContent(true);
    } else {
      this._demoContent.set("<p></p>");
    }
  }

  // Live reactive state from the editor component
  private _liveEditorState = signal<AteEditorStateSnapshot>(ATE_INITIAL_EDITOR_STATE);
  readonly liveEditorState = this._liveEditorState.asReadonly();

  setLiveEditorState(state: AteEditorStateSnapshot) {
    this._liveEditorState.set(state);
  }

  // Initialize demo content with translations
  private initializeDemoContent() {
    // If task extension is enabled via URL reload, we show the command directly
    if (this._isTaskTestSession) {
      const et = this.appI18nService.translations().items;
      this._demoContent.set(`<h2>${et.task}</h2><p>/task</p>`);
      return;
    }
    const translatedContent = this.appI18nService.generateDemoContent();
    this._demoContent.set(translatedContent);
  }
}
