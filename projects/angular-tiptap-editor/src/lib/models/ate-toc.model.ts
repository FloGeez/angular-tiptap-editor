/**
 * Visual variants for Table of Contents
 */
export type AteTocVariant = "card" | "transparent" | "minimal";

/**
 * Item structure extracted by Table of Contents
 */
export interface AteTocItem {
  text: string;
  level: number;
  pos: number;
  id: string;
  active: boolean;
}

/**
 * Configuration options for Table of Contents
 */
export interface AteTocConfig {
  enabled?: boolean;
  floating?: boolean;
  position?: "left" | "right";
  variant?: AteTocVariant;
  hoverExpand?: boolean;
  showTitle?: boolean;
  maxDepth?: number;
}
