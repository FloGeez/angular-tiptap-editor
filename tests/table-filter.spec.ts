import { test, expect, type Page } from "@playwright/test";
import { clearEditor } from "./helpers";

type DebugNode = {
  type: { name: string };
  textContent: string;
  nodeSize: number;
  descendants: (fn: (node: DebugNode, pos: number) => boolean | void) => void;
};

type DebugSlice = unknown;

type DebugEditor = {
  isEditable: boolean;
  state: {
    doc: DebugNode;
    selection: {
      content: () => DebugSlice;
      $head: { depth: number; node: (depth: number) => DebugNode };
    } & Record<string, unknown>;
  };
  view: {
    serializeForClipboard: (slice: DebugSlice) => { dom: HTMLElement; text: string };
    pasteHTML: (html: string) => boolean;
    dom: HTMLElement;
  };
  setEditable: (editable: boolean) => void;
  getHTML: () => string;
  getJSON: () => unknown;
  commands: {
    setContent: (content: string) => boolean;
    setTableColumnFilter: (column: number, filter: unknown, tablePos?: number) => boolean;
    clearTableFilters: (tablePos?: number) => boolean;
    revealTableRow: (pos: number) => boolean;
    deleteRow: () => boolean;
    mergeCells: () => boolean;
  };
  chain: () => {
    focus: () => ReturnType<DebugEditor["chain"]>;
    selectAll: () => ReturnType<DebugEditor["chain"]>;
    setTextSelection: (pos: number) => ReturnType<DebugEditor["chain"]>;
    scrollIntoView: () => ReturnType<DebugEditor["chain"]>;
    run: () => boolean;
  };
};

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => { getEditor: () => DebugEditor | null };
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
};

/** Runs `run` in the page with the demo editor; `run` must only use its arguments */
async function withEditor<T, A>(page: Page, run: (editor: DebugEditor, arg: A) => T, arg: A) {
  return page.evaluate(
    ({ source, value }) => {
      const host = document.querySelector("angular-tiptap-editor")!;
      const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
      return new Function("editor", "arg", `return (${source})(editor, arg);`)(editor, value) as T;
    },
    { source: run.toString(), value: arg }
  );
}

function tableHtml(header: string[], rows: string[][]) {
  const head = `<tr>${header.map(cell => `<th><p>${cell}</p></th>`).join("")}</tr>`;
  const body = rows
    .map(row => `<tr>${row.map(cell => `<td><p>${cell}</p></td>`).join("")}</tr>`)
    .join("");
  return `<table><tbody>${head}${body}</tbody></table>`;
}

const PEOPLE = tableHtml(
  ["Name", "City", "Amount", "Day"],
  [
    ["Ann", "Paris", "10", "05/01/2024"],
    ["Bob", "Lyon", "25", "12/01/2024"],
    ["Cid", "Paris", "7", "20/01/2024"],
    ["Dan", "Nice", "40", "02/02/2024 18:30"],
    ["Eve", "Paris", "3", "15/02/2024"],
    ["Fay", "", "18", "28/02/2024"],
  ]
);

const PARIS = { kind: "values", values: ["Paris"] };

async function setContent(page: Page, html: string) {
  await withEditor(page, (editor, content) => editor.commands.setContent(content), html);
}

async function setConfig(page: Page, overrides: Record<string, unknown>) {
  await page.evaluate(extra => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor")!;
    const app = win.ng!.getOwningComponent(host);
    const nextConfig = { ...app.editorConfig(), ...extra };
    app.editorConfig = () => nextConfig;
    win.ng!.applyChanges(app);
  }, overrides);
}

/** Filters a column of the first table from code */
async function filterColumn(page: Page, column: number, filter: unknown) {
  return withEditor(
    page,
    (editor, { col, value }) => {
      let tablePos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (tablePos < 0 && node.type.name === "table") {
          tablePos = pos;
        }
        return tablePos < 0;
      });
      return editor.commands.setTableColumnFilter(col, value, tablePos);
    },
    { col: column, value: filter }
  );
}

/** Position inside the first cell of the body row whose text starts with `start` */
async function rowPos(page: Page, start: string) {
  return withEditor(
    page,
    (editor, text) => {
      let found = -1;
      editor.state.doc.descendants((node, pos) => {
        if (found < 0 && node.type.name === "tableRow" && node.textContent.startsWith(text)) {
          found = pos + 3;
        }
        return found < 0;
      });
      return found;
    },
    start
  );
}

