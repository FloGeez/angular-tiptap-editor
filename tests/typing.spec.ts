import { test, expect } from "@playwright/test";

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => {
      getEditor: () => { extensionManager: { extensions: { name: string }[] } } | null;
    };
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
};

test.describe("Editor Typing and Keyboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // On attend que le composant éditeur soit visible
    await expect(page.locator(".ate-editor")).toBeVisible();

    // Force EN
    const editorBtn = page.getByTestId("mode-editor");
    const text = await editorBtn.innerText();
    if (text.toLowerCase().includes("éditeur")) {
      await page.getByTestId("lang-switch").click();
      await expect(editorBtn).toHaveText(/editor/i);
    }

    await page.getByTestId("clear-button").click();
    await expect(page.locator(".ProseMirror")).toHaveText("");
  });

  test("should type characters correctly", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type("Hello World", { delay: 20 });
    await expect(editor).toHaveText("Hello World");
  });

  test("should handle new lines with Enter", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type("Line 1");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Line 2");

    await expect(editor.locator("p")).toHaveCount(2);
    await expect(editor.locator("p").first()).toHaveText("Line 1");
    await expect(editor.locator("p").last()).toHaveText("Line 2");
  });

  test("should support keyboard shortcuts (Bold)", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("ControlOrMeta+b");
    await page.keyboard.type("Bold");
    await expect(editor.locator("strong")).toHaveText("Bold");
  });
});

test.describe("Editor instance across config changes", () => {
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

  test("should keep the editor instance, content and undo history when only the theme changes", async ({
    page,
  }) => {
    const editor = page.locator(".ProseMirror");
    const app = page.getByTestId("app-root");
    await editor.click();
    await page.keyboard.type("Before theme", { delay: 20 });
    await expect(editor).toHaveText("Before theme");

    await editor.evaluate(el => el.setAttribute("data-instance-marker", "original"));
    const wasDark = await app.evaluate(el => el.classList.contains("dark"));

    for (let i = 0; i < 2; i++) {
      await page.getByTestId("theme-switch").click();
      const expectDark = wasDark === (i === 1);
      if (expectDark) {
        await expect(app).toHaveClass(/dark/);
      } else {
        await expect(app).not.toHaveClass(/dark/);
      }
      await expect(page.locator("angular-tiptap-editor")).toHaveAttribute(
        "data-theme",
        expectDark ? "dark" : "light"
      );
      await expect(editor).toHaveAttribute("data-instance-marker", "original");
      await expect(editor).toHaveText("Before theme");
    }

    await editor.click();
    await page.keyboard.press("ControlOrMeta+z");
    await expect(editor).not.toContainText("Before theme");
  });

  test("should still re-initialize the editor when the extension list changes", async ({
    page,
  }) => {
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.type("Kept content", { delay: 20 });
    await editor.evaluate(el => el.setAttribute("data-instance-marker", "original"));

    await page.evaluate(() => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor")!;
      const editor = win.ng!.getComponent(host).getEditor()!;
      const highlight = editor.extensionManager.extensions.find(
        ext => ext.name === "highlight"
      ) as unknown as { extend: (opts: Record<string, unknown>) => unknown };
      const app = win.ng!.getOwningComponent(host);
      const nextConfig = {
        ...app.editorConfig(),
        tiptapExtensions: [highlight.extend({ name: "uniqueHighlight" })],
      };
      app.editorConfig = () => nextConfig;
      win.ng!.applyChanges(app);
    });

    await expect(page.locator(".ProseMirror")).not.toHaveAttribute(
      "data-instance-marker",
      "original"
    );
    await expect(page.locator(".ProseMirror")).toContainText("Kept content");
  });
});
