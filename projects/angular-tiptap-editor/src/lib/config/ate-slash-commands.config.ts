import { Editor } from "@tiptap/core";
import { AteSlashCommandItem } from "../components/slash-commands/ate-slash-commands.component";
import { AteI18nService } from "../services/ate-i18n.service";
import { AteEditorCommandsService } from "../services/ate-editor-commands.service";

/**
 * Clés des commandes natives dans l'ordre d'affichage
 */
export const ATE_SLASH_COMMAND_KEYS = [
  "heading1",
  "heading2",
  "heading3",
  "bulletList",
  "orderedList",
  "blockquote",
  "code",
  "image",
  "horizontalRule",
  "table",
] as const;

export type AteSlashCommandKey = (typeof ATE_SLASH_COMMAND_KEYS)[number];

/**
 * Configuration simplifiée pour activer/désactiver les slash commands natives.
 * Permet aussi d'ajouter des commandes personnalisées.
 */
export interface AteSlashCommandsConfig extends Partial<Record<AteSlashCommandKey, boolean>> {
  /**
   * Liste de commandes supplémentaires à ajouter à la fin du menu
   */
  custom?: AteSlashCommandItem[];
}

/**
 * Configuration par défaut : toutes les commandes natives sont activées
 */
export const ATE_DEFAULT_SLASH_COMMANDS_CONFIG: AteSlashCommandsConfig = {
  heading1: true,
  heading2: true,
  heading3: true,
  bulletList: true,
  orderedList: true,
  blockquote: true,
  code: true,
  image: true,
  horizontalRule: true,
  table: true,
};

/**
 * Factory pour créer les commandes natives avec leurs traductions et leur logique d'exécution.
 * Utilise les services de l'éditeur pour garantir une cohérence de comportement.
 */
export function createDefaultSlashCommands(
  i18n: AteI18nService,
  commands: AteEditorCommandsService,
  imageOptions?: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    allowedTypes?: string[];
  }
): AteSlashCommandItem[] {
  const t = i18n.slashCommands();

  return [
    {
      title: t.heading1.title,
      description: t.heading1.description,
      icon: "format_h1",
      keywords: t.heading1.keywords,
      command: (editor: Editor) => commands.toggleHeading(editor, 1),
    },
    {
      title: t.heading2.title,
      description: t.heading2.description,
      icon: "format_h2",
      keywords: t.heading2.keywords,
      command: (editor: Editor) => commands.toggleHeading(editor, 2),
    },
    {
      title: t.heading3.title,
      description: t.heading3.description,
      icon: "format_h3",
      keywords: t.heading3.keywords,
      command: (editor: Editor) => commands.toggleHeading(editor, 3),
    },
    {
      title: t.bulletList.title,
      description: t.bulletList.description,
      icon: "format_list_bulleted",
      keywords: t.bulletList.keywords,
      command: (editor: Editor) => commands.toggleBulletList(editor),
    },
    {
      title: t.orderedList.title,
      description: t.orderedList.description,
      icon: "format_list_numbered",
      keywords: t.orderedList.keywords,
      command: (editor: Editor) => commands.toggleOrderedList(editor),
    },
    {
      title: t.blockquote.title,
      description: t.blockquote.description,
      icon: "format_quote",
      keywords: t.blockquote.keywords,
      command: (editor: Editor) => commands.toggleBlockquote(editor),
    },
    {
      title: t.code.title,
      description: t.code.description,
      icon: "code",
      keywords: t.code.keywords,
      command: (editor: Editor) => commands.toggleCodeBlock(editor),
    },
    {
      title: t.image.title,
      description: t.image.description,
      icon: "image",
      keywords: t.image.keywords,
      command: (editor: Editor) =>
        commands.execute(editor, "insertImage", {
          quality: imageOptions?.quality,
          maxWidth: imageOptions?.maxWidth,
          maxHeight: imageOptions?.maxHeight,
          allowedTypes: imageOptions?.allowedTypes,
        }),
    },
    {
      title: t.horizontalRule.title,
      description: t.horizontalRule.description,
      icon: "horizontal_rule",
      keywords: t.horizontalRule.keywords,
      command: (editor: Editor) => commands.insertHorizontalRule(editor),
    },
    {
      title: t.table.title,
      description: t.table.description,
      icon: "table_view",
      keywords: t.table.keywords,
      command: (editor: Editor) => commands.insertTable(editor),
    },
  ];
}

/**
 * Filtre et assemble les commandes selon la configuration fournie.
 */
export function filterSlashCommands(
  config: AteSlashCommandsConfig,
  i18n: AteI18nService,
  commands: AteEditorCommandsService,
  imageOptions?: {
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    allowedTypes?: string[];
  }
): AteSlashCommandItem[] {
  const allNatives = createDefaultSlashCommands(i18n, commands, imageOptions);
  const activeConfig = { ...ATE_DEFAULT_SLASH_COMMANDS_CONFIG, ...config };

  const filtered = allNatives.filter((_, index) => {
    const key = ATE_SLASH_COMMAND_KEYS[index];
    return key && activeConfig[key] !== false;
  });

  if (config.custom && Array.isArray(config.custom)) {
    return [...filtered, ...config.custom];
  }

  return filtered;
}
