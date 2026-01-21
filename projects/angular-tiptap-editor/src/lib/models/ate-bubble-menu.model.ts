export interface AteBubbleMenuConfig {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  superscript?: boolean;
  subscript?: boolean;
  highlight?: boolean;
  highlightPicker?: boolean;
  textColor?: boolean;
  link?: boolean;
  separator?: boolean;
}

export interface AteImageBubbleMenuConfig {
  changeImage?: boolean;
  resizeSmall?: boolean;
  resizeMedium?: boolean;
  resizeLarge?: boolean;
  resizeOriginal?: boolean;
  deleteImage?: boolean;
  separator?: boolean;
}

export interface AteTableBubbleMenuConfig {
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

export interface AteCellBubbleMenuConfig {
  mergeCells?: boolean;
  splitCell?: boolean;
}
