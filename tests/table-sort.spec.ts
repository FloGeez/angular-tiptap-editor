import { test, expect, type Page } from "@playwright/test";
import { clearEditor } from "./helpers";

type DebugEditor = {
  isEditable: boolean;
  state: {
    doc: {
      descendants: (fn: (node: { type: { name: string } }, pos: number) => boolean | void) => void;
    };
  };
  commands: {
    setContent: (content: string) => boolean;
    insertContentAt: (position: number, content: string) => boolean;
    sortTableColumn: (column: number, direction: "asc" | "desc", tablePos?: number) => boolean;
    undo: () => boolean;
  };
};

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => { getEditor: () => DebugEditor | null };
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
};

function tableHtml(header: string[], rows: string[][]) {
  const head = `<tr>${header.map(cell => `<th><p>${cell}</p></th>`).join("")}</tr>`;
  const body = rows
    .map(row => `<tr>${row.map(cell => `<td><p>${cell}</p></td>`).join("")}</tr>`)
    .join("");
  return `<table><tbody>${head}${body}</tbody></table>`;
}

async function setContent(page: Page, html: string) {
  await page.evaluate(content => {
    const host = document.querySelector("angular-tiptap-editor")!;
    (window as DebugWindow).ng!.getComponent(host).getEditor()!.commands.setContent(content);
  }, html);
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

async function sortCommand(page: Page, column: number, direction: "asc" | "desc") {
  return page.evaluate(
    ({ col, dir }) => {
      const host = document.querySelector("angular-tiptap-editor")!;
      const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
      let tablePos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (tablePos < 0 && node.type.name === "table") {
          tablePos = pos;
        }
        return tablePos < 0;
      });
      return editor.commands.sortTableColumn(col, dir, tablePos);
    },
    { col: column, dir: direction }
  );
}

function bodyColumn(page: Page, column: number) {
  return page.locator(`.ProseMirror table tr:not(:first-child) > :nth-child(${column + 1})`);
}

function columnButton(page: Page, name: string | RegExp) {
  return page.locator(".ProseMirror table").getByRole("button", { name });
}

async function sortFromMenu(
  page: Page,
  header: string,
  label: "Sort ascending" | "Sort descending"
) {
  const button = columnButton(page, `Column menu: ${header}`);
  if ((await button.getAttribute("aria-expanded")) !== "true") {
    await button.click();
  }
  const menu = page.getByRole("dialog", { name: `Column menu: ${header}` });
  await expect(menu).toBeVisible();
  await menu.getByRole("button", { name: label }).click();
}

