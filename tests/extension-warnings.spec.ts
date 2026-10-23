import { test, expect, Page } from "@playwright/test";

const collectWarnings = (page: Page) => {
  const warnings: string[] = [];
  page.on("console", msg => {
    if (msg.type() === "warning") warnings.push(msg.text());
  });
  return warnings;
};

test.describe("Custom extension name collisions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();

    const editorBtn = page.getByTestId("mode-editor");
    const text = await editorBtn.innerText();
    if (text.toLowerCase().includes("éditeur")) {
      await page.getByTestId("lang-switch").click();
      await expect(editorBtn).toHaveText(/editor/i);
    }

    await page.getByTestId("open-config-button").click();
    await expect(page.getByTestId("sidebar-config")).not.toHaveClass(/hidden/);
  });

  test("warns when a custom extension reuses the name of a built-in extension", async ({
    page,
  }) => {
    const warnings = collectWarnings(page);

    await page.getByTestId("extension-card-duplicate-name").click();

    await expect
      .poll(() => warnings.filter(w => w.includes("[ATE]") && w.includes("highlight")))
      .toHaveLength(1);
    expect(warnings.find(w => w.includes("highlight"))).toContain("tiptapExtensions");
  });

  test("does not warn for a custom extension with a unique name", async ({ page }) => {
    const warnings = collectWarnings(page);
    const editor = page.locator(".ProseMirror");
    await editor.evaluate(el => el.setAttribute("data-marker", "before"));

    await page.getByTestId("extension-card-task").click();

    await expect(page.locator(".ProseMirror:not([data-marker])")).toBeVisible();
    expect(warnings.filter(w => w.includes("[ATE]"))).toEqual([]);
  });
});
