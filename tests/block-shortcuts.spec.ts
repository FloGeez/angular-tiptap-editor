import { test, expect, Page } from "@playwright/test";

const normalize = (text: string) => text.replace(/[\u00a0\u200b]/g, " ").trim();

const paragraphTexts = async (page: Page) =>
  (await page.locator(".ProseMirror > p").allInnerTexts())
    .map(normalize)
    .filter(text => text !== "");

const expectParagraphs = (page: Page, expected: string[]) =>
  expect.poll(() => paragraphTexts(page)).toEqual(expected);

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => {
      getEditor: () => {
        state: { selection: { $from: { parent: { textContent: string } } } };
      } | null;
    };
  };
};

// Reads the editor's selection, not the DOM one: ProseMirror only syncs it on the async
// `selectionchange` event, so a shortcut pressed as soon as the DOM caret moved could still
// act on the previous block
const caretBlockText = (page: Page) =>
  page.evaluate(() => {
    const host = document.querySelector("angular-tiptap-editor")!;
    const editor = (window as DebugWindow).ng!.getComponent(host).getEditor();
    const text = editor?.state.selection.$from.parent.textContent ?? "";
    return text.replace(/[\u00a0\u200b]/g, " ").trim();
  });

const expectCaretIn = (page: Page, text: string) =>
  expect.poll(() => caretBlockText(page)).toBe(text);

async function typeBlocks(page: Page, lines: string[]) {
  for (const [index, line] of lines.entries()) {
    if (index > 0) {
      await page.keyboard.press("Enter");
    }
    await page.keyboard.type(line);
    await expectCaretIn(page, line);
  }
}

async function openConfigPanel(page: Page) {
  const sidebar = page.getByTestId("sidebar-config");
  if (!(await sidebar.isVisible())) {
    await page.getByTestId("open-config-button").click();
  }
  await expect(sidebar).toBeVisible();
}

test.describe("Block shortcuts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();

    const editorBtn = page.getByTestId("mode-editor");
    const text = await editorBtn.innerText();
    if (text.toLowerCase().includes("éditeur")) {
      await page.getByTestId("lang-switch").click();
      await expect(editorBtn).toHaveText(/editor/i);
    }

    await page.getByTestId("clear-button").click();
    await expect(page.locator(".ProseMirror")).toHaveText("");
    await page.locator(".ProseMirror").click();
  });

  test("should duplicate the current paragraph with Mod+D", async ({ page }) => {
    await typeBlocks(page, ["alpha", "beta"]);
    await page.keyboard.press("ArrowUp");
    await expectCaretIn(page, "alpha");

    await page.keyboard.press("ControlOrMeta+d");

    await expectParagraphs(page, ["alpha", "alpha", "beta"]);
  });

  test("should duplicate a heading as a heading", async ({ page }) => {
    await page.keyboard.type("## Title");
    await expect(page.locator(".ProseMirror h2")).toHaveText("Title");

    await page.keyboard.press("ControlOrMeta+d");

    await expect(page.locator(".ProseMirror h2")).toHaveText(["Title", "Title"]);
  });

  test("should duplicate a single list item instead of the whole list", async ({ page }) => {
    await page.keyboard.type("- one");
    await expect(page.locator(".ProseMirror ul > li")).toHaveText(["one"]);
    await page.keyboard.press("Enter");
    await page.keyboard.type("two");
    await expect(page.locator(".ProseMirror ul > li")).toHaveText(["one", "two"]);

    await page.keyboard.press("ControlOrMeta+d");

    await expect(page.locator(".ProseMirror ul")).toHaveCount(1);
    await expect(page.locator(".ProseMirror ul > li")).toHaveText(["one", "two", "two"]);
  });

  test("should move a paragraph up with Mod+Shift+ArrowUp", async ({ page }) => {
    await typeBlocks(page, ["one", "two", "three"]);

    await page.keyboard.press("ControlOrMeta+Shift+ArrowUp");

    await expectParagraphs(page, ["one", "three", "two"]);
    await page.keyboard.type("!");
    await expectParagraphs(page, ["one", "three!", "two"]);
  });

  test("should move a paragraph down with Mod+Shift+ArrowDown", async ({ page }) => {
    await typeBlocks(page, ["one", "two", "three"]);
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("ArrowUp");
    await expectCaretIn(page, "one");

    await page.keyboard.press("ControlOrMeta+Shift+ArrowDown");

    await expectParagraphs(page, ["two", "one", "three"]);
    await page.keyboard.type("!");
    await expectParagraphs(page, ["two", "one!", "three"]);
  });

  test("should move a list item within its list and never out of it", async ({ page }) => {
    await typeBlocks(page, ["intro"]);
    await page.keyboard.press("Enter");
    await page.keyboard.type("- a");
    await expect(page.locator(".ProseMirror ul > li")).toHaveText(["a"]);
    await page.keyboard.press("Enter");
    await page.keyboard.type("b");
    await page.keyboard.press("Enter");
    await page.keyboard.type("c");
    await expect(page.locator(".ProseMirror ul > li")).toHaveText(["a", "b", "c"]);

    await page.keyboard.press("ControlOrMeta+Shift+ArrowUp");
    await expect(page.locator(".ProseMirror ul > li")).toHaveText(["a", "c", "b"]);
    await page.keyboard.press("ControlOrMeta+Shift+ArrowUp");
    await expect(page.locator(".ProseMirror ul > li")).toHaveText(["c", "a", "b"]);
    await page.keyboard.press("ControlOrMeta+Shift+ArrowDown");
    await expect(page.locator(".ProseMirror ul > li")).toHaveText(["a", "c", "b"]);
    await page.keyboard.press("ControlOrMeta+Shift+ArrowDown");
    await expect(page.locator(".ProseMirror ul > li")).toHaveText(["a", "b", "c"]);

    await page.keyboard.press("ControlOrMeta+Shift+ArrowDown");

    await expect(page.locator(".ProseMirror ul > li")).toHaveText(["a", "b", "c"]);
    await expectParagraphs(page, ["intro"]);
  });

  test("should do nothing at the edges of the document", async ({ page }) => {
    await typeBlocks(page, ["first", "last"]);

    await page.keyboard.press("ControlOrMeta+Shift+ArrowDown");
    await expectParagraphs(page, ["first", "last"]);

    await page.keyboard.press("ArrowUp");
    await expectCaretIn(page, "first");
    await page.keyboard.press("ControlOrMeta+Shift+ArrowUp");
    await expectParagraphs(page, ["first", "last"]);
  });

  test("should be disabled by the enableBlockShortcuts flag", async ({ page }) => {
    await openConfigPanel(page);
    await page.getByTestId("block-shortcuts-config").locator(".app-toggle").click();

    const editor = page.locator(".ProseMirror");
    await editor.click();
    await typeBlocks(page, ["one", "two"]);

    await page.keyboard.press("ControlOrMeta+Shift+ArrowUp");
    await page.keyboard.press("ControlOrMeta+d");

    await expectParagraphs(page, ["one", "two"]);
  });

  test("should do nothing in a read-only editor", async ({ page }) => {
    await typeBlocks(page, ["one", "two"]);
    await openConfigPanel(page);
    await page.getByTestId("editable-config").locator(".app-toggle").first().click();

    const editor = page.locator(".ProseMirror");
    await expect(editor).toHaveAttribute("contenteditable", "false");
    await editor.focus();
    await page.keyboard.press("ControlOrMeta+d");
    await page.keyboard.press("ControlOrMeta+Shift+ArrowUp");

    await expectParagraphs(page, ["one", "two"]);
  });
});
