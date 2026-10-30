import { test, expect, type Page } from "@playwright/test";

type ExtensionInstance = {
  name: string;
  options: Record<string, unknown>;
};

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => {
      getEditor: () => { extensionManager: { extensions: ExtensionInstance[] } } | null;
    };
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
};

async function getExtensionsByName(page: Page, name: string) {
  return page.evaluate(extensionName => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor");
    const editor = host && win.ng?.getComponent(host).getEditor();
    const matches =
      editor?.extensionManager.extensions.filter(item => item.name === extensionName) ?? [];
    return matches.map(ext => ({
      name: ext.name,
      options: JSON.parse(JSON.stringify(ext.options ?? {})),
    }));
  }, name);
}

test.describe("Task lists", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();

    const editorBtn = page.getByTestId("mode-editor");
    const text = await editorBtn.innerText();
    if (text.toLowerCase().includes("éditeur")) {
      await page.getByTestId("lang-switch").click();
      await expect(editorBtn).toHaveText(/editor/i);
    }

    await page.getByTestId("clear-button").click();
    await expect(page.locator(".ProseMirror")).toHaveText("");
  });

  test("slash command inserts a task list", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("/task", { delay: 50 });
    await expect(page.locator(".slash-command-item").filter({ hasText: /Task List/i })).toHaveClass(
      /selected/
    );

    await page.keyboard.press("Enter");
    await page.keyboard.type("Buy milk");

    const item = editor.locator('ul[data-type="taskList"] > li[data-checked]');
    await expect(item).toHaveCount(1);
    await expect(item).toHaveAttribute("data-checked", "false");
    await expect(item).toContainText("Buy milk");
    await expect(item.locator('input[type="checkbox"]')).not.toBeChecked();
  });

  test("checkbox toggles the item", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("/task", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.keyboard.type("Ship it");

    const item = editor.locator("li[data-checked]");
    const checkbox = item.locator('input[type="checkbox"]');

    await checkbox.click();
    await expect(item).toHaveAttribute("data-checked", "true");
    await expect(checkbox).toBeChecked();
    await expect(item.locator("> div")).toHaveCSS("text-decoration-line", "line-through");

    await checkbox.click();
    await expect(item).toHaveAttribute("data-checked", "false");
    await expect(checkbox).not.toBeChecked();
  });

  test("Tab nests a task under the previous one", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("/task", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.keyboard.type("Parent");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Child");
    await page.keyboard.press("Tab");

    const nested = editor.locator('li[data-checked] ul[data-type="taskList"] li[data-checked]');
    await expect(nested).toHaveCount(1);
    await expect(nested).toContainText("Child");
    await expect(editor.locator('ul[data-type="taskList"] > li > div > p').first()).toHaveText(
      "Parent"
    );
  });

  test("toolbar button is hidden by default and toggles a task list when enabled", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "reconfigures the demo through the Angular debug API, verified on chromium only"
    );

    await expect(
      page.locator(".ate-toolbar").getByRole("button", { name: /task list/i })
    ).toHaveCount(0);

    await page.evaluate(() => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor")!;
      const app = win.ng!.getOwningComponent(host);
      const config = app.editorConfig() as { toolbar?: Record<string, unknown> };
      const nextConfig = { ...config, toolbar: { ...config.toolbar, taskList: true } };
      app.editorConfig = () => nextConfig;
      win.ng!.applyChanges(app);
    });

    const editor = page.locator(".ProseMirror");
    const button = page.locator(".ate-toolbar").getByRole("button", { name: /task list/i });
    await expect(button).toBeVisible();

    await editor.click();
    await page.keyboard.type("Todo");
    await button.click();
    await expect(editor.locator('ul[data-type="taskList"] li[data-checked]')).toHaveCount(1);

    await button.click();
    await expect(editor.locator('ul[data-type="taskList"]')).toHaveCount(0);
    await expect(editor).toContainText("Todo");
  });

  test("TaskList and TaskItem in tiptapExtensions replace the built-in ones", async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== "chromium",
      "reconfigures the demo through the Angular debug API, verified on chromium only"
    );

    expect(await getExtensionsByName(page, "taskList")).toHaveLength(1);
    expect(await getExtensionsByName(page, "taskItem")).toMatchObject([
      { options: { nested: true } },
    ]);

    await page.evaluate(() => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor")!;
      const editor = win.ng!.getComponent(host).getEditor()!;
      type Configurable = { configure: (opts: Record<string, unknown>) => ExtensionInstance };
      const find = (name: string) =>
        editor.extensionManager.extensions.find(
          ext => ext.name === name
        ) as unknown as Configurable;

      const app = win.ng!.getOwningComponent(host);
      const nextConfig = {
        ...app.editorConfig(),
        tiptapExtensions: [
          find("taskList").configure({ HTMLAttributes: { class: "custom-task-list" } }),
          find("taskItem").configure({
            nested: false,
            HTMLAttributes: { class: "custom-task-item" },
          }),
        ],
      };
      app.editorConfig = () => nextConfig;
      win.ng!.applyChanges(app);
    });

    await expect
      .poll(() => getExtensionsByName(page, "taskList"))
      .toEqual([
        {
          name: "taskList",
          options: expect.objectContaining({ HTMLAttributes: { class: "custom-task-list" } }),
        },
      ]);
    await expect
      .poll(() => getExtensionsByName(page, "taskItem"))
      .toEqual([
        {
          name: "taskItem",
          options: expect.objectContaining({
            nested: false,
            HTMLAttributes: { class: "custom-task-item" },
          }),
        },
      ]);

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type("/task", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.keyboard.type("Custom");

    await expect(editor.locator("ul.custom-task-list > li.custom-task-item")).toHaveCount(1);
  });

  test("task colors follow theme tokens set on the editor, not only on :root", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("/task", { delay: 50 });
    await page.keyboard.press("Enter");
    await page.keyboard.type("Done");
    const item = editor.locator('ul[data-type="taskList"] > li[data-checked]');
    await item.locator('input[type="checkbox"]').click();
    await expect(item).toHaveAttribute("data-checked", "true");

    // A theme scoped to one editor (or to a container with [data-theme="dark"])
    await page.evaluate(() => {
      const host = document.querySelector<HTMLElement>("angular-tiptap-editor")!;
      host.style.setProperty("--ate-primary", "rgb(1, 2, 3)");
      host.style.setProperty("--ate-text-muted", "rgb(4, 5, 6)");
    });

    await expect(item.locator('input[type="checkbox"]')).toHaveCSS("accent-color", "rgb(1, 2, 3)");
    await expect(item.locator("> div")).toHaveCSS("color", "rgb(4, 5, 6)");
  });
});
