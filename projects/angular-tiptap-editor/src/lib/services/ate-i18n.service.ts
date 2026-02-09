import { Injectable, signal, computed } from "@angular/core";

export type SupportedLocale = "en" | "fr" | (string & {});

export interface AteTranslations {
  // Toolbar
  toolbar: {
    bold: string;
    italic: string;
    underline: string;
    strike: string;
    code: string;
    codeBlock: string;
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
    table: string;
    undo: string;
    redo: string;
    clear: string;
    textColor: string;
    customColor: string;
    presets: string;
  };

  // Bubble Menu
  bubbleMenu: {
    bold: string;
    italic: string;
    underline: string;
    strike: string;
    code: string;
    superscript: string;
    subscript: string;
    highlight: string;
    highlightPicker: string;
    textColor: string;
    link: string;
    addLink: string;
    editLink: string;
    removeLink: string;
    linkUrl: string;
    linkText: string;
    openLink: string;
    customColor: string;
    presets: string;
  };

  // Slash Commands
  slashCommands: {
    heading1: {
      title: string;
      description: string;
      keywords: string[];
    };
    heading2: {
      title: string;
      description: string;
      keywords: string[];
    };
    heading3: {
      title: string;
      description: string;
      keywords: string[];
    };
    bulletList: {
      title: string;
      description: string;
      keywords: string[];
    };
    orderedList: {
      title: string;
      description: string;
      keywords: string[];
    };
    blockquote: {
      title: string;
      description: string;
      keywords: string[];
    };
    code: {
      title: string;
      description: string;
      keywords: string[];
    };
    image: {
      title: string;
      description: string;
      keywords: string[];
    };
    horizontalRule: {
      title: string;
      description: string;
      keywords: string[];
    };
    table: {
      title: string;
      description: string;
      keywords: string[];
    };
  };

  // Table Actions
  table: {
    addRowBefore: string;
    addRowAfter: string;
    deleteRow: string;
    addColumnBefore: string;
    addColumnAfter: string;
    deleteColumn: string;
    deleteTable: string;
    toggleHeaderRow: string;
    toggleHeaderColumn: string;
    mergeCells: string;
    splitCell: string;
  };

  // Image Upload
  imageUpload: {
    selectImage: string;
    loadError: string;
    uploadingImage: string;
    uploadProgress: string;
    uploadError: string;
    uploadSuccess: string;
    imageTooLarge: string;
    invalidFileType: string;
    dragDropText: string;
    changeImage: string;
    downloadImage: string;
    deleteImage: string;
    resizeSmall: string;
    resizeMedium: string;
    resizeLarge: string;
    resizeOriginal: string;
    alignLeft: string;
    alignCenter: string;
    alignRight: string;
    resizing: string;
    compressing: string;
    compressionError: string;
    validating: string;
    uploadingToServer: string;
    replacingImage: string;
    insertingImage: string;
    noFileSelected: string;
    selectionCancelled: string;
  };

  // Editor
  editor: {
    placeholder: string;
    character: string;
    word: string;
    linkPrompt: string;
    linkUrlPrompt: string;
    confirmDelete: string;
    toggleEdit: string;
    viewMode: string;
  };

  // Common
  common: {
    cancel: string;
    confirm: string;
    apply: string;
    delete: string;
    save: string;
    close: string;
    loading: string;
    error: string;
    success: string;
  };
}

