export interface ConfigItem {
  key: string;
  label: string;
  icon: string;
}

export type ActivePanel = 'none' | 'config' | 'theme';

export interface EditorState {
  showSidebar: boolean;
  showCodeMode: boolean;
  isTransitioning: boolean;
  showToolbar: boolean;
  showBubbleMenu: boolean;
  showCharacterCount: boolean;
  showWordCount: boolean;
  enableSlashCommands: boolean;
  placeholder: string;
  locale?: string;
  // Height configuration
  minHeight: number;
  height?: number;
  maxHeight?: number;
  fillContainer: boolean;
  // Autofocus configuration
  autofocus: boolean | 'start' | 'end' | 'all' | number;
  maxCharacters?: number;
  // Theme
  darkMode: boolean;
  // Active panel
  activePanel: ActivePanel;
  showInspector: boolean;
  enableTaskExtension: boolean;
}

export interface MenuState {
  showToolbarMenu: boolean;
  showBubbleMenuMenu: boolean;
  showSlashCommandsMenu: boolean;
  showHeightMenu: boolean;
}

export interface EditorContent {
  content: string;
}
