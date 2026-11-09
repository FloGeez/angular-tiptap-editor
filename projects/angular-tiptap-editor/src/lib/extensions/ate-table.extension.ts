import { Extension } from "@tiptap/core";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";

export const AteTableExtension = Extension.create({
  name: "tableExtension",

  addExtensions() {
    return [
      Table.configure({
        resizable: true,
        handleWidth: 5,
        // Narrow columns from pasted documents (an icon column) keep their width
        cellMinWidth: 25,
        allowTableNodeSelection: true,
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
