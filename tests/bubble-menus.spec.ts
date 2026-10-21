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
  test("should focus the URL field when the link menu opens from the bubble menu", async ({
    page,
  }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("FocusMe");
    await editor.selectText();

    await page.locator(".tippy-box").getByRole("button", { name: /link/i }).click();

    const linkInput = page.locator('input[placeholder*="URL"]');
    await expect(linkInput).toBeFocused();
    await page.keyboard.type("https://angular.dev");
    await page.keyboard.press("Enter");

    await expect(editor.locator("a")).toHaveAttribute("href", "https://angular.dev");
  });

  test("should open the link editor with Mod+K on a selection", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("Shortcut");
    await editor.selectText();
    await expect(page.locator(".tippy-box")).toBeVisible();

    await page.keyboard.press("ControlOrMeta+k");

    const linkInput = page.locator('input[placeholder*="URL"]');
    await expect(linkInput).toBeFocused();
    await page.keyboard.type("https://tiptap.dev");
    await page.keyboard.press("Enter");

    await expect(editor.locator("a")).toHaveAttribute("href", "https://tiptap.dev");
    await expect(editor.locator("a")).toHaveText("Shortcut");
  });

  test("should edit an existing link with Mod+K when the cursor is on it", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    const linkInput = page.locator('input[placeholder*="URL"]');

    await editor.focus();
    await page.keyboard.type("Existing");
    await editor.selectText();
    await expect(page.locator(".tippy-box")).toBeVisible();

    await page.keyboard.press("ControlOrMeta+k");
    await expect(linkInput).toBeFocused();
    await page.keyboard.type("https://old.example.com");
    await page.keyboard.press("Enter");

    await expect(editor.locator("a")).toHaveAttribute("href", "https://old.example.com");
    await editor.locator("a").click();
    await page.keyboard.press("ControlOrMeta+k");

    await expect(linkInput).toBeFocused();
    await expect(linkInput).toHaveValue("https://old.example.com");
  });

  test("should leave Mod+K to the host app when nothing is selected", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("Nothing selected");

    await page.evaluate(() => {
      const win = window as Window & { __modK?: { reached: boolean; prevented: boolean } };
      win.__modK = { reached: false, prevented: false };
      document.addEventListener("keydown", event => {
        if (event.key.toLowerCase() === "k") {
          win.__modK = { reached: true, prevented: event.defaultPrevented };
        }
      });
    });

    await page.keyboard.press("ControlOrMeta+k");

    const modK = await page.evaluate(
      () => (window as Window & { __modK?: { reached: boolean; prevented: boolean } }).__modK
    );
    expect(modK).toEqual({ reached: true, prevented: false });
    await expect(editor).toBeFocused();
    await expect(page.locator('input[placeholder*="URL"]')).toHaveCount(0);
  });
});
