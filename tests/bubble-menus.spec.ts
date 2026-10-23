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

  test("should anchor the text color picker to the selection in seamless mode", async ({
    page,
  }) => {
    await page.getByTestId("open-config-button").click();
    await page.locator("app-seamless-config .app-toggle").click();
    await page.getByTestId("sidebar-config").getByTestId("panel-close-button").click();
    await expect(page.locator("angular-tiptap-editor").first()).toHaveAttribute(
      "style",
      /--ate-background: transparent/
    );

    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("Anchor me please");
    await editor.selectText();

    const bubbleMenu = page.locator(".tippy-box");
    await expect(bubbleMenu).toBeVisible();

    const colorMenu = page.locator(".color-bubble-menu");
    const openTextColorPicker = async () => {
      await editor.selectText();
      await bubbleMenu.getByRole("button", { name: /text color/i }).click();
      await expect(colorMenu).toBeVisible();
      await page.waitForTimeout(300);
    };
    const selectionRect = () =>
      page.evaluate(() => {
        const { x, y, width, height } = window
          .getSelection()!
          .getRangeAt(0)
          .getBoundingClientRect();
        return { x, y, width, height };
      });

    await openTextColorPicker();

    const selection = await selectionRect();
    const menu = (await colorMenu.boundingBox())!;
    expect(Math.abs(menu.x - selection.x)).toBeLessThan(40);
    expect(menu.y - (selection.y + selection.height)).toBeGreaterThanOrEqual(0);
    expect(menu.y - (selection.y + selection.height)).toBeLessThan(30);

    const defaultHex = await page.evaluate(() => {
      const [r, g, b] = getComputedStyle(document.querySelector(".ProseMirror p")!)
        .color.match(/\d+/g)!
        .map(Number);
      return [r, g, b].map(channel => channel.toString(16).padStart(2, "0")).join("");
    });
    await expect(page.locator(".hex-input")).toHaveValue(new RegExp(`^${defaultHex}$`, "i"));

    const swatch = colorMenu.locator(".color-swatch-btn button").nth(3);
    const appliedColor = (await swatch.getAttribute("aria-label"))!;
    await swatch.click();
    await expect(editor.locator("span[style*='color']")).toHaveCount(1);

    await editor.click();
    await expect(colorMenu).toBeHidden();
    await openTextColorPicker();

    const reselection = await selectionRect();
    const reopened = (await colorMenu.boundingBox())!;
    expect(Math.abs(reopened.x - reselection.x)).toBeLessThan(40);
    expect(reopened.y - (reselection.y + reselection.height)).toBeLessThan(30);
    await expect(page.locator(".hex-input")).toHaveValue(
      new RegExp(`^${appliedColor.replace("#", "")}$`, "i")
    );
  });
});
