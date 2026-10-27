import { test, expect, type Page } from "@playwright/test";

// Regression tests for #85: color values carrying extra CSS declarations must not reach inline styles.
// The validation comes from Tiptap (>= 3.31.4, `isValidCSSStyleValue`), the minimum version the library requires.

interface EditorHandle {
  getHTML: () => string;
  commands: {
    setContent: (content: unknown) => boolean;
    selectAll: () => boolean;
    setColor: (color: string) => boolean;
    setHighlight: (attributes: { color: string }) => boolean;
  };
}

type DebugWindow = Window & {
  ng?: { getComponent: (element: Element) => { getEditor: () => EditorHandle | null } };
};

const PAYLOAD = "red; position: fixed; inset: 0";

const editorHtml = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector("angular-tiptap-editor") as Element;
    return (window as DebugWindow).ng!.getComponent(host).getEditor()!.getHTML();
  });

async function expectNoInjectedStyle(page: Page) {
  const html = await editorHtml(page);
  expect(html).toContain(">x<");
  expect(html).not.toMatch(/position|inset/);
  await expect(page.locator(".ProseMirror [style*='position']")).toHaveCount(0);
}

test.describe("CSS injection through color values (#85)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
  });

  test("rejects a highlight color with extra declarations in HTML content", async ({ page }) => {
    await page.evaluate(payload => {
      const host = document.querySelector("angular-tiptap-editor") as Element;
      const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
      editor.commands.setContent(`<p><mark data-color="${payload}">x</mark></p>`);
    }, PAYLOAD);

    await expectNoInjectedStyle(page);
  });

  test("rejects highlight and text colors with extra declarations in JSON content", async ({
    page,
  }) => {
    await page.evaluate(payload => {
      const host = document.querySelector("angular-tiptap-editor") as Element;
      const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
      editor.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "x",
                marks: [
                  { type: "highlight", attrs: { color: payload } },
                  { type: "textStyle", attrs: { color: payload } },
                ],
              },
            ],
          },
        ],
      });
    }, PAYLOAD);

    await expectNoInjectedStyle(page);
  });

  test("rejects colors with extra declarations passed to setColor and setHighlight", async ({
    page,
  }) => {
    await page.evaluate(payload => {
      const host = document.querySelector("angular-tiptap-editor") as Element;
      const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
      editor.commands.setContent("<p>x</p>");
      editor.commands.selectAll();
      editor.commands.setColor(payload);
      editor.commands.setHighlight({ color: payload });
    }, PAYLOAD);

    await expectNoInjectedStyle(page);
  });
});
