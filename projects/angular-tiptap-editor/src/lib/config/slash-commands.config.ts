import { Editor } from "@tiptap/core";
import { SlashCommandItem } from "../tiptap-slash-commands.component";
import { TiptapI18nService } from "../services/i18n.service";
import { EditorCommandsService } from "../services/editor-commands.service";
import { ImageService } from "../services/image.service";

/**
 * Clés des commandes natives dans l'ordre d'affichage
 */
export const SLASH_COMMAND_KEYS = [
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

export type SlashCommandKey = (typeof SLASH_COMMAND_KEYS)[number];

/**
 * Configuration simplifiée pour activer/désactiver les slash commands natives.
 * Permet aussi d'ajouter des commandes personnalisées.
 */
export interface SlashCommandsConfig extends Partial<Record<SlashCommandKey, boolean>> {
  /**
   * Liste de commandes supplémentaires à ajouter à la fin du menu
   */
  custom?: SlashCommandItem[];
}

/**
 * Configuration par défaut : toutes les commandes natives sont activées
 */
export const DEFAULT_SLASH_COMMANDS_CONFIG: Record<SlashCommandKey, boolean> = {
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
  i18n: TiptapI18nService,
  commands: EditorCommandsService,
  images: ImageService,
  imageOptions?: { quality?: number; maxWidth?: number; maxHeight?: number; allowedTypes?: string[] }
): SlashCommandItem[] {
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
      command: (editor: Editor) => commands.toggleCode(editor),
    },
    {
      title: t.image.title,
      description: t.image.description,
      icon: "image",
      keywords: t.image.keywords,
      command: (editor: Editor) => images.selectAndUploadImage(editor, {
        quality: imageOptions?.quality,
        maxWidth: imageOptions?.maxWidth,
        maxHeight: imageOptions?.maxHeight,
        accept: imageOptions?.allowedTypes?.join(',')
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
  config: SlashCommandsConfig,
  i18n: TiptapI18nService,
  commands: EditorCommandsService,
  images: ImageService,
  imageOptions?: { quality?: number; maxWidth?: number; maxHeight?: number; allowedTypes?: string[] }
): SlashCommandItem[] {
  const allNatives = createDefaultSlashCommands(i18n, commands, images, imageOptions);
  const activeConfig = { ...DEFAULT_SLASH_COMMANDS_CONFIG, ...config };

  const filtered = allNatives.filter((_, index) => {
    const key = SLASH_COMMAND_KEYS[index];
    return key && activeConfig[key] !== false;
  });

  if (config.custom && Array.isArray(config.custom)) {
    return [...filtered, ...config.custom];
  }

  return filtered;
}
