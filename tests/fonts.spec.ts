import { test, expect, type Page } from "@playwright/test";

interface EditorHandle {
  commands: {
    setContent: (html: string) => boolean;
    setTextSelection: (range: { from: number; to: number }) => boolean;
    focus: () => boolean;
  };
  view: { pasteHTML: (html: string) => boolean };
}

type DebugWindow = Window & {
  ng?: {
    getComponent: (element: Element) => {
      getEditor: () => EditorHandle | null;
      registeredId: () => string | null;
      editorRegistry: { get: (id?: string) => { getContent: (format: "markdown") => string } };
    };
    getOwningComponent: (element: Element) => { editorConfig: () => Record<string, unknown> };
    applyChanges: (component: unknown) => void;
  };
};

test.use({ locale: "en-US" });

const WHEEL = "ate-toolbar .ate-font-wheel";
const FAMILY = "ate-toolbar .ate-font-family button";
const MENU = ".ate-font-menu";

/** Turns the font menus on in the toolbar and the bubble menu, through the demo's config panel */
async function enableFontMenus(page: Page) {
  await page.evaluate(() => {
    const win = window as DebugWindow & {
      ng: { getComponent: (e: Element) => Record<string, (key: string) => void> };
    };
    const panel = win.ng.getComponent(document.querySelector("app-configuration-panel")!);
    for (const key of ["fontFamily", "fontSize"]) {
      panel["toggleToolbarItem"](key);
      panel["toggleBubbleMenuItem"](key);
    }
    (window as DebugWindow).ng!.applyChanges(panel);
  });
  await expect(page.locator(WHEEL)).toBeVisible();
}

const editorCall = (page: Page, fn: string) =>
  page.evaluate(source => {
    const host = document.querySelector("angular-tiptap-editor")!;
    const editor = (window as DebugWindow).ng!.getComponent(host).getEditor()!;
    return new Function("editor", `return (${source})(editor)`)(editor);
  }, fn);

/** Replaces the content with "Hello world" and selects "Hello" */
async function selectHello(page: Page) {
  await editorCall(
    page,
    `editor => editor.commands.setContent("<p>Hello world</p>") &&
      editor.commands.setTextSelection({ from: 1, to: 6 }) && editor.commands.focus()`
  );
}

/** Inline style of the selected word */
const helloStyle = (page: Page) =>
  page.evaluate(
    () => document.querySelector(".ProseMirror p span")?.getAttribute("style") ?? "none"
  );

async function wheelZone(page: Page, zone: "prev" | "middle" | "next") {
  const box = (await page.locator(WHEEL).boundingBox())!;
  const x = { prev: box.x + 6, middle: box.x + box.width / 2, next: box.x + box.width - 6 }[zone];
  return { x, y: box.y + box.height / 2 };
}

