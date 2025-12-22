export interface BubbleMenuConfig {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  highlight?: boolean;
  textColor?: boolean;
  link?: boolean;
  separator?: boolean;
}

export interface ImageBubbleMenuConfig {
  changeImage?: boolean;
  resizeSmall?: boolean;
  resizeMedium?: boolean;
  resizeLarge?: boolean;
  resizeOriginal?: boolean;
  deleteImage?: boolean;
  separator?: boolean;
}

export interface TableBubbleMenuConfig {
  addRowBefore?: boolean;
  addRowAfter?: boolean;
  deleteRow?: boolean;
  addColumnBefore?: boolean;
  addColumnAfter?: boolean;
  deleteColumn?: boolean;
  deleteTable?: boolean;
  toggleHeaderRow?: boolean;
  toggleHeaderColumn?: boolean;
  separator?: boolean;
}

export interface CellBubbleMenuConfig {
  mergeCells?: boolean;
  splitCell?: boolean;
}
