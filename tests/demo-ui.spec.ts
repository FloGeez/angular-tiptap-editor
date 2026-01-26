import { test, expect } from "@playwright/test";

test.describe("Demo UI Controls", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();

    // Force English language
    const langBtn = page.getByTestId("lang-switch");
    const editorBtn = page.getByTestId("mode-editor");
    const text = await editorBtn.innerText();
    if (text.toLowerCase().includes("éditeur")) {
      await langBtn.click();
      await expect(editorBtn).toHaveText(/editor/i);
    }
  });

  test("should toggle code mode", async ({ page }) => {
    const codeBtn = page.getByTestId("mode-code");
    await codeBtn.click();
    await expect(page.locator(".code-view")).toBeVisible();

    const editorBtn = page.getByTestId("mode-editor");
    await editorBtn.click();
    await expect(page.locator(".ProseMirror")).toBeVisible();
  });

  test("should toggle configuration panel", async ({ page }) => {
    const sidebar = page.getByTestId("sidebar-config");
    const closeBtn = sidebar.getByTestId("panel-close-button");

    if ((await sidebar.isVisible()) && !(await sidebar.getAttribute("class"))?.includes("hidden")) {
      await closeBtn.click();
    }

    const openBtn = page.getByTestId("open-config-button");
    await openBtn.click();
    await expect(sidebar).toBeVisible();
    await expect(sidebar).not.toHaveClass(/hidden/);

    await closeBtn.click();
    await expect(sidebar).toHaveClass(/hidden/);
  });

  test("should toggle theme customizer panel", async ({ page }) => {
    const sidebar = page.getByTestId("sidebar-theme");
    const openBtn = page.getByTestId("open-theme-button");
    await openBtn.click();

    await expect(sidebar).toBeVisible();
    await sidebar.getByTestId("panel-close-button").click();
    await expect(sidebar).toHaveClass(/hidden/);
  });

  test("should switch theme", async ({ page }) => {
    const app = page.getByTestId("app-root");
    const themeSwitcher = page.getByTestId("theme-switch");

    const isInitiallyDark = await app.evaluate(el => el.classList.contains("dark"));
    await themeSwitcher.click();

    if (isInitiallyDark) {
      await expect(app).not.toHaveClass(/dark/);
    } else {
      await expect(app).toHaveClass(/dark/);
    }

    await themeSwitcher.click();
    if (isInitiallyDark) {
      await expect(app).toHaveClass(/dark/);
    } else {
      await expect(app).not.toHaveClass(/dark/);
    }
  });

  test("should switch language", async ({ page }) => {
    const langSwitcher = page.getByTestId("lang-switch");
    const editorBtn = page.getByTestId("mode-editor");

    const initialText = await editorBtn.innerText();
    await langSwitcher.click();

    await expect(editorBtn).not.toHaveText(initialText);
    const newText = await editorBtn.innerText();
    expect(newText.toLowerCase()).toContain(
      initialText.toLowerCase().includes("editor") ? "éditeur" : "editor"
    );
  });
});
