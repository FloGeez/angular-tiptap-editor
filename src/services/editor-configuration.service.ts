import { Injectable, signal, computed, inject, effect } from "@angular/core";
import { firstValueFrom } from "rxjs";
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
  ATE_INITIAL_EDITOR_STATE,
  AteBlockControlsMode,
  AteEditorRegistry,
  AteTocVariant,
} from "angular-tiptap-editor";
import { EditorState, MenuState } from "../types/editor-config.types";
import { AppI18nService } from "./app-i18n.service";
import { ToastService } from "./toast.service";
import { simulateAiResponse } from "../utils/ai-utils";

export const DEFAULT_TOC_CONFIG = {
  enabled: true,
  floating: true,
  position: "right" as const,
  variant: "minimal" as AteTocVariant, // 'Minimal' variant by default
  hoverExpand: true,
  showTitle: true,
};

export const DEFAULT_EDITOR_STATE: EditorState = {
  showSidebar: false,
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
  placeholder: "Start typing...",
  locale: undefined,
  minHeight: undefined,
  height: undefined,
  maxHeight: undefined,
  fillContainer: false,
  autofocus: false,
  darkMode: false,
  activePanel: "none",
  showInspector: false,
  enableTaskExtension: false,
  maxCharacters: undefined,
  editable: true,
  seamless: false,
  notionMode: false,
  floatingToolbar: false,
  disabled: false,
  showEditToggle: false,
  blockControls: "none",
};

export const DEFAULT_MENU_STATE: MenuState = {
  showToolbarMenu: false,
  showBubbleMenuMenu: false,
  showSlashCommandsMenu: false,
  showHeightMenu: false,
};

@Injectable({
  providedIn: "root",
})
export class EditorConfigurationService {
  private ateI18nService = inject(AteI18nService);
  private appI18nService = inject(AppI18nService);
  private toastService = inject(ToastService);
  private registry = inject(AteEditorRegistry);

  // Editor state - Initialisé avec les constantes par défaut
  private _editorState = signal<EditorState>({ ...DEFAULT_EDITOR_STATE });

  private _isEditorHovered = signal<boolean>(false);
  readonly isEditorHovered = this._isEditorHovered.asReadonly();

  // Menu state
  private _menuState = signal<MenuState>({ ...DEFAULT_MENU_STATE });

  // Editor content (HTML — source de vérité, mis à jour à chaque contentChange)
  private _demoContent = signal("<p></p>");

  // Configurations
  private _toolbarConfig = signal<Partial<AteToolbarConfig>>(ATE_DEFAULT_TOOLBAR_CONFIG);
  private _bubbleMenuConfig = signal<Partial<AteBubbleMenuConfig>>(ATE_DEFAULT_BUBBLE_MENU_CONFIG);
  private _nativeSlashCommands = signal<Partial<AteSlashCommandsConfig>>(
    ATE_DEFAULT_SLASH_COMMANDS_CONFIG
  );
  private _isMagicTemplateEnabled = signal<boolean>(false);
  private _magicTemplateTitle = signal<string>("");
  private _isAiToolbarEnabled = signal<boolean>(false);
  private _isAiBubbleMenuEnabled = signal<boolean>(false);
  private _isAiBlockEnabled = signal<boolean>(false);
  private _isCounterEnabled = signal<boolean>(false);
  private _isWarningBoxEnabled = signal<boolean>(false);

  private _tocConfig = signal<{
    enabled: boolean;
    floating: boolean;
    position: "right" | "left";
    variant: AteTocVariant;
    hoverExpand: boolean;
    showTitle: boolean;
  }>({ ...DEFAULT_TOC_CONFIG });

  // Signaux publics (lecture seule)
  readonly editorState = this._editorState.asReadonly();
  readonly menuState = this._menuState.asReadonly();
  readonly demoContent = this._demoContent.asReadonly();
  readonly isAiBlockEnabled = this._isAiBlockEnabled.asReadonly();
  readonly tocConfig = this._tocConfig.asReadonly();

  updateTocConfig(
    partial: Partial<{
      enabled: boolean;
      floating: boolean;
      position: "right" | "left";
      variant: AteTocVariant;
      hoverExpand: boolean;
      showTitle: boolean;
    }>
  ) {
    this._tocConfig.update(curr => ({ ...curr, ...partial }));
  }

  // Live reactive content signals
  readonly liveHtml = this._demoContent.asReadonly();
  readonly liveMarkdown = computed(() => {
    this._demoContent();
    this.liveEditorState();
    const editorRef = this.registry.get();
    if (!editorRef) {
      return "";
    }
    return editorRef.getContent("markdown");
  });
  readonly isCounterEnabled = this._isCounterEnabled.asReadonly();
  readonly isWarningBoxEnabled = this._isWarningBoxEnabled.asReadonly();