/** Text of the table row holding the cursor */
async function caretRowText(page: Page) {
  return withEditor(
    page,
    editor => {
      const { $head } = editor.state.selection;
      for (let depth = $head.depth; depth > 0; depth--) {
        if ($head.node(depth).type.name === "tableRow") {
          return $head.node(depth).textContent;
        }
      }
      return null;
    },
    null
  );
}

const editorHtml = (page: Page) => withEditor(page, editor => editor.getHTML(), null);

function visibleColumn(page: Page, column: number) {
  return page.locator(
    `.ProseMirror table tr:not(:first-child):not([data-ate-table-hidden]) > :nth-child(${column + 1})`
  );
}

function bodyCell(page: Page, row: number, column: number) {
  return page.locator(`.ProseMirror table tr:nth-child(${row + 1}) > :nth-child(${column + 1})`);
}

function columnButton(page: Page, name: string) {
  return page.locator(".ProseMirror table").getByRole("button", { name });
}

async function openMenu(page: Page, header: string) {
  const button = columnButton(page, `Column menu: ${header}`);
  if ((await button.getAttribute("aria-expanded")) !== "true") {
    await button.click();
  }
  const menu = page.getByRole("dialog", { name: `Column menu: ${header}` });
  await expect(menu).toBeVisible();
  return menu;
}

const status = (page: Page) => page.locator(".ProseMirror .ate-table-filter-status");
const hiddenRows = (page: Page) => page.locator(".ProseMirror table tr[data-ate-table-hidden]");
const allRows = (page: Page) => page.locator(".ProseMirror table tr");

/** Selects the cells from (fromRow, column) to (toRow, column) with a click and a Shift+click */
async function selectCells(page: Page, column: number, fromRow: number, toRow: number) {
  await bodyCell(page, fromRow, column).click();
  await bodyCell(page, toRow, column).click({ modifiers: ["Shift"] });
  await expect
    .poll(() => withEditor(page, editor => "$anchorCell" in editor.state.selection, null))
    .toBe(true);
}

