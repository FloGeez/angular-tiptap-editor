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
        preview: string;
        code: string;
        copy: string;
        language: string;
        autoDetect: string;
        autoDetection: string;
        english: string;
        french: string;
        german: string,
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
        tableOfContents: string;
        tocFloating: string;
        tocHoverExpand: string;
        tocShowTitle: string;
        tocPosition: string;
        tocVariant: string;
        fillContainer: string;
        disabledMode: string;
        blockControlsPosition: string;
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
        switchToPreview: string;
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
        wordCount: string;
        characterCount: string;
        maxCharacters: string;
    };
    contentView: {
        characters: string;
        noContent: string;
        downloadAngular: string;
        downloadSuccess: string;
        downloadError: string;
        copyError: string;
        angularComponent: string;
        plainText: string;
    };
}