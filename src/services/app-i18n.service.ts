import { Injectable, signal, computed, inject } from "@angular/core";
import { SupportedLocale, AteI18nService } from "angular-tiptap-editor";

export interface CodeGeneration {
  // General comments
  toolbarConfigComment: string;
  bubbleMenuConfigComment: string;
  slashCommandsConfigComment: string;

  // Placeholder content
  placeholderContent: string;

  // Logs and messages
  contentChangedLog: string;
  commandImplementation: string;
  implementImageUpload: string;
  aiServiceComment: string;
  aiTransformationPrefix: string;
  aiRealIntegrationComment: string;
}

export interface AppTranslations {
  // General interface
  ui: {
    configuration: string;
    close: string;
    reset: string;
    resetToDefaults: string;
    copyCode: string;
    clearEditor: string;
    clear: string;
    editor: string;
    code: string;
    copy: string;
    language: string;
    autoDetect: string;
    autoDetection: string;
    english: string;
    french: string;
    currentLanguage: string;
    clickToChange: string;
    copied: string;
    inspector: string;
    openInspector: string;
    closeInspector: string;
    github: string;
    npm: string;
  };

  // Configuration sections
  config: {
    toolbar: string;
    bubbleMenu: string;
    slashCommands: string;
    height: string;
    heightSettings: string;
    footer: string;
    footerSettings: string;
    autofocus: string;
    autofocusSettings: string;
    language: string;
    editorLanguage: string;
    showToolbar: string;
    showBubbleMenu: string;
    enableSlashCommands: string;
    selectOptions: string;
    hideOptions: string;
    showOptions: string;
    options: string;
    active: string;
    inactive: string;
    extensions: string;
    extensionSettings: string;
    editable: string;
    seamless: string;
    notionMode: string;
    floatingToolbar: string;
    showFooter: string;
    showEditToggle: string;
    variant: string;
    blockControls: string;
  };

  // Messages and notifications
  messages: {
    configurationReset: string;
    codeCopied: string;
    editorCleared: string;
    languageChanged: string;
    autoDetected: string;
    generateCode: string;
    codeGenerated: string;
    copyToClipboard: string;
    copiedToClipboard: string;
    errorCopying: string;
    unsupportedBrowser: string;
    heightConfigInfo: string;
  };

  // Tooltips
  tooltips: {
    toggleSidebar: string;
    closeSidebar: string;
    resetConfiguration: string;
    copyGeneratedCode: string;
    clearEditorContent: string;
    switchToEditor: string;
    switchToCode: string;
    changeLanguage: string;
    autoDetectLanguage: string;
    showToolbarOptions: string;
    showBubbleMenuOptions: string;
    showSlashCommandOptions: string;
  };

  // Titles and sections
  titles: {
    editorDemo: string;
    configurationPanel: string;
    generatedCode: string;
    editorSettings: string;
    interfaceSettings: string;
    languageSettings: string;
    toolbarSettings: string;
    bubbleMenuSettings: string;
    slashCommandsSettings: string;
    themeCustomizer: string;
  };

  // Theme Customizer
  theme: {
    resetTheme: string;
    light: string;
    dark: string;
    // Sections
    accents: string;
    surfaces: string;
    typography: string;
    blocks: string;
    geometry: string;
    moreVariables: string;
    // Variable names
    primaryColor: string;
    borderColor: string;
    contentBackground: string;
    toolbarBackground: string;
    menuBackground: string;
    mainText: string;
    secondaryText: string;
    mutedText: string;
    inlineCodeBackground: string;
    inlineCodeText: string;
    codeBlockBackground: string;
    codeBlockText: string;
    blockquoteBorder: string;
    highlightColor: string;
    borderRadius: string;
    borderWidth: string;
    contentPaddingBlock: string;
    contentPaddingInline: string;
    contentGutter: string;
    // UI
    moreCssVariables: string;
    cssVariablesInfo: string;
    cssVariablesHint: string;
    copyCssToClipboard: string;
    openThemeCustomizer: string;
  };

  // Status
  status: {
    ready: string;
    loading: string;
    error: string;
    success: string;
    saved: string;
    generating: string;
    copying: string;
    resetting: string;
    clearing: string;
    switching: string;
  };

