import { test, expect } from "@playwright/test";

test.describe("Decoupled Chrome (registry-resolved, no DI provider tree)", () => {
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

  test("a toolbar outside ate-editor-chassis, resolved by editor ID, edits the main editor", async ({
    page,
  }) => {
    await page.getByTestId("toggle-decoupled-demo").click();

    const standaloneToolbar = page.getByTestId("decoupled-chrome-demo");
    await expect(standaloneToolbar).toBeVisible();

    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("Standalone toolbar", { delay: 10 });
    await page.keyboard.press("Control+a");

    // Click bold on the standalone toolbar (no providers: ATE_EDITOR_PROVIDERS
    // anywhere above it — it resolves the "main-doc" editor via AteEditorRegistry).
    const boldBtn = standaloneToolbar.getByRole("button", { name: /bold/i });
    await expect(boldBtn).toBeEnabled();
    await boldBtn.click();

    await expect(editor.locator("strong")).toHaveText("Standalone toolbar");
  });
});
