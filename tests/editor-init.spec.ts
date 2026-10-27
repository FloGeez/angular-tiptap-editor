import { test, expect, type Page } from "@playwright/test";

// The editor used to ignore technical config changes made in the 100 ms after it was created:
// the re-creation was gated by a flag set in a 100 ms setTimeout.

interface EditorHandle {
  isDestroyed: boolean;
  extensionManager: { extensions: { name: string }[] };
}

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => { getEditor: () => EditorHandle | null };
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
  __firstEditor?: EditorHandle;
};

const hasHeading = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector("angular-tiptap-editor") as Element;
    const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
    return editor.extensionManager.extensions.some(extension => extension.name === "heading");
  });

test.describe("Editor initialization", () => {
  test("applies a technical config change made right after the editor is created", async ({
    page,
  }) => {
    await page.goto("/");

    // Polls every animation frame, so the change lands well within the first 100 ms of the editor
    await page.waitForFunction(
      () => {
        const win = window as DebugWindow;
        const host = document.querySelector("angular-tiptap-editor");
        const editor = host && win.ng?.getComponent(host).getEditor();
        if (!host || !editor) {
          return false;
        }
        win.__firstEditor = editor;
        const app = win.ng!.getOwningComponent(host);
        const nextConfig = { ...app.editorConfig(), starterKitOptions: { heading: false } };
        app.editorConfig = () => nextConfig;
        win.ng!.applyChanges(app);
        return true;
      },
      undefined,
      { polling: "raf" }
    );

    await expect.poll(() => hasHeading(page)).toBe(false);
    const recreated = await page.evaluate(() => (window as DebugWindow).__firstEditor!.isDestroyed);
    expect(recreated).toBe(true);
    await expect(page.locator(".ProseMirror")).toBeVisible();
  });

  test("does not re-create the editor when the technical config is unchanged", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();

    await page.evaluate(() => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor") as Element;
      win.__firstEditor = win.ng!.getComponent(host).getEditor()!;
      const app = win.ng!.getOwningComponent(host);
      // A new config object with the same technical settings
      const nextConfig = { ...app.editorConfig() };
      app.editorConfig = () => nextConfig;
      win.ng!.applyChanges(app);
    });

    await page.waitForTimeout(200);
    const sameEditor = await page.evaluate(() => {
      const win = window as DebugWindow;
      const host = document.querySelector("angular-tiptap-editor") as Element;
      return win.ng!.getComponent(host).getEditor() === win.__firstEditor;
    });
    expect(sameEditor).toBe(true);
    expect(await hasHeading(page)).toBe(true);
  });
});