  // Demo content
  demoContent: {
    title: string;
    subtitle: string;
    basicFeaturesTitle: string;
    basicFeaturesIntro: string;
    boldText: string;
    italicText: string;
    underlineText: string;
    strikeText: string;
    codeText: string;
    listsTitle: string;
    listsIntro: string;
    firstItem: string;
    secondItem: string;
    thirdItem: string;
    quote: string;
    multimediaTitle: string;
    multimediaIntro: string;
    imageCaption: string;
    tablesTitle: string;
    tablesIntro: string;
    tablesTryText: string;
    tableHeaders: {
      name: string;
      age: string;
      city: string;
      profession: string;
      email: string;
      phone: string;
    };
    shortcutsTitle: string;
    shortcutsIntro: string;
    slashCommand: string;
    bubbleMenu: string;
    boldShortcut: string;
    italicShortcut: string;
    reactiveFormsTitle: string;
    reactiveFormsIntro: string;
    componentComment: string;
    templateComment: string;
    customizationTitle: string;
    customizationIntro: string;
    customizationItems: {
      toolbar: string;
      buttons: string;
      bubbleMenu: string;
      slashCommands: string;
      aiAssistant: string;
    };
    imageUploadTitle: string;
    imageUploadIntro: string;
    conclusion: string;
    makeItYourOwnTitle: string;
    makeItYourOwnIntro: string;
  };

  // Hints
  hints: {
    customize: string;
    configure: string;
  };

  codeGeneration: CodeGeneration;

  // Editor item labels
  items: {
    // Toolbar items
    bold: string;
    italic: string;
    underline: string;
    strike: string;
    code: string;
    superscript: string;
    subscript: string;
    highlight: string;
    highlightPicker: string;
    heading1: string;
    heading2: string;
    heading3: string;
    bulletList: string;
    orderedList: string;
    blockquote: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    alignJustify: string;
    link: string;
    image: string;
    horizontalRule: string;
    undo: string;
    redo: string;
    separator: string;
    table: string;
    clear: string;
    textColor: string;

    // Configuration hauteur
    fixedHeight: string;
    maxHeight: string;
    // Options autofocus
    autofocusOff: string;
    autofocusStart: string;
    autofocusEnd: string;
    autofocusAll: string;
    // Commandes personnalisées
    customMagic: string;
    customMagicTitle: string;
    customMagicDesc: string;
    inspector: string;
    inspectorDesc: string;
    task: string;
    taskDesc: string;
    customAi: string;
    customAiDesc: string;
    counter: string;
    counterDesc: string;
    warningBox: string;
    warningBoxDesc: string;
    aiThinking: string;
    blockControlsInside: string;
    blockControlsOutside: string;
    blockControlsNone: string;
  };
}

