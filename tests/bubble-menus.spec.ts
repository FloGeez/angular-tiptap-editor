import { test, expect } from "@playwright/test";

test.describe("Editor Bubble Menus", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
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

  test("should show text bubble menu on selection", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("SelectMe");

    // Utilisation de selectText() au lieu de dblclick() pour une compatibilité parfaite cross-browser
    await editor.selectText();

    // Le menu Tippy doit apparaître
    const bubbleMenu = page.locator(".tippy-box");
    await expect(bubbleMenu).toBeVisible();
    await expect(bubbleMenu.getByRole("button", { name: /bold/i })).toBeVisible();
  });

  test("should apply bold via bubble menu", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("BoldMe");

    await editor.selectText();

    const bubbleMenu = page.locator(".tippy-box");
    const boldBtn = bubbleMenu.getByRole("button", { name: /bold/i });
    await expect(boldBtn).toBeVisible();
    await boldBtn.click();

    // Vérification sur le contenu
    await expect(editor.locator("strong")).toHaveText("BoldMe");
  });

  test("should show link bubble menu", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("MyLink");

    await editor.selectText();

    // Ouverture du menu lien
    const linkBtn = page.locator(".tippy-box").getByRole("button", { name: /link/i });
    await expect(linkBtn).toBeVisible();
    await linkBtn.click();

    // Remplissage de l'URL
    const linkInput = page.locator('input[placeholder*="URL"]');
    await expect(linkInput).toBeVisible();
    await linkInput.fill("https://playwright.dev");
    await page.keyboard.press("Enter");

    // Vérification du lien créé
    await expect(editor.locator("a")).toHaveAttribute("href", "https://playwright.dev");
  });
});
