import { expect, type Locator, type Page } from "@playwright/test";

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

/**
 * A tippy menu (bubble menus, font dropdowns, column menus) counts as closed as soon as tippy starts
 * hiding it. Its fade-out ends on animation frames, which headless WebKit runs late: waiting for the
 * menu to leave the page made the tests flaky. An element outside tippy must simply not be visible.
 */
export async function expectMenuClosed(menu: Locator) {
  await expect
    .poll(() =>
      menu.evaluateAll(elements =>
        elements.every(element => {
          const box = element.closest(".tippy-box");
          return box ? box.getAttribute("data-state") !== "visible" : !element.checkVisibility();
        })
      )
    )
    .toBe(true);
}