const ENGLISH_APP_TRANSLATIONS: AppTranslations = {
  ui: {
    configuration: "Configuration",
    close: "Close",
    reset: "Reset",
    resetToDefaults: "Reset to defaults",
    copyCode: "Copy code",
    clearEditor: "Clear editor",
    clear: "Clear",
    editor: "Editor",
    code: "Code",
    copy: "Copy",
    language: "Language",
    autoDetect: "Auto-detect",
    autoDetection: "Auto-detection",
    english: "English",
    french: "French",
    currentLanguage: "Current language",
    clickToChange: "Click to change language",
    copied: "Copied!",
    inspector: "Editor Inspector",
    openInspector: "Open Reactive Inspector",
    closeInspector: "Close Inspector",
    github: "GitHub Repository",
    npm: "NPM Package",
  },
  config: {
    toolbar: "Toolbar",
    bubbleMenu: "Bubble Menu",
    slashCommands: "Slash Commands",
    height: "Height",
    heightSettings: "Height settings",
    footer: "Footer",
    footerSettings: "Footer settings",
    autofocus: "Autofocus",
    autofocusSettings: "Autofocus mode",
    language: "Language",
    editorLanguage: "Editor language",
    showToolbar: "Show toolbar",
    showBubbleMenu: "Show bubble menu",
    enableSlashCommands: "Enable slash commands",
    selectOptions: "Select options",
    hideOptions: "Hide options",
    showOptions: "Show options",
    options: "options",
    active: "Active",
    inactive: "Inactive",
    extensions: "Extensions",
    extensionSettings: "Extension settings",
    editable: "Editable mode",
    seamless: "Seamless mode (minimalist)",
    notionMode: "Notion mode",
    floatingToolbar: "Floating toolbar",
    showFooter: "Show footer",
    showEditToggle: "Show edit toggle button",
    variant: "Editor Variant (Default/Naked)",
    blockControls: "Block Controls (Plus/Drag)",
  },
  messages: {
    configurationReset: "Configuration reset to defaults",
    codeCopied: "Code copied to clipboard",
    editorCleared: "Editor content cleared",
    languageChanged: "Language changed",
    autoDetected: "Language auto-detected",
    generateCode: "Generate code",
    codeGenerated: "Code generated successfully",
    copyToClipboard: "Copy to clipboard",
    copiedToClipboard: "Copied to clipboard",
    errorCopying: "Error copying to clipboard",
    unsupportedBrowser: "Clipboard not supported in this browser",
    heightConfigInfo: "Scroll is automatically calculated when a height is defined",
  },
  tooltips: {
    toggleSidebar: "Toggle configuration panel",
    closeSidebar: "Close configuration panel",
    resetConfiguration: "Reset configuration to defaults",
    copyGeneratedCode: "Copy generated code to clipboard",
    clearEditorContent: "Clear editor content",
    switchToEditor: "Switch to editor mode",
    switchToCode: "Switch to code mode",
    changeLanguage: "Change language",
    autoDetectLanguage: "Auto-detect browser language",
    showToolbarOptions: "Show toolbar options",
    showBubbleMenuOptions: "Show bubble menu options",
    showSlashCommandOptions: "Show slash command options",
  },
  titles: {
    editorDemo: "Angular Tiptap Editor Demo",
    configurationPanel: "Configuration Panel",
    generatedCode: "Generated Code",
    editorSettings: "Editor Settings",
    interfaceSettings: "Interface Settings",
    languageSettings: "Language Settings",
    toolbarSettings: "Toolbar Settings",
    bubbleMenuSettings: "Bubble Menu Settings",
    slashCommandsSettings: "Slash Commands Settings",
    themeCustomizer: "Theme Customizer",
  },
  theme: {
    resetTheme: "Reset Theme",
    light: "Light",
    dark: "Dark",
    // Sections
    accents: "Branding & Accents",
    surfaces: "Editor Surfaces",
    typography: "Typography",
    blocks: "Special Blocks",
    geometry: "Shapes & Radius",
    moreVariables: "Advanced Variables",
    // Variable names
    primaryColor: "Primary Action",
    borderColor: "Global Borders",
    contentBackground: "Canvas Background",
    toolbarBackground: "Toolbar Area",
    menuBackground: "Floating Menus (Menus BG)",
    mainText: "Primary Text color",
    secondaryText: "Secondary Text color",
    mutedText: "Placeholder Text",
    inlineCodeBackground: "Inline Code BG",
    inlineCodeText: "Inline Code Text",
    codeBlockBackground: "Code Block BG",
    codeBlockText: "Code Block Text",
    blockquoteBorder: "Quote Border",
    highlightColor: "Text Highlight",
    borderRadius: "Corner Radius",
    borderWidth: "Border Width",
    contentPaddingBlock: "Vertical Padding (Block)",
    contentPaddingInline: "Horizontal Padding (Inline)",
    contentGutter: "Extra Gutter (Forced)",
    // UI
    moreCssVariables: "More CSS Variables",
    cssVariablesInfo:
      "You can customize more properties via CSS. Add these variables to your stylesheet:",
    cssVariablesHint: "See documentation for the full list of available CSS variables.",
    copyCssToClipboard: "Copy CSS to Clipboard",
    openThemeCustomizer: "Open Theme Customizer",
  },
  status: {
    ready: "Ready",
    loading: "Loading",
    error: "Error",
    success: "Success",
    saved: "Saved",
    generating: "Generating",
    copying: "Copying",
    resetting: "Resetting",
    clearing: "Clearing",
    switching: "Switching",
  },
  demoContent: {
    title: "Angular Tiptap Editor",
    subtitle: "A batteries-included Angular Rich Text Editor built on top of Tiptap.",
    basicFeaturesTitle: "Formatting",
    basicFeaturesIntro: "",
    boldText: "Bold",
    italicText: "Italic",
    underlineText: "Underlined",
    strikeText: "Strikethrough",
    codeText: "Code",
    listsTitle: "Lists",
    listsIntro: "",
    firstItem: "Unordered item",
    secondItem: "Ordered item",
    thirdItem: "Link to",
    quote: "Sample blockquote with italic styling.",
    multimediaTitle: "Media",
    multimediaIntro: "",
    imageCaption: "Resizable image support.",
    tablesTitle: "Tables",
    tablesIntro: "Create and edit tables with advanced features:",
    tablesTryText: "Try selecting cells, adding rows/columns, and using table actions!",
    tableHeaders: {
      name: "Name",
      age: "Age",
      city: "City",
      profession: "Profession",
      email: "Email",
      phone: "Phone",
    },
    shortcutsTitle: "Quick Actions",
    shortcutsIntro: "",
    slashCommand: "<strong>/</strong> for <strong>slash commands</strong>",
    bubbleMenu: "Select text for <strong>bubble menu</strong>",
    boldShortcut: "Ctrl+B",
    italicShortcut: "Ctrl+I",
    reactiveFormsTitle: "Reactive Forms Integration",
    reactiveFormsIntro: "Use with Angular form controls:",
    componentComment: "Component",
    templateComment: "Template",
    customizationTitle: "Features",
    customizationIntro: "",
    customizationItems: {
      toolbar: "Customizable toolbar",
      buttons: "Toggle buttons",
      bubbleMenu: "Bubble menu",
      slashCommands: "Slash commands",
      aiAssistant: "AI Assistant (custom command)",
    },
    imageUploadTitle: "Custom Image Upload",
    imageUploadIntro: "Upload images to your own server:",
    conclusion: "Try the configuration panel →",
    makeItYourOwnTitle: "Make it your own",
    makeItYourOwnIntro: "← Try the theme customizer panel to match your style",
  },
  hints: {
    customize: "Make it yours",
    configure: "Configure it",
  },
  codeGeneration: {
    // General comments
    toolbarConfigComment: "Toolbar configuration",
    bubbleMenuConfigComment: "Bubble menu configuration",
    slashCommandsConfigComment: "Slash commands configuration",

    // Placeholder content
    placeholderContent: "Start typing your content here...",

    // Logs and messages
    contentChangedLog: "Content changed:",
    commandImplementation: "Implementation for",
    implementImageUpload: "Implement image upload",
    aiServiceComment: "SIMULATED AI SERVICE",
    aiTransformationPrefix: "AI TRANSFORMATION:",
    aiRealIntegrationComment:
      'In a real integration, this is where your AI model\'s output would appear. Check the "Code" mode of this demo to see how to implement async custom commands. Here we are just going to uppercase your text:',
  },

  items: {
    bold: "Bold",
    italic: "Italic",
    underline: "Underline",
    strike: "Strikethrough",
    code: "Code",
    superscript: "Superscript",
    subscript: "Subscript",
    highlight: "Highlight",
    highlightPicker: "Background Color",
    heading1: "Heading 1",
    heading2: "Heading 2",
    heading3: "Heading 3",
    bulletList: "Bullet List",
    orderedList: "Ordered List",
    blockquote: "Blockquote",
    alignLeft: "Align Left",
    alignCenter: "Align Center",
    alignRight: "Align Right",
    alignJustify: "Justify",
    link: "Link",
    image: "Image",
    horizontalRule: "Horizontal Rule",
    undo: "Undo",
    redo: "Redo",
    separator: "Separator",
    table: "Table",
    clear: "Clear",
    textColor: "Text Color",

    // Height configuration
    fixedHeight: "Fixed height",
    maxHeight: "Max height",
    // Autofocus options
    autofocusOff: "Disabled",
    autofocusStart: "Start of document",
    autofocusEnd: "End of document",
    autofocusAll: "Select all",
    // Custom commands
    customMagic: "Magic Command",
    customMagicTitle: "Magic Template",
    customMagicDesc: "Insert complex structure",
    inspector: "State Inspector",
    inspectorDesc: "Real-time reactive monitor",
    task: "Task List",
    taskDesc: "Interactive checklist with completion tracking",
    customAi: "AI Assistant",
    customAiDesc: "Transform text with real-time AI (Demo)",
    counter: "Interactive Counter",
    counterDesc: "TipTap-aware Component (Approach 1)",
    warningBox: "Warning Box",
    warningBoxDesc: "Standard Angular Component (Approach 2)",
    aiThinking: "AI is thinking...",
    blockControlsInside: "Inside (Padding)",
    blockControlsOutside: "Outside (Margin)",
    blockControlsNone: "Disabled",
  },
};

