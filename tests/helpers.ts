import { expect, type Page } from "@playwright/test";

type DebugWindow = Window & {
  ng?: { getComponent: (element: Element) => { clearContent: () => void } };
};

/** Empties the demo editor through its public API */
export async function clearEditor(page: Page) {
  await page.evaluate(() => {
    const host = document.querySelector("angular-tiptap-editor");
    const ng = (window as DebugWindow).ng;
    if (!ng || !host) {
      throw new Error("Angular debug API or editor host not available.");
    }
    ng.getComponent(host).clearContent();
  });
  await expect(page.locator(".ProseMirror")).toHaveText("");
}