test.describe("Table filter", () => {
  test.use({ locale: "en-US" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    await clearEditor(page);
  });

  test("filters a column with few values by checkboxes, with counts and empty cells", async ({
    page,
  }) => {
    await setContent(page, PEOPLE);
    const menu = await openMenu(page, "City");

    await expect(menu.locator(".ate-table-column-menu-check:not(.is-all)")).toHaveText([
      /Lyon\s*1/,
      /Nice\s*1/,
      /Paris\s*3/,
      /\(empty\)\s*1/,
    ]);
    const all = menu.getByRole("checkbox", { name: "All", exact: true });
    await expect(all).toBeChecked();
    await expect(status(page)).toHaveCount(0);

    await all.uncheck();
    await expect(hiddenRows(page)).toHaveCount(6);
    await expect(status(page)).toContainText("No rows match the filters");
    await expect(status(page).getByRole("button", { name: "Clear filters" })).toBeVisible();

    await menu.getByRole("checkbox", { name: /^Paris/ }).check();
    await expect(visibleColumn(page, 0)).toHaveText(["Ann", "Cid", "Eve"]);
    await expect(status(page)).toContainText("Showing 3 of 6 rows");

    await menu.getByRole("checkbox", { name: /^\(empty\)/ }).check();
    await expect(visibleColumn(page, 0)).toHaveText(["Ann", "Cid", "Eve", "Fay"]);
    await expect(status(page)).toContainText("Showing 4 of 6 rows");
    await expect(allRows(page)).toHaveCount(7);
  });

  test("filters numbers between a minimum and a maximum, both included", async ({ page }) => {
    await setContent(page, PEOPLE);
    const menu = await openMenu(page, "Amount");
    const min = menu.getByRole("textbox", { name: "Min", exact: true });
    const max = menu.getByRole("textbox", { name: "Max", exact: true });
    await expect(min).toHaveAttribute("placeholder", "3");
    await expect(max).toHaveAttribute("placeholder", "40");

    await min.fill("10");
    await expect(visibleColumn(page, 2)).toHaveText(["10", "25", "40", "18"]);
    await max.fill("25");
    await expect(visibleColumn(page, 2)).toHaveText(["10", "25", "18"]);
    await expect(status(page)).toContainText("Showing 3 of 6 rows");

    await min.fill("");
    await max.fill("");
    await expect(hiddenRows(page)).toHaveCount(0);
    await expect(status(page)).toHaveCount(0);
  });

  test("filters dates from one day to another, the last day included", async ({ page }) => {
    await setContent(page, PEOPLE);
    const menu = await openMenu(page, "Day");

    await menu.getByLabel("From", { exact: true }).fill("2024-01-12");
    await expect(visibleColumn(page, 0)).toHaveText(["Bob", "Cid", "Dan", "Eve", "Fay"]);
    await menu.getByLabel("To", { exact: true }).fill("2024-02-02");
    await expect(visibleColumn(page, 0)).toHaveText(["Bob", "Cid", "Dan"]);
    await expect(status(page)).toContainText("Showing 3 of 6 rows");
  });

  test("filters text containing a query, without case or accents", async ({ page }) => {
    const rows = Array.from({ length: 22 }, (_, index) => [
      String(index + 1),
      (index + 1) % 5 === 0 ? `Café crème ${index + 1}` : `Note ${index + 1}`,
    ]);
    await setContent(page, tableHtml(["Id", "Note"], rows));
    const menu = await openMenu(page, "Note");

    await menu.getByRole("searchbox").fill("CAFE");
    await expect(visibleColumn(page, 0)).toHaveText(["5", "10", "15", "20"]);
    await expect(status(page)).toContainText("Showing 4 of 22 rows");

    await menu.getByRole("searchbox").fill("");
    await expect(hiddenRows(page)).toHaveCount(0);
  });

  test("combines the filters of several columns and marks the filtered columns", async ({
    page,
  }) => {
    await setContent(page, PEOPLE);
    expect(await filterColumn(page, 1, PARIS)).toBe(true);
    expect(await filterColumn(page, 2, { kind: "number", min: 5 })).toBe(true);

    await expect(visibleColumn(page, 0)).toHaveText(["Ann", "Cid"]);
    await expect(status(page)).toContainText("Showing 2 of 6 rows");
    await expect(columnButton(page, "Column menu: City")).toHaveAccessibleName(
      "Column menu: City (filtered)"
    );
    await expect(columnButton(page, "Column menu: City")).toHaveClass(/is-filtered/);
    await expect(columnButton(page, "Column menu: Amount")).toHaveClass(/is-filtered/);
    await expect(columnButton(page, "Column menu: Name")).not.toHaveClass(/is-filtered/);
  });

  test("clears one column from its menu and every filter from the status bar", async ({ page }) => {
    await setContent(page, PEOPLE);
    await filterColumn(page, 1, PARIS);
    await filterColumn(page, 2, { kind: "number", min: 5 });

    const menu = await openMenu(page, "City");
    await menu.getByRole("button", { name: "Clear column" }).click();
    await expect(menu).toBeHidden();
    await expect(columnButton(page, "Column menu: City")).not.toHaveClass(/is-filtered/);
    await expect(visibleColumn(page, 0)).toHaveText(["Ann", "Bob", "Cid", "Dan", "Fay"]);

    await status(page).getByRole("button", { name: "Clear filters" }).click();
    await expect(hiddenRows(page)).toHaveCount(0);
    await expect(status(page)).toHaveCount(0);
    await expect(page.locator(".ProseMirror .ate-table-column-button.is-filtered")).toHaveCount(0);
  });

  test("keeps the filter out of the document and its exports", async ({ page }) => {
    await setContent(page, "<p>Intro</p>" + PEOPLE);
    const html = await editorHtml(page);
    const json = JSON.stringify(await withEditor(page, editor => editor.getJSON(), null));

    await filterColumn(page, 1, PARIS);
    await expect(hiddenRows(page)).toHaveCount(3);

    expect(await editorHtml(page)).toBe(html);
    expect(await editorHtml(page)).not.toContain("data-ate-table-hidden");
    expect(await editorHtml(page)).not.toContain("Showing");
    expect(JSON.stringify(await withEditor(page, editor => editor.getJSON(), null))).toBe(json);
  });

  test("keeps the row holding the cursor visible while it is edited", async ({ page }) => {
    await setContent(page, PEOPLE);
    await filterColumn(page, 1, PARIS);
    await expect(visibleColumn(page, 0)).toHaveText(["Ann", "Cid", "Eve"]);

    await bodyCell(page, 3, 1).click();
    await page.keyboard.press("End");
    await page.keyboard.press("Backspace");
    await expect(bodyCell(page, 3, 1)).toHaveText("Pari");
    await expect(visibleColumn(page, 0)).toHaveText(["Ann", "Cid", "Eve"]);

    await bodyCell(page, 1, 0).click();
    await expect(visibleColumn(page, 0)).toHaveText(["Ann", "Eve"]);
  });

  test("copies only the visible rows", async ({ page }) => {
    await setContent(page, "<p>Intro</p>" + PEOPLE);
    await filterColumn(page, 1, PARIS);
    await expect(hiddenRows(page)).toHaveCount(3);

    const whole = await withEditor(
      page,
      editor => {
        editor.chain().focus().selectAll().run();
        const { dom, text } = editor.view.serializeForClipboard(editor.state.selection.content());
        return { html: dom.innerHTML, text };
      },
      null
    );
    for (const name of ["Intro", "Ann", "Cid", "Eve", "City"]) {
      expect(whole.html).toContain(name);
      expect(whole.text).toContain(name);
    }
    for (const name of ["Bob", "Dan", "Fay"]) {
      expect(whole.html).not.toContain(name);
      expect(whole.text).not.toContain(name);
    }

    await selectCells(page, 0, 1, 5);
    const cells = await withEditor(
      page,
      editor => {
        const { dom, text } = editor.view.serializeForClipboard(editor.state.selection.content());
        return { html: dom.innerHTML, text };
      },
      null
    );
    for (const name of ["Name", "Ann", "Cid", "Eve"]) {
      expect(cells.html).toContain(name);
    }
    for (const name of ["Bob", "Dan", "City"]) {
      expect(cells.html).not.toContain(name);
      expect(cells.text).not.toContain(name);
    }
  });

  test("cuts only the visible rows and removes no row", async ({ page, browserName }) => {
    test.skip(
      browserName === "firefox",
      "Firefox does not deliver the clipboardData of a ClipboardEvent created by a script"
    );
    await setContent(page, PEOPLE);
    await filterColumn(page, 1, PARIS);
    await selectCells(page, 0, 1, 5);

    const copied = await withEditor(
      page,
      editor => {
        const clipboardData = new DataTransfer();
        editor.view.dom.dispatchEvent(
          new ClipboardEvent("cut", { clipboardData, bubbles: true, cancelable: true })
        );
        return clipboardData.getData("text/html");
      },
      null
    );
    expect(copied).toContain("Ann");
    expect(copied).toContain("Eve");
    expect(copied).not.toContain("Bob");

    await expect(allRows(page)).toHaveCount(7);
    await expect(visibleColumn(page, 0)).toHaveText(["", "", ""]);
    const html = await editorHtml(page);
    for (const name of ["Bob", "Dan", "Fay"]) {
      expect(html).toContain(name);
    }
    expect(html).not.toContain("Ann");
  });

  test("pastes only into the visible rows", async ({ page }) => {
    await setContent(page, PEOPLE);
    await filterColumn(page, 1, PARIS);
    await selectCells(page, 0, 1, 5);

    await withEditor(page, editor => editor.view.pasteHTML("<p>X</p>"), null);
    await expect(visibleColumn(page, 0)).toHaveText(["X", "X", "X"]);

    await withEditor(page, editor => editor.commands.clearTableFilters(), null);
    await expect(hiddenRows(page)).toHaveCount(0);
    await expect(visibleColumn(page, 0)).toHaveText(["X", "Bob", "X", "Dan", "X", "Fay"]);
  });

  test("Delete, Backspace and typing over a selection keep the hidden rows", async ({ page }) => {
    await setContent(page, "<p>Intro</p>" + PEOPLE + "<p>Outro</p>");
    await filterColumn(page, 1, PARIS);

    await selectCells(page, 0, 1, 5);
    await page.keyboard.press("Delete");
    await expect(visibleColumn(page, 0)).toHaveText(["", "", ""]);
    await expect(allRows(page)).toHaveCount(7);

    await selectCells(page, 3, 1, 5);
    await page.keyboard.type("Z");
    await expect(visibleColumn(page, 3)).toHaveText(["", "", "Z"]);

    await withEditor(page, editor => editor.chain().focus().selectAll().run(), null);
    await page.keyboard.press("Backspace");
    await expect(allRows(page)).toHaveCount(7);
    const html = await editorHtml(page);
    for (const text of ["Bob", "Lyon", "Dan", "Nice", "Fay", "28/02/2024"]) {
      expect(html).toContain(text);
    }
    for (const text of ["Intro", "Outro", "Paris", "Z"]) {
      expect(html).not.toContain(text);
    }
  });

  test("arrow keys and Tab skip the hidden rows", async ({ page }) => {
    await setContent(page, PEOPLE);
    await filterColumn(page, 1, PARIS);

    await bodyCell(page, 1, 0).click();
    await page.keyboard.press("ArrowDown");
    await expect.poll(() => caretRowText(page)).toMatch(/^Cid/);
    await page.keyboard.press("ArrowUp");
    await expect.poll(() => caretRowText(page)).toMatch(/^Ann/);

    await page.keyboard.press("Shift+ArrowDown");
    await expect
      .poll(() => withEditor(page, editor => "$anchorCell" in editor.state.selection, null))
      .toBe(true);
    await expect(page.locator(".ProseMirror td.selectedCell")).toHaveCount(3);

    await bodyCell(page, 1, 3).click();
    await page.keyboard.press("Tab");
    await expect.poll(() => caretRowText(page)).toMatch(/^Cid/);
    await page.keyboard.press("Shift+Tab");
    await expect.poll(() => caretRowText(page)).toMatch(/^Ann/);

    await bodyCell(page, 5, 3).click();
    await page.keyboard.press("Tab");
    await expect(allRows(page)).toHaveCount(8);
    await expect.poll(() => caretRowText(page)).toBe("");
    await expect(visibleColumn(page, 0)).toHaveText(["Ann", "Cid", "Eve", ""]);
    expect(await editorHtml(page)).toContain("Fay");
  });

  test("blocks row and cell operations while the selection holds hidden rows", async ({ page }) => {
    await setContent(page, PEOPLE);
    await filterColumn(page, 1, PARIS);
    await selectCells(page, 0, 1, 5);

    await expect(page.getByRole("button", { name: "Merge cells", exact: true })).toBeDisabled();
    await withEditor(page, editor => editor.commands.deleteRow(), null);
    await withEditor(page, editor => editor.commands.mergeCells(), null);
    await expect(allRows(page)).toHaveCount(7);
    expect(await editorHtml(page)).toContain("Bob");
    await expect(page.locator(".ProseMirror td[rowspan]")).toHaveCount(0);

    const prevented = await withEditor(
      page,
      editor => {
        const cell = editor.view.dom.querySelector("td")!;
        const event = new DragEvent("dragstart", {
          dataTransfer: new DataTransfer(),
          bubbles: true,
          cancelable: true,
        });
        cell.dispatchEvent(event);
        return event.defaultPrevented;
      },
      null
    );
    expect(prevented).toBe(true);

    await bodyCell(page, 1, 0).click();
    await withEditor(page, editor => editor.commands.deleteRow(), null);
    await expect(allRows(page)).toHaveCount(6);
    expect(await editorHtml(page)).toContain("Bob");
    expect(await editorHtml(page)).not.toContain("Ann");
  });

  test("shows a row that code selects and scrolls to", async ({ page }) => {
    await setContent(page, PEOPLE);
    await filterColumn(page, 1, PARIS);
    await expect(hiddenRows(page)).toHaveCount(3);

    const bob = await rowPos(page, "Bob");
    expect(await withEditor(page, (editor, pos) => editor.commands.revealTableRow(pos), bob)).toBe(
      true
    );
    await expect(hiddenRows(page)).toHaveCount(0);
    await expect(status(page)).toHaveCount(0);

    await filterColumn(page, 1, PARIS);
    await withEditor(page, editor => editor.setEditable(false), null);
    await expect(hiddenRows(page)).toHaveCount(3);
    const dan = await rowPos(page, "Dan");
    await withEditor(
      page,
      (editor, pos) => editor.chain().setTextSelection(pos).scrollIntoView().run(),
      dan
    );
    await expect(hiddenRows(page)).toHaveCount(0);
  });

  test("translates the filter", async ({ page }) => {
    await setConfig(page, { locale: "pt-BR" });
    await setContent(
      page,
      tableHtml(
        ["Nome", "Cidade"],
        [
          ["Ana", "Recife"],
          ["Bia", ""],
          ["Caio", "Recife"],
        ]
      )
    );

    await columnButton(page, "Menu da coluna: Cidade").click();
    const menu = page.getByRole("dialog", { name: "Menu da coluna: Cidade" });
    await expect(menu.getByRole("group", { name: "Filtrar" })).toBeVisible();
    await expect(menu.getByRole("checkbox", { name: /^\(vazio\)/ })).toBeVisible();

    await menu.getByRole("checkbox", { name: "Todos", exact: true }).uncheck();
    await expect(status(page)).toContainText("Nenhuma linha corresponde aos filtros");
    await menu.getByRole("checkbox", { name: /^Recife/ }).check();
    await expect(status(page)).toContainText("Mostrando 2 de 3 linhas");
    await expect(status(page).getByRole("button", { name: "Limpar filtros" })).toBeVisible();
    await expect(columnButton(page, "Menu da coluna: Cidade")).toHaveAccessibleName(
      "Menu da coluna: Cidade (filtrada)"
    );

    await menu.getByRole("button", { name: "Limpar coluna" }).click();
    await expect(status(page)).toHaveCount(0);
  });
});
