import { Extension } from "@tiptap/core";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";

export const AteTableExtension = Extension.create({
  name: "tableExtension",

  addExtensions() {
    return [
      Table.configure({
        resizable: true,
        handleWidth: 5,
        cellMinWidth: 100,
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: "table-header",
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: "table-cell",
        },
      }),
    ];
  },
});
