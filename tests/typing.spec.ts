import { test, expect } from "@playwright/test";

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
