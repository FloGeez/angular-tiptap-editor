import { Editor } from "@tiptap/core";

/**
 * Interface representing a single item in the slash commands menu.
 */
export interface AteSlashCommandItem {
  title: string;
  description: string;
  icon: string;
  keywords: string[];
  command: (editor: Editor) => void;
}

/**
 * Custom slash commands configuration.
 */
export interface AteCustomSlashCommands {
  commands?: AteSlashCommandItem[];
}
