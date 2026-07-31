export type SupportedLocale = "en" | "fr" | "de" | (string & {});

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
        tableOfContents: {
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
        characterPlural: string;
        word: string;
        wordPlural: string;
        linkPrompt: string;
        linkUrlPrompt: string;
        confirmDelete: string;
        toggleEdit: string;
        viewMode: string;
        blockAdd: string;
        blockDrag: string;
        tableOfContents: string;
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

    // Export
    export: {
        export: string;
        html: string;
        markdown: string;
        text: string;
        copyHtml: string;
        copyMarkdown: string;
        copyText: string;
        downloadHtml: string;
        downloadMarkdown: string;
        downloadText: string;
        copiedSuccess: string;
    };
}