const FRENCH_APP_TRANSLATIONS: AppTranslations = {
  ui: {
    configuration: "Configuration",
    close: "Fermer",
    reset: "Réinitialiser",
    resetToDefaults: "Réinitialiser aux valeurs par défaut",
    copyCode: "Copier le code",
    clearEditor: "Vider l'éditeur",
    clear: "Vider",
    editor: "Éditeur",
    code: "Code",
    copy: "Copier",
    language: "Langue",
    autoDetect: "Détection automatique",
    autoDetection: "Détection automatique",
    english: "Anglais",
    french: "Français",
    currentLanguage: "Langue actuelle",
    clickToChange: "Cliquer pour changer la langue",
    copied: "Copié !",
    inspector: "Inspecteur d'Éditeur",
    openInspector: "Ouvrir l'Inspecteur Réactif",
    closeInspector: "Fermer l'Inspecteur",
    github: "Dépôt GitHub",
    npm: "Paquet NPM",
  },
  config: {
    toolbar: "Barre d'outils",
    bubbleMenu: "Menu contextuel",
    slashCommands: "Commandes slash",
    height: "Hauteur",
    heightSettings: "Paramètres de hauteur",
    footer: "Pied de page",
    footerSettings: "Paramètres du pied de page",
    autofocus: "Autofocus",
    autofocusSettings: "Mode autofocus",
    language: "Langue",
    editorLanguage: "Langue de l'éditeur",
    showToolbar: "Afficher la barre d'outils",
    showBubbleMenu: "Afficher le menu contextuel",
    enableSlashCommands: "Activer les commandes slash",
    selectOptions: "Sélectionner les options",
    hideOptions: "Masquer les options",
    showOptions: "Afficher les options",
    options: "options",
    active: "Actif",
    inactive: "Inactif",
    extensions: "Extensions",
    extensionSettings: "Paramètres des extensions",
    editable: "Mode édition",
    seamless: "Mode sans bordures (Seamless)",
    notionMode: "Mode Notion",
    floatingToolbar: "Barre d'outils flottante",
    showFooter: "Afficher le pied de page",
    showEditToggle: "Afficher le bouton de bascule d'édition",
    variant: "Variante (Défaut/Naked)",
    blockControls: "Contrôles de bloc (Plus/Drag)",
  },
  messages: {
    configurationReset: "Configuration réinitialisée aux valeurs par défaut",
    codeCopied: "Code copié dans le presse-papiers",
    editorCleared: "Contenu de l'éditeur effacé",
    languageChanged: "Langue changée",
    autoDetected: "Langue détectée automatiquement",
    generateCode: "Générer le code",
    codeGenerated: "Code généré avec succès",
    copyToClipboard: "Copier dans le presse-papiers",
    copiedToClipboard: "Copié dans le presse-papiers",
    errorCopying: "Erreur lors de la copie",
    unsupportedBrowser: "Presse-papiers non pris en charge dans ce navigateur",
    heightConfigInfo: "Le scroll se calcule automatiquement quand une hauteur est définie",
  },
  tooltips: {
    toggleSidebar: "Basculer le panneau de configuration",
    closeSidebar: "Fermer le panneau de configuration",
    resetConfiguration: "Réinitialiser la configuration aux valeurs par défaut",
    copyGeneratedCode: "Copier le code généré dans le presse-papiers",
    clearEditorContent: "Effacer le contenu de l'éditeur",
    switchToEditor: "Passer en mode éditeur",
    switchToCode: "Passer en mode code",
    changeLanguage: "Changer la langue",
    autoDetectLanguage: "Détecter automatiquement la langue du navigateur",
    showToolbarOptions: "Afficher les options de la barre d'outils",
    showBubbleMenuOptions: "Afficher les options du menu contextuel",
    showSlashCommandOptions: "Afficher les options des commandes slash",
  },
  titles: {
    editorDemo: "Démo de l'éditeur Tiptap",
    configurationPanel: "Panneau de configuration",
    generatedCode: "Code généré",
    editorSettings: "Paramètres de l'éditeur",
    interfaceSettings: "Paramètres de l'interface",
    languageSettings: "Paramètres de langue",
    toolbarSettings: "Paramètres de la barre d'outils",
    bubbleMenuSettings: "Paramètres du menu contextuel",
    slashCommandsSettings: "Paramètres des commandes slash",
    themeCustomizer: "Personnalisation du thème",
  },
  theme: {
    resetTheme: "Réinitialiser",
    light: "Clair",
    dark: "Sombre",
    // Sections
    accents: "Identité & Accents",
    surfaces: "Espaces & Menus",
    typography: "Typographie",
    blocks: "Blocs Spéciaux",
    geometry: "Formes & Arrondis",
    moreVariables: "Variables Avancées",
    // Variable names
    primaryColor: "Couleur d'Action",
    borderColor: "Bordures Globales",
    contentBackground: "Fond de Rédaction (Canvas)",
    toolbarBackground: "Espace Barre d'outils",
    menuBackground: "Fonds des Menus",
    mainText: "Texte Principal",
    secondaryText: "Texte Secondaire",
    mutedText: "Placeholder (Indication)",
    inlineCodeBackground: "Fond du Code (Inline)",
    inlineCodeText: "Texte du Code (Inline)",
    codeBlockBackground: "Fond du Code (Bloc)",
    codeBlockText: "Texte du Code (Bloc)",
    blockquoteBorder: "Bordure de Citation",
    highlightColor: "Surlignage Sélection",
    borderRadius: "Arrondi des Angles",
    borderWidth: "Épaisseur Bordures",
    contentPaddingBlock: "Marge Verticale (Block)",
    contentPaddingInline: "Marge Horiz. (Inline)",
    contentGutter: "Gouttière (Extra/Forcé)",
    // UI
    moreCssVariables: "Plus de variables CSS",
    cssVariablesInfo:
      "Vous pouvez personnaliser plus de propriétés via CSS. Ajoutez ces variables à votre feuille de style :",
    cssVariablesHint:
      "Consultez la documentation pour la liste complète des variables CSS disponibles.",
    copyCssToClipboard: "Copier le CSS",
    openThemeCustomizer: "Ouvrir la personnalisation du thème",
  },
  status: {
    ready: "Prêt",
    loading: "Chargement",
    error: "Erreur",
    success: "Succès",
    saved: "Sauvegardé",
    generating: "Génération",
    copying: "Copie",
    resetting: "Réinitialisation",
    clearing: "Effacement",
    switching: "Changement",
  },
  demoContent: {
    title: "Angular Tiptap Editor",
    subtitle: "Un éditeur de texte riche Angular clé en main, propulsé par Tiptap.",
    basicFeaturesTitle: "Formatage",
    basicFeaturesIntro: "",
    boldText: "Gras",
    italicText: "Italique",
    underlineText: "Souligné",
    strikeText: "Barré",
    codeText: "Code",
    listsTitle: "Listes",
    listsIntro: "",
    firstItem: "Élément non ordonné",
    secondItem: "Élément ordonné",
    thirdItem: "Lien vers",
    quote: "Citation exemple avec style italique.",
    multimediaTitle: "Média",
    multimediaIntro: "",
    imageCaption: "Support d'images redimensionnables.",
    tablesTitle: "Tableaux",
    tablesIntro: "Créez et éditez des tableaux avec des fonctionnalités avancées :",
    tablesTryText:
      "Essayez de sélectionner des cellules, d'ajouter des lignes/colonnes et d'utiliser les actions de tableau !",
    tableHeaders: {
      name: "Nom",
      age: "Âge",
      city: "Ville",
      profession: "Profession",
      email: "Email",
      phone: "Téléphone",
    },
    shortcutsTitle: "Actions Rapides",
    shortcutsIntro: "",
    slashCommand: "<strong>/</strong> pour les <strong>commandes slash</strong>",
    bubbleMenu: "Sélectionnez du texte pour le <strong>menu flottant</strong>",
    boldShortcut: "Ctrl+B",
    italicShortcut: "Ctrl+I",
    reactiveFormsTitle: "Intégration Reactive Forms",
    reactiveFormsIntro: "Utilisation avec les form controls Angular :",
    componentComment: "Composant",
    templateComment: "Template",
    customizationTitle: "Fonctionnalités",
    customizationIntro: "",
    customizationItems: {
      toolbar: "Barre d'outils personnalisable",
      buttons: "Boutons configurables",
      bubbleMenu: "Menu flottant",
      slashCommands: "Commandes slash",
      aiAssistant: "Assistant IA (commande personnalisée)",
    },
    imageUploadTitle: "Upload d'images personnalisé",
    imageUploadIntro: "Uploadez les images vers votre serveur :",
    conclusion: "Testez le panneau de configuration →",
    makeItYourOwnTitle: "Personnalisez-le",
    makeItYourOwnIntro: "← Testez le panneau de personnalisation pour adapter à votre style.",
  },
  hints: {
    customize: "Personnalisez-le",
    configure: "Configurez-le",
  },
  codeGeneration: {
    // General comments
    toolbarConfigComment: "Configuration de la toolbar",
    bubbleMenuConfigComment: "Configuration du bubble menu",
    slashCommandsConfigComment: "Configuration des slash commands",

    // Placeholder content
    placeholderContent: "Commencez à taper votre contenu ici...",

    // Logs and messages
    contentChangedLog: "Contenu modifié :",
    commandImplementation: "Implémentation pour",
    implementImageUpload: "Implémenter l'upload d'image",
    aiServiceComment: "SERVICE IA SIMULÉ",
    aiTransformationPrefix: "TRANSFORMATION IA :",
    aiRealIntegrationComment:
      'Dans une intégration réelle, c\'est ici que le résultat de votre modèle IA apparaîtrait. Consultez le mode "Code" de cette démo pour voir comment implémenter des commandes personnalisées asynchrones. Ici, nous allons simplement mettre votre texte en majuscules :',
  },

  items: {
    bold: "Gras",
    italic: "Italique",
    underline: "Souligné",
    strike: "Barré",
    code: "Code",
    superscript: "Exposant",
    subscript: "Indice",
    highlight: "Surligner",
    highlightPicker: "Couleur de fond",
    heading1: "Titre 1",
    heading2: "Titre 2",
    heading3: "Titre 3",
    bulletList: "Liste à puces",
    orderedList: "Liste numérotée",
    blockquote: "Citation",
    alignLeft: "Aligner à gauche",
    alignCenter: "Centrer",
    alignRight: "Aligner à droite",
    alignJustify: "Justifier",
    link: "Lien",
    image: "Image",
    horizontalRule: "Ligne horizontale",
    undo: "Annuler",
    redo: "Refaire",
    separator: "Séparateur",
    table: "Tableau",
    clear: "Effacer",
    textColor: "Couleur du texte",

    // Height configuration
    fixedHeight: "Hauteur fixe",
    maxHeight: "Hauteur maximale",
    // Autofocus options
    autofocusOff: "Désactivé",
    autofocusStart: "Début du document",
    autofocusEnd: "Fin du document",
    autofocusAll: "Tout sélectionner",
    // Custom commands
    customMagic: "Commande Magique",
    customMagicTitle: "Modèle Magique",
    customMagicDesc: "Insérer une structure complexe",
    inspector: "Inspecteur d'État",
    inspectorDesc: "Moniteur réactif en temps réel",
    task: "Liste de tâches",
    taskDesc: "Liste de contrôle interactive avec suivi de progression",
    customAi: "Assistant IA",
    customAiDesc: "Transformation de texte par IA en temps réel (Démo)",
    counter: "Compteur Interactif",
    counterDesc: "Composant TipTap-aware (Approche 1)",
    warningBox: "Boîte d'Avertissement",
    warningBoxDesc: "Composant Angular Standard (Approche 2)",
    aiThinking: "L'IA réfléchit...",
    blockControlsInside: "Interne (Padding)",
    blockControlsOutside: "Externe (Marge)",
    blockControlsNone: "Désactivé",
  },
};

