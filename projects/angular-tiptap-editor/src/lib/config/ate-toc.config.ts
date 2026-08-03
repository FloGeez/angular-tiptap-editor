import { AteTocConfig } from "../models/ate-toc.model";

/**
 * Default Table of Contents configuration
 */
export const ATE_DEFAULT_TOC_CONFIG: Required<AteTocConfig> = {
  enabled: true,
  floating: true,
  positionMode: "fixed",
  position: "right",
  variant: "minimal",
  hoverExpand: true,
  showTitle: true,
  maxDepth: 6,
};
