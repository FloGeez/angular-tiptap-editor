import { test, expect, type Page } from "@playwright/test";

interface EditorHandle {
  commands: { setContent: (content: unknown) => boolean };
}

type DebugWindow = Window & {
  ng?: { getComponent: (element: Element) => { getEditor: () => EditorHandle | null } };
};

const LINK_HTML = '<p><a href="https://example.com">link</a></p>';

async function setLinkContent(page: Page) {
  await page.evaluate(html => {
    const host = document.querySelector("angular-tiptap-editor") as Element;
    (window as DebugWindow).ng!.getComponent(host).getEditor()!.commands.setContent(html);
  }, LINK_HTML);
}

async function resolveToken(page: Page, token: string) {
  return page.evaluate(name => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    document.querySelector("angular-tiptap-editor")!.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, token);
}

async function setHostToken(page: Page, token: string, value: string) {
  await page.evaluate(
    ({ name, color }) => {
      (document.querySelector("angular-tiptap-editor") as HTMLElement).style.setProperty(
        name,
        color
      );
    },
    { name: token, color: value }
  );
}

test.describe("Link color tokens (#97)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    await setLinkContent(page);
  });

  test("links use the primary colors by default", async ({ page }) => {
    const link = page.locator(".ProseMirror a.ate-link");
    await expect(link).toHaveCSS("color", await resolveToken(page, "--ate-primary"));
    await link.hover();
    await expect(link).toHaveCSS("color", await resolveToken(page, "--ate-primary-hover"));
  });

  test("--ate-link-color and --ate-link-hover-color override the link colors only", async ({
    page,
  }) => {
    await setHostToken(page, "--ate-link-color", "rgb(255, 0, 0)");
    await setHostToken(page, "--ate-link-hover-color", "rgb(0, 128, 0)");

    const link = page.locator(".ProseMirror a.ate-link");
    await expect(link).toHaveCSS("color", "rgb(255, 0, 0)");
    await link.hover();
    await expect(link).toHaveCSS("color", "rgb(0, 128, 0)");
  });

  test("changing --ate-primary still recolors links when the link tokens are not set", async ({
    page,
  }) => {
    await setHostToken(page, "--ate-primary", "rgb(10, 20, 30)");
    await expect(page.locator(".ProseMirror a.ate-link")).toHaveCSS("color", "rgb(10, 20, 30)");
  });
});
