import { test, expect } from "@playwright/test";

test.describe("Editor Toolbar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();

    // Force English
    const editorBtn = page.getByTestId("mode-editor");
    const text = await editorBtn.innerText();
    if (text.toLowerCase().includes("éditeur")) {
      await page.getByTestId("lang-switch").click();
      await expect(editorBtn).toHaveText(/editor/i);
    }

    await page.getByTestId("clear-button").click();
    await expect(page.locator(".ProseMirror")).toHaveText("");
  });

  test("should toggle bold formatting", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("Bold Text", { delay: 10 });
    await page.keyboard.press("Control+a");

    const boldBtn = page.getByRole("button", { name: /bold/i }).first();
    await expect(boldBtn).toBeEnabled();
    await boldBtn.click();

    await expect(editor.locator("strong")).toHaveText("Bold Text");

    // Toggle off
    await boldBtn.click();
    await expect(editor.locator("strong")).toHaveCount(0);
  });

  test("should handle lists", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();

    const listBtn = page.getByRole("button", { name: /bullet list/i }).first();
    await expect(listBtn).toBeEnabled();
    await listBtn.click();

    await page.keyboard.type("Item 1", { delay: 10 });
    await expect(editor.locator("ul li")).toHaveCount(1);
    await expect(editor.locator("ul li")).toHaveText("Item 1");
  });

  test("should undo and redo", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();

    // On tape lentement pour que l'historique soit bien segmenté sur Firefox/WebKit
    await page.keyboard.type("MagicUndo", { delay: 50 });
    await expect(editor).toContainText("MagicUndo");

    const undoBtn = page.getByRole("button", { name: /undo/i }).first();
    const redoBtn = page.getByRole("button", { name: /redo/i }).first();

    // Attente explicite de l'activation du bouton par Tiptap
    await expect(undoBtn).toBeEnabled({ timeout: 5000 });
    await undoBtn.click();

    // On vérifie la disparition
    await expect(editor).not.toContainText("MagicUndo", { timeout: 5000 });

    // Attente activation Redo
    await expect(redoBtn).toBeEnabled();
    await redoBtn.click();

    await expect(editor).toContainText("MagicUndo");
  });
});