  // Slash commands config
  readonly slashCommandsConfig = computed<AteSlashCommandsConfig>(() => {
    const natives = this._nativeSlashCommands();
    const isMagicEnabled = this._isMagicTemplateEnabled();
    const isAiBlockActive = this._isAiBlockEnabled();

    const customs = [];

    // AI Block Command
    if (isAiBlockActive) {
      const t = this.appI18nService.translations().items;
      customs.push({
        title: t.customAi,
        description: t.customAiDesc,
        icon: "psychology",
        keywords: ["ai", "assistant", "generate"],
        command: (editor: Editor) => {
          editor.commands.insertContent({ type: "aiBlock" });
        },
      });
    }

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

    // Counter Example
    if (this._isCounterEnabled()) {
      const t = this.appI18nService.translations().items;
      customs.push({
        title: t.counter,
        description: t.counterDesc,
        icon: "pin",
        keywords: ["counter", "number", "interactive"],
        command: (editor: Editor) => {
          editor
            .chain()
            .focus()
            .insertContent({ type: "counterNode", attrs: { count: 0 } })
            .run();
        },
      });
    }

    // Warning Box Example
    if (this._isWarningBoxEnabled()) {
      const t = this.appI18nService.translations().items;
      customs.push({
        title: t.warningBox,
        description: t.warningBoxDesc,
        icon: "warning",
        keywords: ["warning", "box"],
        command: (editor: Editor) => {
          editor
            .chain()
            .focus()
            .insertContent({
              type: "warningBox",
              content: [{ type: "text", text: "Attention ! Ceci est un avertissement..." }],
            })
            .run();
        },
      });
    }

    // Task Extension
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
            .insertContent(
              '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"></li></ul>'
            )
            .run();
        },
      });
    }

    return {
      ...natives,
      custom: customs,
    } as AteSlashCommandsConfig;
  });

  // Bubble Menu
  readonly bubbleMenuConfig = computed(() => {
    const base = this._bubbleMenuConfig();
    const isAiEnabled = this._isAiBubbleMenuEnabled();
    const t = this.appI18nService.translations().items;

    const config = { ...base };

    if (isAiEnabled) {
      config.custom = [
        {
          key: "ai_rewrite",
          label: t.customAi,
          icon: "psychology",
          command: async (editor: Editor) => {
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to, " ");

            if (!selectedText) {
              return;
            }

            editor.commands.insertContentAt(to, { type: "aiLoading" });
            const loadingPos = to + 1;

            const result = await firstValueFrom(
              simulateAiResponse(selectedText, this.appI18nService.codeGeneration())
            );
            editor.commands.insertContentAt({ from, to: loadingPos }, result as string);
          },
        },
      ];
    }

    return config as AteBubbleMenuConfig;
  });

  // Toolbar
  readonly toolbarConfig = computed(() => {
    const base = this._toolbarConfig();
    const isAiEnabled = this._isAiToolbarEnabled();
    const t = this.appI18nService.translations().items;

    const config = { ...base };

    if (isAiEnabled) {
      config.custom = [
        {
          key: "ai_toolbar_rewrite",
          label: t.customAi,
          icon: "psychology",
          command: async (editor: Editor) => {
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to, " ");

            if (!selectedText) {
              this.toastService.info("Select some text first to use the AI transform.");
              return;
            }

            editor.commands.insertContentAt(to, { type: "aiLoading" });
            const loadingPos = to + 1;

            const result = await firstValueFrom(
              simulateAiResponse(selectedText, this.appI18nService.codeGeneration())
            );
            editor.commands.insertContentAt({ from, to: loadingPos }, result as string);
          },
        },
      ];
    }

    return config as AteToolbarConfig;
  });

  readonly toolbarActiveCount = computed(() => {
    const config = this._toolbarConfig();
    const count = Object.values(config).filter(v => typeof v === "boolean" && v).length;
    return count + (this._isAiToolbarEnabled() ? 1 : 0);
  });

  readonly bubbleMenuActiveCount = computed(() => {
    const config = this._bubbleMenuConfig();
    const count = Object.values(config).filter(v => typeof v === "boolean" && v).length;
    return count + (this._isAiBubbleMenuEnabled() ? 1 : 0);
  });

  readonly slashCommandsActiveCount = computed(() => {
    const natives = this._nativeSlashCommands();
    const isMagicEnabled = this._isMagicTemplateEnabled();
    const isAiBlockEnabled = this._isAiBlockEnabled();
    const nativeCount = Object.values(natives).filter(Boolean).length;
    return nativeCount + (isMagicEnabled ? 1 : 0) + (isAiBlockEnabled ? 1 : 0);
  });

  constructor() {
    this.loadPersistedState();

    // Auto-save editor configuration state to localStorage
    effect(() => {
      this.savePersistedState();
    });

    // Update content when language changes
    effect(
      () => {
        const locale = this.ateI18nService.currentLocale();

        this._editorState.update(state => ({
          ...state,
          locale: locale === "fr" ? "fr" : undefined,
        }));
        this.initializeDemoContent();
      },
      { allowSignalWrites: true }
    );

    // Update editor placeholder based on language
    effect(
      () => {
        const editorTranslations = this.ateI18nService.editor();
        this._editorState.update(state => ({
          ...state,
          placeholder: editorTranslations.placeholder,
        }));
      },
      { allowSignalWrites: true }
    );

    this.initializeDemoContent();
  }

  private loadPersistedState() {
    try {
      const saved = localStorage.getItem("ate_demo_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.editorState) {
          this._editorState.update(s => ({ ...s, ...parsed.editorState }));
        }
        if (parsed.tocConfig) {
          this._tocConfig.set(parsed.tocConfig);
        }
      }
    } catch {
      // Storage access error fallback
    }
  }

  private savePersistedState() {
    try {
      const stateToSave = {
        editorState: this._editorState(),
        tocConfig: this._tocConfig(),
      };
      localStorage.setItem("ate_demo_config", JSON.stringify(stateToSave));
    } catch {
      // Storage access error fallback
    }
  }

  toggleAiBlockExample(enabled: boolean) {
    this._isAiBlockEnabled.set(enabled);
  }

  toggleCounterExample(enabled: boolean) {
    this._isCounterEnabled.set(enabled);
  }

  toggleWarningBoxExample(enabled: boolean) {
    this._isWarningBoxEnabled.set(enabled);
  }

  updateEditorState(partialState: Partial<EditorState>) {
    this._editorState.update(state => ({ ...state, ...partialState }));
  }

  setEditorHovered(hovered: boolean) {
    this._isEditorHovered.set(hovered);
  }

  updateMenuState(partialState: Partial<MenuState>) {
    this._menuState.update(state => ({ ...state, ...partialState }));
  }

  updateDemoContent(content: string) {
    this._demoContent.set(content);
  }

  toggleToolbarItem(key: string) {
    if (key === "custom_ai") {
      this._isAiToolbarEnabled.update(v => !v);
      return;
    }
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
    if (key === "custom_ai") {
      this._isAiBubbleMenuEnabled.update(v => !v);
      return;
    }
    this._bubbleMenuConfig.update(config => ({
      ...config,
      [key]: !(config as Record<string, boolean>)[key],
    }));
  }

  toggleSlashCommand(key: string) {
    if (key === "custom_magic") {
      this._isMagicTemplateEnabled.update(v => !v);
      return;
    }

    if (key === "custom_ai_block") {
      this._isAiBlockEnabled.update(v => !v);
      return;
    }

    if (key === "counter") {
      this._isCounterEnabled.update(v => !v);
      return;
    }

    if (key === "warningBox") {
      this._isWarningBoxEnabled.update(v => !v);
      return;
    }

    this._nativeSlashCommands.update(config => ({
      ...config,
      [key as AteSlashCommandKey]: !config[key as AteSlashCommandKey],
    }));
  }

  isToolbarItemActive(key: string): boolean {
    if (key === "custom_ai") {
      return this._isAiToolbarEnabled();
    }
    const config = this._toolbarConfig() as Record<string, boolean>;
    return !!config[key];
  }

  isBubbleMenuItemActive(key: string): boolean {
    if (key === "custom_ai") {
      return this._isAiBubbleMenuEnabled();
    }
    const config = this._bubbleMenuConfig() as Record<string, boolean>;
    return !!config[key];
  }

  isSlashCommandActive(key: string): boolean {
    if (key === "custom_magic") {
      return this._isMagicTemplateEnabled();
    }
    if (key === "custom_ai_block") {
      return this._isAiBlockEnabled();
    }
    if (key === "counter") {
      return this._isCounterEnabled();
    }
    if (key === "warningBox") {
      return this._isWarningBoxEnabled();
    }
    return !!this._nativeSlashCommands()[key as AteSlashCommandKey];
  }

  readonly magicTemplateTitle = computed(() => {
    return this._magicTemplateTitle() || this.appI18nService.translations().items.customMagicTitle;
  });

  updateMagicTemplateTitle(title: string) {
    this._magicTemplateTitle.set(title);
  }

  toggleHeightItem(key: string) {
    switch (key) {
      case "enableScroll":
        this._editorState.update(state => ({
          ...state,
          maxHeight: state.maxHeight ? undefined : 400,
        }));
        break;
      case "fixedHeight":
        this._editorState.update(state => ({
          ...state,
          height: state.height ? undefined : 300,
        }));
        break;
      case "maxHeight":
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
        return state.height !== undefined || state.maxHeight !== undefined;
      case "fixedHeight":
        return state.height !== undefined;
      case "maxHeight":
        return state.maxHeight !== undefined;
      default:
        return false;
    }
  }

  toggleFillContainer() {
    this._editorState.update(state => ({
      ...state,
      fillContainer: !state.fillContainer,
    }));
  }

  toggleDarkMode() {
    this._editorState.update(state => ({
      ...state,
      darkMode: !state.darkMode,
    }));
  }

  toggleSeamless() {
    this._editorState.update(state => ({
      ...state,
      seamless: !state.seamless,
    }));
  }

  toggleNotionMode() {
    const isNotion = !this._editorState().notionMode;

    this._editorState.update(state => ({
      ...state,
      notionMode: isNotion,
      showToolbar: !isNotion,
      showFooter: !isNotion,
      showBubbleMenu: true,
      showSlashCommandsMenu: true,
      showCharacterCount: !isNotion,
      showWordCount: !isNotion,
      seamless: isNotion,
      floatingToolbar: false,
      blockControls: isNotion ? "inside" : "none",
    }));
  }

  updateBlockControls(mode: AteBlockControlsMode) {
    this._editorState.update(state => ({
      ...state,
      blockControls: mode,
    }));
  }

  toggleFloatingToolbar() {
    this._editorState.update(state => ({
      ...state,
      floatingToolbar: !state.floatingToolbar,
    }));
  }

  toggleFooter() {
    this._editorState.update(state => ({
      ...state,
      showFooter: !state.showFooter,
    }));
  }

  toggleDisabled() {
    this._editorState.update(state => ({
      ...state,
      disabled: !state.disabled,
    }));
  }

  toggleEditToggle() {
    this._editorState.update(state => ({
      ...state,
      showEditToggle: !state.showEditToggle,
    }));
  }

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

  closeAllMenus() {
    this._menuState.set({ ...DEFAULT_MENU_STATE });
  }

  // Reset to default values - Réinitialisation 100% complète de TOUS les états
  resetToDefaults() {
    try {
      localStorage.removeItem("ate_demo_config");
    } catch {
      // Storage access error fallback
    }

    const currentSidebar = this._editorState().showSidebar;
    const currentActivePanel = this._editorState().activePanel;

    // Reset toolbar, bubble menu, slash commands
    this._toolbarConfig.set(ATE_DEFAULT_TOOLBAR_CONFIG);
    this._bubbleMenuConfig.set(ATE_DEFAULT_BUBBLE_MENU_CONFIG);
    this._nativeSlashCommands.set(ATE_DEFAULT_SLASH_COMMANDS_CONFIG);

    // Reset custom extensions & options
    this._isMagicTemplateEnabled.set(false);
    this._magicTemplateTitle.set("");
    this._isAiToolbarEnabled.set(false);
    this._isAiBubbleMenuEnabled.set(false);
    this._isAiBlockEnabled.set(true);
    this._isCounterEnabled.set(false);
    this._isWarningBoxEnabled.set(false);

    // Reset TOC config to defaults ('transparent' / Clear variant)
    this._tocConfig.set({ ...DEFAULT_TOC_CONFIG });

    // Reset editor state
    this._editorState.set({
      ...DEFAULT_EDITOR_STATE,
      placeholder: this.ateI18nService.editor().placeholder,
      showSidebar: currentSidebar,
      activePanel: currentActivePanel,
    });

    this.closeAllMenus();
  }

  clearContent() {
    const editorRef = this.registry.get();
    if (editorRef) {
      editorRef.clearContent();
    } else {
      this._demoContent.set("<p></p>");
    }
  }

  async exportContent(
    format: "html" | "markdown" | "text",
    method: "clipboard" | "download"
  ): Promise<boolean> {
    const editorRef = this.registry.get();
    if (!editorRef) {
      return false;
    }
    try {
      await editorRef.exportAs(format, method);
      return true;
    } catch {
      return false;
    }
  }

  readonly liveEditorState = computed(() => {
    const editorRef = this.registry.get();
    return editorRef ? editorRef.stateSignal() : ATE_INITIAL_EDITOR_STATE;
  });

  private initializeDemoContent() {
    const translatedContent = this.appI18nService.generateDemoContent();
    this._demoContent.set(translatedContent);
  }
}