const ENGLISH_TRANSLATIONS: AteTranslations = {
  toolbar: {
    bold: "Bold\nCtrl+B",
    italic: "Italic\nCtrl+I",
    underline: "Underline\nCtrl+U",
    strike: "Strikethrough\nCtrl+Shift+X",
    code: "Inline Code\nCtrl+E",
    codeBlock: "Code Block",
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
    alignJustify: "Align Justify",
    link: "Add Link",
    image: "Add Image",
    horizontalRule: "Horizontal Rule",
    table: "Insert Table",
    undo: "Undo\nCtrl+Z",
    redo: "Redo\nCtrl+Shift+Z",
    clear: "Clear",
    textColor: "Text Color",
    customColor: "Custom Color",
    presets: "Presets",
  },
  bubbleMenu: {
    bold: "Bold\nCtrl+B",
    italic: "Italic\nCtrl+I",
    underline: "Underline\nCtrl+U",
    strike: "Strikethrough\nCtrl+Shift+X",
    code: "Code\nCtrl+E",
    superscript: "Superscript",
    subscript: "Subscript",
    highlight: "Highlight",
    highlightPicker: "Background Color",
    textColor: "Text Color",
    link: "Link",
    addLink: "Add Link",
    editLink: "Edit Link",
    removeLink: "Remove Link",
    linkUrl: "Link URL",
    linkText: "Link Text",
    openLink: "Open Link",
    customColor: "Custom Color",
    presets: "Presets",
  },
  slashCommands: {
    heading1: {
      title: "Heading 1",
      description: "Large section heading",
      keywords: ["heading", "h1", "title", "1", "header"],
    },
    heading2: {
      title: "Heading 2",
      description: "Medium section heading",
      keywords: ["heading", "h2", "title", "2", "header"],
    },
    heading3: {
      title: "Heading 3",
      description: "Small section heading",
      keywords: ["heading", "h3", "title", "3", "header"],
    },
    bulletList: {
      title: "Bullet List",
      description: "Create a bullet list",
      keywords: ["bullet", "list", "ul", "unordered"],
    },
    orderedList: {
      title: "Ordered List",
      description: "Create an ordered list",
      keywords: ["ordered", "list", "ol", "numbered"],
    },
    blockquote: {
      title: "Blockquote",
      description: "Add a blockquote",
      keywords: ["quote", "blockquote", "citation"],
    },
    code: {
      title: "Code Block",
      description: "Add a code block",
      keywords: ["code", "codeblock", "pre", "programming"],
    },
    image: {
      title: "Image",
      description: "Insert an image",
      keywords: ["image", "photo", "picture", "img"],
    },
    horizontalRule: {
      title: "Horizontal Rule",
      description: "Add a horizontal line",
      keywords: ["hr", "horizontal", "rule", "line", "separator"],
    },
    table: {
      title: "Table",
      description: "Insert a table",
      keywords: ["table", "grid", "data", "rows", "columns"],
    },
  },
  table: {
    addRowBefore: "Add row before",
    addRowAfter: "Add row after",
    deleteRow: "Delete row",
    addColumnBefore: "Add column before",
    addColumnAfter: "Add column after",
    deleteColumn: "Delete column",
    deleteTable: "Delete table",
    toggleHeaderRow: "Toggle header row",
    toggleHeaderColumn: "Toggle header column",
    mergeCells: "Merge cells",
    splitCell: "Split cell",
  },
  imageUpload: {
    selectImage: "Select Image",
    loadError: "Error loading image",
    uploadingImage: "Uploading image...",
    uploadProgress: "Upload Progress",
    uploadError: "Upload Error",
    uploadSuccess: "Upload Success",
    imageTooLarge: "Image too large",
    invalidFileType: "Invalid file type",
    dragDropText: "Drag and drop images here",
    changeImage: "Change Image",
    downloadImage: "Download Image",
    deleteImage: "Delete Image",
    resizeSmall: "Small",
    resizeMedium: "Medium",
    resizeLarge: "Large",
    resizeOriginal: "Original",
    alignLeft: "Align Left",
    alignCenter: "Align Center",
    alignRight: "Align Right",
    resizing: "Resizing...",
    compressing: "Compressing...",
    compressionError: "Error during compression",
    validating: "Validating file...",
    uploadingToServer: "Uploading to server...",
    replacingImage: "Replacing image...",
    insertingImage: "Inserting into editor...",
    noFileSelected: "No image file selected",
    selectionCancelled: "Selection cancelled",
  },
  editor: {
    placeholder: "Start typing...",
    character: "character",
    word: "word",
    linkPrompt: "Enter link URL",
    linkUrlPrompt: "Enter URL",
    confirmDelete: "Are you sure you want to delete this?",
    toggleEdit: "Switch to Edit Mode",
    viewMode: "Switch to View Mode",
  },
  common: {
    cancel: "Cancel",
    confirm: "Confirm",
    apply: "Apply",
    delete: "Delete",
    save: "Save",
    close: "Close",
    loading: "Loading",
    error: "Error",
    success: "Success",
  },
};

