import { test, expect, type Page } from "@playwright/test";
import { clearEditor } from "./helpers";

test.describe("Link text field", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();

    const editorBtn = page.getByTestId("mode-editor");
    const text = await editorBtn.innerText();
    if (text.toLowerCase().includes("éditeur")) {
      await page.getByTestId("lang-switch").click();
      await expect(editorBtn).toHaveText(/editor/i);
    }

    await clearEditor(page);
  });

  const urlField = (page: Page) => page.getByPlaceholder("Link URL");
  const textField = (page: Page) => page.getByPlaceholder("Link Text");

  /** Types `text`, selects it and links it to `href` through Mod+K */
  async function createLink(page: Page, text: string, href: string) {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type(text);
    await editor.selectText();
    await expect(page.locator(".tippy-box")).toBeVisible();
    await page.keyboard.press("ControlOrMeta+k");
    await expect(urlField(page)).toBeFocused();
    await page.keyboard.type(href);
    await page.keyboard.press("Enter");
    await expect(editor.locator("a")).toHaveAttribute("href", href);
  }

  async function reopenOnLink(page: Page) {
    await page.locator(".ProseMirror a").click();
    await page.keyboard.press("ControlOrMeta+k");
    await expect(urlField(page)).toBeFocused();
  }

  test("should prefill the text field from the bubble menu and replace the selected text", async ({
    page,
  }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("Docs");
    await editor.selectText();

    await page.locator(".tippy-box").getByRole("button", { name: /link/i }).click();

    await expect(textField(page)).toHaveValue("Docs");
    await urlField(page).fill("https://angular.dev");
    await textField(page).fill("Read the docs");
    await textField(page).press("Enter");

    await expect(editor.locator("a")).toHaveText("Read the docs");
    await expect(editor.locator("a")).toHaveAttribute("href", "https://angular.dev");
    await expect(editor).toHaveText("Read the docs");
  });

  test("should replace the selected text with Mod+K", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("Shortcut");
    await editor.selectText();
    await expect(page.locator(".tippy-box")).toBeVisible();

    await page.keyboard.press("ControlOrMeta+k");
    await expect(urlField(page)).toBeFocused();
    await expect(textField(page)).toHaveValue("Shortcut");
    await page.keyboard.type("https://tiptap.dev");
    await textField(page).fill("Tiptap");
    await urlField(page).press("Enter");

    await expect(editor.locator("a")).toHaveText("Tiptap");
    await expect(editor.locator("a")).toHaveAttribute("href", "https://tiptap.dev");
  });

  test("should change only the text of an existing link and keep its destination", async ({
    page,
  }) => {
    const editor = page.locator(".ProseMirror");
    await createLink(page, "Old", "https://example.com/path");

    await reopenOnLink(page);
    await expect(textField(page)).toHaveValue("Old");
    await expect(urlField(page)).toHaveValue("https://example.com/path");
    await textField(page).fill("New");
    await textField(page).press("Enter");

    await expect(editor.locator("a")).toHaveText("New");
    await expect(editor.locator("a")).toHaveAttribute("href", "https://example.com/path");
  });

  test("should keep the text when only the URL changes", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await createLink(page, "Same", "https://old.example.com");

    await reopenOnLink(page);
    await urlField(page).fill("https://new.example.com");
    await urlField(page).press("Enter");

    await expect(editor.locator("a")).toHaveText("Same");
    await expect(editor.locator("a")).toHaveAttribute("href", "https://new.example.com");
  });

  test("should keep the current text when the text field is emptied", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await createLink(page, "Keep", "https://keep.example.com");

    await reopenOnLink(page);
    await textField(page).fill("");
    await urlField(page).press("Enter");

    await expect(editor.locator("a")).toHaveText("Keep");
    await expect(editor.locator("a")).toHaveAttribute("href", "https://keep.example.com");
  });

  test("should keep the marks of the replaced text", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("Bold");
    await editor.selectText();
    await page.keyboard.press("ControlOrMeta+b");
    await expect(editor.locator("strong")).toHaveText("Bold");

    await page.keyboard.press("ControlOrMeta+k");
    await expect(urlField(page)).toBeFocused();
    await page.keyboard.type("https://bold.example.com");
    await textField(page).fill("Bolder");
    await urlField(page).press("Enter");

    await expect(editor.locator("a")).toHaveText("Bolder");
    await expect(editor.locator("strong")).toHaveText("Bolder");
  });

  test("should not remove the link when Enter is pressed in the text field with an empty URL", async ({
    page,
  }) => {
    const editor = page.locator(".ProseMirror");
    await createLink(page, "Stay", "https://stay.example.com");

    await reopenOnLink(page);
    await urlField(page).fill("");
    await textField(page).press("Enter");

    await expect(urlField(page)).toBeFocused();
    await expect(editor.locator("a")).toHaveCount(1);
    await expect(editor.locator("a")).toHaveText("Stay");
  });

  test("should hide the text field when the selection spans several blocks", async ({ page }) => {
    const editor = page.locator(".ProseMirror");
    await editor.focus();
    await page.keyboard.type("One");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Two");
    await page.keyboard.press("ControlOrMeta+a");

    await page.keyboard.press("ControlOrMeta+k");

    await expect(urlField(page)).toBeFocused();
    await expect(textField(page)).toHaveCount(0);
  });
});
