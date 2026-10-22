import { test, expect, type Page } from "@playwright/test";

type EditorLike = {
  extensionManager: { extensions: { name: string; options: Record<string, unknown> }[] };
};

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => { getEditor: () => EditorLike | null };
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
};

async function applyStarterKitOptions(page: Page, starterKitOptions: Record<string, unknown>) {
  await page.evaluate(options => {
    const win = window as DebugWindow;
    if (!win.ng) {
      throw new Error("Angular debug API is not available in test mode.");
    }
    const host = document.querySelector("angular-tiptap-editor");
    if (!host) {
      throw new Error("Editor host element not found.");
    }
    const app = win.ng.getOwningComponent(host);
    const config = { ...app.editorConfig(), starterKitOptions: options };
    app.editorConfig = () => config;
    win.ng.applyChanges(app);
  }, starterKitOptions);
}

async function getExtension(page: Page, name: string) {
  return page.evaluate(extensionName => {
    const win = window as DebugWindow;
    const host = document.querySelector("angular-tiptap-editor");
    const editor = host && win.ng?.getComponent(host).getEditor();
    const extension = editor?.extensionManager.extensions.find(item => item.name === extensionName);
    return extension ? { options: JSON.parse(JSON.stringify(extension.options)) } : null;
  }, name);
}

test.describe("Editor starterKitOptions", () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(
      browserName !== "chromium",
      "reconfigures the demo through the Angular debug API, verified on chromium only"
    );

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

  test("undoRedo: false removes the history extension and Mod+Z no longer undoes typing", async ({
    page,
  }) => {
    await applyStarterKitOptions(page, { undoRedo: false });
    await expect.poll(() => getExtension(page, "undoRedo")).toBeNull();

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type("Keep me");
    await expect(editor).toHaveText("Keep me");

    await page.keyboard.press("ControlOrMeta+z");
    await expect(editor).toHaveText("Keep me");
  });

  test("without starterKitOptions Mod+Z undoes typing", async ({ page }) => {
    expect(await getExtension(page, "undoRedo")).not.toBeNull();

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type("Undo me");
    await expect(editor).toHaveText("Undo me");

    await page.keyboard.press("ControlOrMeta+z");
    await expect(editor).not.toContainText("Undo me");
  });

  test("link: { autolink: false } turns autolink off and keeps the library link defaults", async ({
    page,
  }) => {
    await applyStarterKitOptions(page, { link: { autolink: false } });

    await expect
      .poll(() => getExtension(page, "link"))
      .toMatchObject({
        options: { autolink: false, openOnClick: false, HTMLAttributes: { class: "ate-link" } },
      });

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type("https://example.com ");
    await expect(editor).toContainText("https://example.com");
    await expect(editor.locator("a")).toHaveCount(0);

    await page.getByTestId("clear-button").click();
    await expect(editor).toHaveText("");
    await editor.click();
    await page.keyboard.type("Docs");
    await editor.selectText();
    await expect(page.locator(".tippy-box")).toBeVisible();
    await page.keyboard.press("ControlOrMeta+k");
    await page.locator('input[placeholder*="URL"]').fill("https://angular.dev");
    await page.keyboard.press("Enter");

    const anchor = editor.locator("a");
    await expect(anchor).toHaveAttribute("href", "https://angular.dev");
    await expect(anchor).toHaveClass(/ate-link/);
  });

  test("without starterKitOptions autolink stays on", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type("https://example.com ");

    await expect(editor.locator("a")).toHaveAttribute("href", "https://example.com");
    await expect(editor.locator("a")).toHaveClass(/ate-link/);
  });
});