test.describe("Table sort", () => {
  test.use({ locale: "en-US" });

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    await clearEditor(page);
  });

  test("shows a menu button in each header column, only with a header row", async ({ page }) => {
    await setContent(
      page,
      tableHtml(["Name", "City", "Amount"], [["Ann", "Paris", "3"]]) +
        "<table><tbody><tr><td><p>No</p></td><td><p>header</p></td></tr></tbody></table>"
    );

    const buttons = page.locator(".ProseMirror .ate-table-column-button");
    await expect(buttons).toHaveCount(3);
    for (const name of ["Name", "City", "Amount"]) {
      const button = columnButton(page, `Column menu: ${name}`);
      await expect(button).toHaveAttribute("aria-haspopup", "dialog");
      await expect(button).toHaveAttribute("aria-expanded", "false");
      await expect(button.locator("xpath=..")).toHaveAttribute("contenteditable", "false");
    }
    await expect(page.locator(".ProseMirror table").nth(1).locator("button")).toHaveCount(0);
  });

  test("sorts text ascending and descending, empty cells last, ties in their order", async ({
    page,
  }) => {
    await setContent(
      page,
      tableHtml(
        ["Name", "Rank"],
        [
          ["émile", "1"],
          ["", "2"],
          ["Bob", "3"],
          ["Ana", "4"],
          ["bob", "5"],
          ["Zoe", "6"],
        ]
      )
    );

    await sortFromMenu(page, "Name", "Sort ascending");
    await expect(bodyColumn(page, 0)).toHaveText(["Ana", "Bob", "bob", "émile", "Zoe", ""]);
    await expect(bodyColumn(page, 1)).toHaveText(["4", "3", "5", "1", "6", "2"]);

    await page
      .getByRole("dialog", { name: "Column menu: Name" })
      .getByRole("button", { name: "Sort descending" })
      .click();
    await expect(bodyColumn(page, 0)).toHaveText(["Zoe", "émile", "Bob", "bob", "Ana", ""]);
    await expect(page.locator(".ProseMirror table tr").first()).toContainText("Name");
  });

  test("sorts numbers written with a decimal comma or a decimal point", async ({ page }) => {
    await setContent(
      page,
      tableHtml(
        ["Price", "Total"],
        [
          ["R$ 1.234,50", "1,234.5"],
          ["99,9", "99.9"],
          ["10", "10"],
          ["2.000", "2,000"],
          ["-5", "15%"],
        ]
      )
    );

    await sortFromMenu(page, "Price", "Sort ascending");
    await expect(bodyColumn(page, 0)).toHaveText(["-5", "10", "99,9", "R$ 1.234,50", "2.000"]);

    await sortFromMenu(page, "Total", "Sort descending");
    await expect(bodyColumn(page, 1)).toHaveText(["2,000", "1,234.5", "99.9", "15%", "10"]);
  });

  test("sorts dates, with or without a time", async ({ page }) => {
    await setContent(
      page,
      tableHtml(
        ["Day", "Created"],
        [
          ["10/02/2024", "2024-03-01 10:00"],
          ["01/12/2023", "2024-03-01 09:30"],
          ["15/01/2024 08:00", "2023-12-31"],
        ]
      )
    );

    await sortFromMenu(page, "Day", "Sort ascending");
    await expect(bodyColumn(page, 0)).toHaveText(["01/12/2023", "15/01/2024 08:00", "10/02/2024"]);

    await sortFromMenu(page, "Created", "Sort ascending");
    await expect(bodyColumn(page, 1)).toHaveText([
      "2023-12-31",
      "2024-03-01 09:30",
      "2024-03-01 10:00",
    ]);
  });

  test("one undo restores the order and the header row never moves", async ({ page }) => {
    await setContent(page, tableHtml(["Name"], [["c"], ["a"], ["b"]]));

    await sortFromMenu(page, "Name", "Sort ascending");
    await expect(bodyColumn(page, 0)).toHaveText(["a", "b", "c"]);
    await expect(page.locator(".ProseMirror table tr").first().locator("th p")).toHaveText("Name");

    await page.keyboard.press("Escape");
    await page.locator(".ProseMirror").focus();
    await page.keyboard.press("ControlOrMeta+z");
    await expect(bodyColumn(page, 0)).toHaveText(["c", "a", "b"]);
    await expect(page.locator(".ProseMirror table tr").first().locator("th p")).toHaveText("Name");
  });

  test("refuses to sort rows with a cell spanning rows", async ({ page }) => {
    await setContent(
      page,
      '<table><tbody><tr><th><p>Name</p></th><th><p>Group</p></th></tr><tr><td><p>b</p></td><td rowspan="2"><p>x</p></td></tr><tr><td><p>a</p></td></tr></tbody></table>'
    );

    await columnButton(page, "Column menu: Name").click();
    const ascending = page
      .getByRole("dialog", { name: "Column menu: Name" })
      .getByRole("button", { name: "Sort ascending" });
    await expect(ascending).toHaveAttribute("aria-disabled", "true");
    await expect(ascending).toHaveAttribute("title", "Rows with merged cells cannot be sorted");
    await ascending.click({ force: true });
    expect(await sortCommand(page, 0, "asc")).toBe(false);
    await expect(bodyColumn(page, 0)).toHaveText(["b", "a"]);
  });

  test("shows the sort arrow only while the table keeps that order", async ({ page }) => {
    await setContent(
      page,
      tableHtml(
        ["Name", "Rank"],
        [
          ["b", "1"],
          ["a", "2"],
        ]
      )
    );

    await sortFromMenu(page, "Name", "Sort descending");
    const header = page.locator(".ProseMirror table th").first();
    await expect(header).toHaveAttribute("aria-sort", "descending");
    await expect(header.locator(".ate-table-column-sort")).toHaveText("▼");
    await expect(
      page.getByRole("dialog").getByRole("button", { name: "Sort descending" })
    ).toHaveAttribute("aria-pressed", "true");

    await sortFromMenu(page, "Name", "Sort ascending");
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    await expect(header.locator(".ate-table-column-sort")).toHaveText("▲");

    await page.keyboard.press("Escape");
    await bodyColumn(page, 0).first().click();
    await page.keyboard.press("Home");
    await page.keyboard.type("z");
    await expect(bodyColumn(page, 0)).toHaveText(["za", "b"]);
    await expect(header).not.toHaveAttribute("aria-sort", /.*/);
    await expect(header.locator(".ate-table-column-sort")).toHaveCount(0);
  });

  test("disables the button with a tooltip when the editor is not editable", async ({ page }) => {
    await setContent(page, tableHtml(["Name"], [["b"], ["a"]]));
    await setConfig(page, { editable: false });
    await expect(page.locator(".ProseMirror")).toHaveAttribute("contenteditable", "false");

    const button = columnButton(page, "Column menu: Name");
    await expect(button).toHaveAttribute("aria-disabled", "true");
    await expect(button).toHaveAttribute("title", "Sorting is not available in read-only mode");
    await button.click({ force: true });
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await sortCommand(page, 0, "asc")).toBe(false);
    await expect(bodyColumn(page, 0)).toHaveText(["b", "a"]);

    await setConfig(page, { editable: true });
    await expect(button).not.toHaveAttribute("aria-disabled", /.*/);
  });

  test("translates the button and the menu", async ({ page }) => {
    await setContent(page, tableHtml(["Nome"], [["b"], ["a"]]));
    await setConfig(page, { locale: "pt-BR" });

    const button = columnButton(page, "Menu da coluna: Nome");
    await expect(button).toBeVisible();
    await button.click();
    const menu = page.getByRole("dialog", { name: "Menu da coluna: Nome" });
    await expect(menu.getByRole("button", { name: "Ordenar em ordem decrescente" })).toBeVisible();
    await menu.getByRole("button", { name: "Ordenar em ordem crescente" }).click();
    await expect(bodyColumn(page, 0)).toHaveText(["a", "b"]);
  });

  test("works from the keyboard", async ({ page }) => {
    await setContent(page, "<p>Intro</p>" + tableHtml(["Name"], [["b"], ["a"]]));
    await page.locator(".ProseMirror p").first().click();

    await page.keyboard.press("Tab");
    const button = columnButton(page, "Column menu: Name");
    await expect(button).toBeFocused();

    await page.keyboard.press("Enter");
    const menu = page.getByRole("dialog", { name: "Column menu: Name" });
    await expect(menu).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const ascending = menu.getByRole("button", { name: "Sort ascending" });
    await expect(ascending).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(bodyColumn(page, 0)).toHaveText(["a", "b"]);

    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute("aria-expanded", "false");
  });
});