test.describe("Font menus", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    await enableFontMenus(page);
    await selectHello(page);
  });

  test("the size wheel shows - and + at rest and its neighbours on hover", async ({ page }) => {
    const wheel = page.locator(WHEEL);
    await page.mouse.move(5, 5);
    await expect(wheel).toHaveClass(/is-folded/);
    await expect(wheel.locator(".ate-font-wheel-item.is-current")).toHaveText("16");

    const middle = await wheelZone(page, "middle");
    await page.mouse.move(middle.x, middle.y);
    await expect(wheel).not.toHaveClass(/is-folded/);
  });

  test("a click on a neighbour steps the size by one pixel", async ({ page }) => {
    const next = await wheelZone(page, "next");
    await page.mouse.click(next.x, next.y);
    await expect.poll(() => helloStyle(page)).toContain("font-size: 17px");

    const prev = await wheelZone(page, "prev");
    await page.mouse.click(prev.x, prev.y);
    await page.mouse.click(prev.x, prev.y);
    await expect.poll(() => helloStyle(page)).toContain("font-size: 15px");
    await expect(page.locator(MENU)).toBeHidden();
  });

  test("holding a neighbour repeats the step", async ({ page }) => {
    const next = await wheelZone(page, "next");
    await page.mouse.move(next.x, next.y);
    await page.mouse.down();
    await page.waitForTimeout(800);
    await page.mouse.up();
    const size = parseFloat((await helloStyle(page)).match(/font-size: ([\d.]+)px/)![1]);
    expect(size).toBeGreaterThanOrEqual(19);
  });

  test("dragging the wheel scrolls through the sizes", async ({ page }) => {
    const middle = await wheelZone(page, "middle");
    await page.mouse.move(middle.x, middle.y);
    await page.mouse.down();
    for (let step = 1; step <= 10; step++) {
      await page.mouse.move(middle.x - step * 5, middle.y);
    }
    await page.mouse.up();
    await expect.poll(() => helloStyle(page)).toContain("font-size: 18px");
    await expect(page.locator(MENU)).toBeHidden();
  });

  test("arrow keys on the wheel and Mod+Shift+. / , step the size", async ({ page }) => {
    await page.locator(WHEEL).focus();
    await page.keyboard.press("ArrowUp");
    await expect.poll(() => helloStyle(page)).toContain("font-size: 17px");

    await editorCall(page, "editor => editor.commands.focus()");
    await page.keyboard.press("ControlOrMeta+Shift+Period");
    await expect.poll(() => helloStyle(page)).toContain("font-size: 18px");
    await page.keyboard.press("ControlOrMeta+Shift+Comma");
    await page.keyboard.press("ControlOrMeta+Shift+Comma");
    await expect.poll(() => helloStyle(page)).toContain("font-size: 16px");
  });

  test("the size dropdown applies presets, a typed size and the default", async ({ page }) => {
    const middle = await wheelZone(page, "middle");
    await page.mouse.click(middle.x, middle.y);
    const menu = page.locator(MENU);
    await expect(menu).toBeVisible();

    // Like a color swatch, a preset applies and keeps the dropdown open
    await menu.locator(".ate-font-grid .ate-button", { hasText: /^\s*24\s*$/ }).click();
    await expect.poll(() => helloStyle(page)).toContain("font-size: 24px");
    await expect(menu).toBeVisible();
    await expect(menu.locator(".ate-font-grid .ate-button.is-active")).toHaveText("24");

    await menu.locator(".ate-font-default .ate-button").click();
    await expect.poll(() => helloStyle(page)).not.toContain("font-size");
    await expect(menu).toBeVisible();

    await menu.locator(".ate-font-input").fill("40");
    await page.keyboard.press("Enter");
    await expect.poll(() => helloStyle(page)).toContain("font-size: 40px");
    await expect(menu).toBeHidden();
  });

  test("the font family dropdown applies a font and the default", async ({ page }) => {
    await page.locator(FAMILY).click();
    const menu = page.locator(MENU);
    await expect(menu).toBeVisible();

    await menu.locator(".ate-font-grid .ate-button", { hasText: "Georgia" }).click();
    await expect.poll(() => helloStyle(page)).toContain("font-family: Georgia, serif");
    await expect(menu).toBeVisible();
    // The button draws "Aa" in the font and names it in its label
    await expect(page.locator(FAMILY)).toHaveAttribute("aria-label", "Font · Georgia");

    await menu.locator(".ate-font-grid .ate-button", { hasText: "Default" }).click();
    await expect.poll(() => helloStyle(page)).toBe("none");

    await page.mouse.click(5, 5);
    await expect(menu).toBeHidden();
  });

  test("a font missing from the list shows as an extra, current choice", async ({ page }) => {
    await editorCall(page, `editor => editor.chain().setFontFamily("Calibri, sans-serif").run()`);
    await page.locator(FAMILY).click();
    await expect(
      page.locator(`${MENU} .ate-font-grid .ate-button.is-active`, { hasText: "Calibri" })
    ).toBeVisible();
  });

  test("opened from the bubble menu, the dropdown replaces it", async ({ page }) => {
    const bubbleFamily = page.locator(".tippy-box .ate-font-family button");
    await page.mouse.move(5, 400);
    await page.locator(".ProseMirror p").first().dblclick();
    await expect(bubbleFamily).toBeVisible();

    // With a single paragraph at the top, the bubble menu sits above the viewport: click it directly
    await bubbleFamily.dispatchEvent("click");
    await expect(page.locator(MENU)).toBeVisible();
    await expect(bubbleFamily).toBeHidden();
  });

  test("the font family and size apply to the text typed next", async ({ page }) => {
    await editorCall(
      page,
      `editor => editor.commands.setContent("<p>Hello</p>") &&
        editor.commands.setTextSelection({ from: 6, to: 6 }) && editor.commands.focus()`
    );
    const next = await wheelZone(page, "next");
    await page.mouse.click(next.x, next.y);
    // The click gives the focus back to the editor, cursor in place
    await page.keyboard.type(" big");
    await expect(page.locator(".ProseMirror p span")).toHaveText(" big");
    await expect.poll(() => helloStyle(page)).toContain("font-size: 17px");
  });
});

test.describe("Fonts in pasted content and Markdown", () => {
  const PASTED = `<p><span style="font-family: 'Comic Sans MS'; font-size: 20px">Pasted</span> text</p>`;

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".ate-editor")).toBeVisible();
    await editorCall(page, `editor => editor.commands.setContent("<p></p>")`);
  });

  const pasteHtml = (page: Page, html: string) =>
    editorCall(
      page,
      `editor => editor.commands.focus() && editor.view.pasteHTML(${JSON.stringify(html)})`
    );

  const setPasteConfig = (page: Page, paste: Record<string, unknown>) =>
    page.evaluate(values => {
      const win = window as DebugWindow;
      const app = win.ng!.getOwningComponent(document.querySelector("angular-tiptap-editor")!);
      const current = app.editorConfig();
      const config = { ...current, paste: { ...(current["paste"] as object), ...values } };
      app.editorConfig = () => config;
      win.ng!.applyChanges(app);
    }, paste);

  test("keeps the fonts and sizes of other apps by default", async ({ page }) => {
    await pasteHtml(page, PASTED);
    const span = page.locator(".ProseMirror p span");
    await expect(span).toHaveText("Pasted");
    await expect(span).toHaveAttribute("style", /font-family: "Comic Sans MS"/);
    await expect(span).toHaveAttribute("style", /font-size: 20px/);
  });

  test("fontFamilies and fontSizes: false drop them", async ({ page }) => {
    await setPasteConfig(page, { fontFamilies: false, fontSizes: false });
    await pasteHtml(page, PASTED);
    await expect(page.locator(".ProseMirror p")).toHaveText("Pasted text");
    await expect(page.locator(".ProseMirror p span")).toHaveCount(0);
  });

  test("the Markdown export keeps fonts and sizes as HTML", async ({ page }) => {
    await editorCall(
      page,
      `editor => editor.commands.setContent('<p><span style="font-family: Georgia, serif; font-size: 24px">Big</span> serif</p>')`
    );
    const markdown = await page.evaluate(() => {
      const host = document.querySelector("angular-tiptap-editor")!;
      const component = (window as DebugWindow).ng!.getComponent(host);
      return component.editorRegistry
        .get(component.registeredId() ?? undefined)
        .getContent("markdown");
    });
    expect(markdown).toContain("font-family: Georgia, serif");
    expect(markdown).toContain("font-size: 24px");
  });
});
