import { Extension } from "@tiptap/core";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

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