const FRENCH_TRANSLATIONS: AteTranslations = {
  toolbar: {
    bold: "Gras\nCtrl+B",
    italic: "Italique\nCtrl+I",
    underline: "Souligné\nCtrl+U",
    strike: "Barré\nCtrl+Shift+X",
    code: "Code en ligne\nCtrl+E",
    codeBlock: "Bloc de code",
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
    link: "Ajouter un lien",
    image: "Ajouter une image",
    horizontalRule: "Ligne horizontale",
    table: "Insérer un tableau",
    undo: "Annuler\nCtrl+Z",
    redo: "Refaire\nCtrl+Shift+Z",
    clear: "Vider",
    textColor: "Couleur du texte",
    customColor: "Couleur personnalisée",
    presets: "Préréglages",
  },
  bubbleMenu: {
    bold: "Gras\nCtrl+B",
    italic: "Italique\nCtrl+I",
    underline: "Souligné\nCtrl+U",
    strike: "Barré\nCtrl+Shift+X",
    code: "Code\nCtrl+E",
    superscript: "Exposant",
    subscript: "Indice",
    highlight: "Surligner",
    highlightPicker: "Couleur de fond",
    textColor: "Couleur du texte",
    link: "Lien",
    addLink: "Ajouter un lien",
    editLink: "Modifier le lien",
    removeLink: "Supprimer le lien",
    linkUrl: "URL du lien",
    linkText: "Texte du lien",
    openLink: "Ouvrir le lien",
    customColor: "Couleur personnalisée",
    presets: "Préréglages",
  },
  slashCommands: {
    heading1: {
      title: "Titre 1",
      description: "Grand titre de section",
      keywords: ["heading", "h1", "titre", "title", "1", "header"],
    },
    heading2: {
      title: "Titre 2",
      description: "Titre de sous-section",
      keywords: ["heading", "h2", "titre", "title", "2", "header"],
    },
    heading3: {
      title: "Titre 3",
      description: "Petit titre",
      keywords: ["heading", "h3", "titre", "title", "3", "header"],
    },
    bulletList: {
      title: "Liste à puces",
      description: "Créer une liste à puces",
      keywords: ["bullet", "list", "liste", "puces", "ul"],
    },
    orderedList: {
      title: "Liste numérotée",
      description: "Créer une liste numérotée",
      keywords: ["numbered", "list", "liste", "numérotée", "ol", "ordered"],
    },
    blockquote: {
      title: "Citation",
      description: "Ajouter une citation",
      keywords: ["quote", "blockquote", "citation"],
    },
    code: {
      title: "Bloc de code",
      description: "Ajouter un bloc de code",
      keywords: ["code", "codeblock", "pre", "programmation"],
    },
    image: {
      title: "Image",
      description: "Insérer une image",
      keywords: ["image", "photo", "picture", "img"],
    },
    horizontalRule: {
      title: "Ligne horizontale",
      description: "Ajouter une ligne de séparation",
      keywords: ["hr", "horizontal", "rule", "ligne", "séparation"],
    },
    table: {
      title: "Tableau",
      description: "Insérer un tableau",
      keywords: ["table", "tableau", "grid", "grille", "data", "données", "rows", "colonnes"],
    },
  },
  table: {
    addRowBefore: "Ajouter une ligne avant",
    addRowAfter: "Ajouter une ligne après",
    deleteRow: "Supprimer la ligne",
    addColumnBefore: "Ajouter une colonne avant",
    addColumnAfter: "Ajouter une colonne après",
    deleteColumn: "Supprimer la colonne",
    deleteTable: "Supprimer le tableau",
    toggleHeaderRow: "Basculer ligne d'en-tête",
    toggleHeaderColumn: "Basculer colonne d'en-tête",
    mergeCells: "Fusionner les cellules",
    splitCell: "Diviser la cellule",
  },
  imageUpload: {
    selectImage: "Sélectionner une image",
    loadError: "Erreur de chargement de l'image",
    uploadingImage: "Téléchargement de l'image...",
    uploadProgress: "Progression du téléchargement",
    uploadError: "Erreur de téléchargement",
    uploadSuccess: "Téléchargement réussi",
    imageTooLarge: "Image trop volumineuse",
    invalidFileType: "Type de fichier invalide",
    dragDropText: "Glissez et déposez des images ici",
    changeImage: "Changer l'image",
    downloadImage: "Télécharger l'image",
    deleteImage: "Supprimer l'image",
    resizeSmall: "Petit",
    resizeMedium: "Moyen",
    resizeLarge: "Grand",
    resizeOriginal: "Original",
    alignLeft: "Aligner à gauche",
    alignCenter: "Aligner au centre",
    alignRight: "Aligner à droite",
    resizing: "Redimensionnement...",
    compressing: "Compression...",
    compressionError: "Erreur lors de la compression",
    validating: "Validation du fichier...",
    uploadingToServer: "Upload vers le serveur...",
    replacingImage: "Remplacement de l'image...",
    insertingImage: "Insertion dans l'éditeur...",
    noFileSelected: "Aucun fichier image sélectionné",
    selectionCancelled: "Sélection annulée",
  },
  editor: {
    placeholder: "Commencez à écrire...",
    character: "caractère",
    word: "mot",
    linkPrompt: "Entrez l'URL du lien",
    linkUrlPrompt: "Entrez l'URL",
    confirmDelete: "Êtes-vous sûr de vouloir supprimer ceci ?",
    toggleEdit: "Passer en mode édition",
    viewMode: "Passer en mode affichage",
  },
  common: {
    cancel: "Annuler",
    confirm: "Confirmer",
    apply: "Appliquer",
    delete: "Supprimer",
    save: "Sauvegarder",
    close: "Fermer",
    loading: "Chargement",
    error: "Erreur",
    success: "Succès",
  },
};

