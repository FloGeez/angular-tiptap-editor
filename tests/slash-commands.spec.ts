import { test, expect } from "@playwright/test";

test.describe("Editor Slash Commands", () => {
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

  test("should trigger slash menu", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("/", { delay: 100 });

    // Attendre que le menu soit visible
    await expect(page.locator(".tippy-box")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(".slash-command-item")).toHaveCount(12);
  });

  test("should filter slash commands", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("/", { delay: 100 });
    await page.keyboard.type("h2", { delay: 100 });

    const h2Item = page.locator(".slash-command-item").filter({ hasText: /Heading 2/i });
    await expect(h2Item).toBeVisible();
  });

  // #90: the command used to run 10 ms after the "/" text was removed, so fast typing went to the old paragraph
  test("should send keys typed right after picking a command to the inserted block", async ({
    page,
  }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("abc");
    await page.keyboard.press("Enter");
    await page.keyboard.type("/table", { delay: 50 });
    await expect(
      page.locator(".slash-command-item").filter({ hasText: /Table/i }).first()
    ).toHaveClass(/selected/);

    await page.keyboard.press("Enter");
    await page.keyboard.type("c1");

    await expect(editor.locator("th, td").first()).toHaveText("c1");
    // Nothing typed went to a paragraph: only "abc" and possibly the empty trailing paragraph
    const paragraphs = await editor.locator(":scope > p").allTextContents();
    expect(paragraphs.filter(text => text !== "")).toEqual(["abc"]);
  });

  test("should execute command with Enter", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("/", { delay: 100 });
    await page.keyboard.type("h3", { delay: 100 });

    const h3Item = page.locator(".slash-command-item").filter({ hasText: /Heading 3/i });
    await expect(h3Item).toBeVisible();
    await expect(h3Item).toHaveClass(/selected/);

    // Petite pause pour laisser le plugin de suggestion Tiptap se stabiliser (crucial pour WebKit/Firefox)
    await page.waitForTimeout(300);
    await page.keyboard.press("Enter");

    await expect(page.locator(".tippy-box")).not.toBeVisible();

    await page.keyboard.type("SlashHeading", { delay: 20 });
    await expect(editor.locator("h3")).toHaveText("SlashHeading");
  });
});
