import { test, expect } from "@playwright/test";

test.describe("Chassis auto-scoping (each chassis's chrome targets its own editor)", () => {
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
  });

  test("an editor-less toolbar inside chassis 1 stays on chassis 1's editor, even after chassis 2 gains focus", async ({
    page,
  }) => {
    await page.getByTestId("toggle-chassis-scoping-demo").click();

    const demo = page.getByTestId("chassis-scoping-demo");
    await expect(demo).toBeVisible();

    const editor1 = page.getByTestId("chassis-scoping-editor-1").locator(".ProseMirror");
    const editor2 = page.getByTestId("chassis-scoping-editor-2").locator(".ProseMirror");

    await editor1.click();
    await page.keyboard.press("Control+a");

    // Move focus (and thus AteEditorRegistry's "active editor") to chassis 2
    // BEFORE using chassis 1's toolbar — this is exactly the scenario that
    // used to make an editor-less toolbar silently control the wrong editor.
    await editor2.click();

    const toolbar1BoldBtn = page
      .getByTestId("chassis-scoping-editor-1")
      .getByRole("button", { name: /bold/i });
    await expect(toolbar1BoldBtn).toBeEnabled();
    await toolbar1BoldBtn.click();

    await expect(editor1.locator("strong")).toHaveCount(1);
    await expect(editor2.locator("strong")).toHaveCount(0);
  });
});