@Injectable({
  providedIn: "root",
})
export class AteI18nService {
  private _currentLocale = signal<SupportedLocale>("en");
  private _translations = signal<Record<SupportedLocale, AteTranslations>>({
    en: ENGLISH_TRANSLATIONS,
    fr: FRENCH_TRANSLATIONS,
  });

  // Public signals
  readonly currentLocale = this._currentLocale.asReadonly();
  /** All loaded translations (useful for dynamic key access) */
  readonly allTranslations = this._translations.asReadonly();

  readonly translations = computed(() => this._translations()[this._currentLocale()]);

  // Fast translation methods
  readonly t = computed(() => this.translations());
  readonly toolbar = computed(() => this.translations().toolbar);
  readonly bubbleMenu = computed(() => this.translations().bubbleMenu);
  readonly slashCommands = computed(() => this.translations().slashCommands);
  readonly table = computed(() => this.translations().table);
  readonly imageUpload = computed(() => this.translations().imageUpload);
  readonly editor = computed(() => this.translations().editor);
  readonly common = computed(() => this.translations().common);

  constructor() {
    // Automatically detect browser language
    this.detectBrowserLanguage();
  }

  setLocale(locale: SupportedLocale): void {
    this._currentLocale.set(locale);
  }

  autoDetectLocale(): void {
    this.detectBrowserLanguage();
  }

  getSupportedLocales(): SupportedLocale[] {
    return Object.keys(this._translations()) as SupportedLocale[];
  }

  addTranslations(locale: string, translations: AteTranslations | Partial<AteTranslations>): void {
    this._translations.update(current => {
      const existing = current[locale] || ENGLISH_TRANSLATIONS;
      return {
        ...current,
        [locale]: {
          ...existing,
          ...translations,
        },
      };
    });
  }

  private detectBrowserLanguage(): void {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("fr")) {
      this._currentLocale.set("fr");
    } else {
      this._currentLocale.set("en");
    }
  }

  // Utility methods for components
  getToolbarTitle(key: keyof AteTranslations["toolbar"]): string {
    return this.translations().toolbar[key];
  }

  getBubbleMenuTitle(key: keyof AteTranslations["bubbleMenu"]): string {
    return this.translations().bubbleMenu[key];
  }

  getSlashCommand(key: keyof AteTranslations["slashCommands"]) {
    return this.translations().slashCommands[key];
  }
}