@Injectable({
  providedIn: "root",
})
export class AppI18nService {
  private ateI18nService = inject(AteI18nService);

  private _translations = signal<Record<SupportedLocale, AppTranslations>>({
    en: ENGLISH_APP_TRANSLATIONS,
    fr: FRENCH_APP_TRANSLATIONS,
  });

  // Public signals - synchronized with Tiptap service
  readonly currentLocale = this.ateI18nService.currentLocale;
  readonly translations = computed(() => this._translations()[this.currentLocale()]);

  // Quick access methods
  readonly ui = computed(() => this.translations().ui);
  readonly config = computed(() => this.translations().config);
  readonly titles = computed(() => this.translations().titles);
  readonly tooltips = computed(() => this.translations().tooltips);
  readonly messages = computed(() => this.translations().messages);
  readonly demoContent = computed(() => this.translations().demoContent);
  readonly codeGeneration = computed(() => this.translations().codeGeneration);
  readonly theme = computed(() => this.translations().theme);
  readonly items = computed(() => this.translations().items);
  readonly hints = computed(() => this.translations().hints);

  setLocale(locale: SupportedLocale) {
    this.ateI18nService.setLocale(locale);
  }

  generateDemoContent(): string {
    const content = this.demoContent();

    return `
<h1>${content.title}</h1>
<p>${content.subtitle}</p>

<h2>${content.shortcutsTitle}</h2>
<ul>
  <li> ${content.slashCommand} • ${content.bubbleMenu}</li>
  <li><code>${content.boldShortcut}</code> • <code>${content.italicShortcut}</code></li>
</ul>

<h2>${content.basicFeaturesTitle}</h2>
<ul>
  <li><strong>${content.boldText}</strong>, <em>${content.italicText}</em>, <u>${content.underlineText}</u>, <s>${content.strikeText}</s>, <code>${content.codeText}</code></li>
</ul>

<blockquote><p><em>${content.quote}</em></p></blockquote>

<h2>${content.multimediaTitle}</h2>
<img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop" class="tiptap-image" alt="Sample image">
<p><em>${content.imageCaption}</em></p>

<h2>${content.tablesTitle}</h2>
<p>${content.tablesIntro}</p>
<table>
  <tr>
    <th>${content.tableHeaders.name}</th>
    <th>${content.tableHeaders.age}</th>
    <th>${content.tableHeaders.city}</th>
    <th>${content.tableHeaders.profession}</th>
    <th>${content.tableHeaders.email}</th>
    <th>${content.tableHeaders.phone}</th>
  </tr>
  <tr>
    <td>Alice P.</td>
    <td>28</td>
    <td>Paris</td>
    <td>Développeuse</td>
    <td>alice@flogeez.fr</td>
    <td>01 23 45 67 89</td>
  </tr>
  <tr>
    <td>Bob D.</td>
    <td>35</td>
    <td>Lyon</td>
    <td>Designer</td>
    <td>bob@flogeez.fr</td>
    <td>04 56 78 90 12</td>
  </tr>
  <tr>
    <td>Flo E.</td>
    <td>33</td>
    <td>Rennes</td>
    <td>Développeur</td>
    <td>flo@flogeez.fr</td>
    <td>04 91 23 45 67</td>
  </tr>
</table>
<p><em>${content.tablesTryText}</em></p>

<h2>${content.listsTitle}</h2>
<ul><li>${content.firstItem}</li></ul>
<ol><li>${content.secondItem}</li><li>${content.thirdItem} <a href="https://tiptap.dev" target="_blank">Tiptap</a></li></ol>

<h2>${content.customizationTitle}</h2>
<ul>
  <li>${content.customizationItems.toolbar}</li>
  <li>${content.customizationItems.aiAssistant} ✨</li>
</ul>

<h3>${content.reactiveFormsTitle}</h3>
<p>${content.reactiveFormsIntro}</p>
<pre><code>// ${content.componentComment}
simpleControl = new FormControl('', [Validators.required]);

// ${content.templateComment}
&lt;angular-tiptap-editor [formControl]="simpleControl" /&gt;</code></pre>

<h3>${content.imageUploadTitle}</h3>
<p>${content.imageUploadIntro}</p>
<pre><code>private http = inject(HttpClient);

uploadHandler: ImageUploadHandler = (ctx) =&gt; {
  const formData = new FormData();
  formData.append('image', ctx.file);

  return this.http.post&lt;{ url: string }&gt;('/api/upload', formData).pipe(
    map(res =&gt; ({ src: res.url }))
  );
};

// Template
&lt;angular-tiptap-editor [imageUploadHandler]="uploadHandler" /&gt;</code></pre>

<h2>${content.makeItYourOwnTitle}</h2>
<p>${content.makeItYourOwnIntro}</p>

<p style="text-align: right;">
  <strong>${content.conclusion}</strong><br>
</p>

<p style="text-align: center;">
    <a href="https://github.com/FloGeez/angular-tiptap-editor" target="_blank">${this.ui().github}</a> • 
    <a href="https://www.npmjs.com/package/@flogeez/angular-tiptap-editor" target="_blank">${this.ui().npm}</a>
</p>
`.trim();
  }
}
