import { Editor } from "@tiptap/core";
import { AteIconKey } from "../services/ate-icon-registry.service";

/**
 * Interface representing a single item in the slash commands menu.
 */
export interface AteSlashCommandItem {
  title: string;
  description: string;
  icon: AteIconKey;
  keywords: string[];
  command: (editor: Editor) => void;
}

/**
 * Custom slash commands configuration.
 */
export interface AteCustomSlashCommands {
  commands?: AteSlashCommandItem[];
}
